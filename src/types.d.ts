import type { ViteDevServer } from 'vite'

/** CSS engine UseClassy wires the class manifest into. */
export type ClassyEngine = 'tailwind' | 'unocss'

// Plugin-specific types
export interface ClassyOptions {
  /**
   * Framework language to use for class attribute
   * @default "vue"
   */
  language?: 'vue' | 'react' | 'blade' | 'svelte'

  /**
   * CSS engine that consumes the generated class manifest.
   * - `tailwind` (default): may inject `@source` into Tailwind CSS
   * - `unocss`: skips Tailwind inject. Place UseClassy before `unocss/vite`
   *   so the pipeline sees rewritten `hover:…` classes. Also register the
   *   manifest via `content.filesystem` (see `vite-plugin-useclassy/unocss`)
   *   as a backstop for files Uno does not extract from the pipeline.
   * @default "tailwind"
   */
  engine?: ClassyEngine

  /**
   * Directory to output the generated class file
   * @default ".classy"
   */
  outputDir?: string

  /**
   * Project root where the manifest directory is written.
   * Defaults to Vite's root. Set this when Vite's root is a subdirectory
   * (for example Nuxt `srcDir: "app/"`) so `.classy/` lives next to `package.json`.
   */
  manifestRoot?: string

  /**
   * Inject a Tailwind v4 `@source` directive into stylesheets that import Tailwind.
   * Ignored when `engine` is `"unocss"`.
   * @default true
   */
  injectTailwindSource?: boolean

  /**
   * Filename for the generated class file
   * @default "output.classy.html"
   */
  outputFileName?: string

  /**
   * Debug mode
   * @default false
   */
  debug?: boolean
}

/** Result of transforming a single file's source for class extraction */
export type ProcessCodeResult = {
  transformedCode: string
  fileSpecificClasses: Set<string>
}

export type ProcessCodeFn = (code: string) => ProcessCodeResult

export type ApplyFileClassesFn = (
  id: string,
  classes: Set<string>,
) => boolean

// Helper interface to represent Vite's dev server with the properties we need
export interface ViteServer extends ViteDevServer {
  watcher: {
    on: (event: string, callback: (filePath: string) => void) => void
    add: (file: string) => void
    emit: (event: string, ...args: unknown[]) => boolean
  }
  middlewares: {
    use: (path: string, handler: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => void) => void
  }
  httpServer: {
    once: (event: string, callback: () => void) => void
  } | null
  moduleGraph: ViteDevServer['moduleGraph']
  ws: ViteDevServer['ws']
}
