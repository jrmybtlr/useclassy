import type { ModuleNode } from 'vite'

import type { ViteServer } from './types'

/** Tailwind stylesheets and UnoCSS virtual CSS entries. */
export function isCssEngineModuleId(id: string): boolean {
  if (id.includes('.css'))
    return true
  // Uno virtual ids occasionally appear without a `.css` suffix in the graph.
  return /(?:^|[/\\])__uno\b|virtual:uno\b|unocss/i.test(id)
}

export type InvalidateCssEngineModulesOptions = {
  server: ViteServer
  isBuild: boolean
  debug?: boolean
}

/**
 * After the class manifest changes on disk, force CSS engine modules to
 * recompile so newly discovered variants appear during HMR.
 * Covers Tailwind (`*.css` + `@source`) and UnoCSS (`/__uno.css`,
 * `virtual:uno.css`). Avoid emitting a FS `change` for the `.html` manifest —
 * Vite treats that as a full page reload.
 */
export function invalidateCssEngineModules(
  options: InvalidateCssEngineModulesOptions,
): void {
  const { server, isBuild, debug } = options
  if (!server.moduleGraph || isBuild)
    return

  const updates: Array<{
    type: 'css-update'
    path: string
    acceptedPath: string
    timestamp: number
  }> = []
  const timestamp = Date.now()

  for (const [id, mod] of server.moduleGraph.idToModuleMap) {
    if (!id || !isCssEngineModuleId(id))
      continue

    server.moduleGraph.invalidateModule(mod)
    const url = mod.url || id
    updates.push({
      type: 'css-update',
      path: url,
      acceptedPath: url,
      timestamp,
    })
  }

  if (updates.length > 0) {
    server.ws.send({ type: 'update', updates })
    if (debug)
      console.log(`🎩 Invalidated ${updates.length} CSS module(s) after manifest write.`)
  }
}

/**
 * Invalidate CSS-engine modules for a Vite `handleHotUpdate` of the manifest.
 * Returns the modules so Vite skips a full-page reload for the `.html` file.
 */
export function invalidateCssEngineModulesForHotUpdate(
  server: ViteServer,
  timestamp: number,
): ModuleNode[] {
  const cssModules: ModuleNode[] = []
  for (const [id, mod] of server.moduleGraph.idToModuleMap) {
    if (!id || !isCssEngineModuleId(id))
      continue
    server.moduleGraph.invalidateModule(mod, undefined, timestamp, true)
    cssModules.push(mod)
  }
  return cssModules
}
