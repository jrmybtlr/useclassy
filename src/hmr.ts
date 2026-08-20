import type { ModuleNode } from 'vite'

import type { ViteServer } from './types'

const STYLESHEET_RE = /\.css(?:$|\?|#)/i
const CSS_MODULE_RE = /\.module\.css(?:$|\?|#)/i

/**
 * Tailwind root stylesheets and UnoCSS virtual CSS entries.
 * Matches `.css` as a file extension, not a path substring, and skips CSS
 * modules / `node_modules` so a manifest write does not invalidate every sheet.
 */
export function isCssEngineModuleId(id: string): boolean {
  if (!id)
    return false

  if (id.includes('virtual:uno'))
    return true
  if (id.includes('/__uno.css') || id.endsWith('__uno.css'))
    return true
  // Vite null-byte virtual ids (no `.css` suffix). Do not match
  // `node_modules/unocss/...` filesystem paths.
  if (id.startsWith('\0') && (id.includes('unocss') || id.includes('__uno')))
    return true

  if (id.includes('node_modules') || CSS_MODULE_RE.test(id))
    return false

  return STYLESHEET_RE.test(id)
}

export type InvalidateCssEngineModulesOptions = {
  server: ViteServer
  isBuild: boolean
  debug?: boolean
}

/**
 * Recompile CSS engines after the class manifest changes.
 * Avoid FS `change` on the `.html` manifest — Vite would full-reload.
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
 * `handleHotUpdate` helper: invalidate CSS modules and return them so Vite
 * skips a full reload for the manifest `.html`.
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
