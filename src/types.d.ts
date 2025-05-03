import { HTMLAttributes, DetailedHTMLProps } from 'react'
import type { ViteDevServer } from 'vite'

type VariantClassNames = {
  [key: `class${string}`]: string
  [key: `className${string}`]: string
}

export type DivWithVariants = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> &
VariantClassNames

// Plugin-specific types
export interface ClassyOptions {
  /**
   * Framework language to use for class attribute
   * @default "vue"
   */
  language?: 'vue' | 'react'

  /**
   * Directory to output the generated class file
   * @default ".classy"
   */
  outputDir?: string

  /**
   * Filename for the generated class file
   * @default "output.classy.jsx"
   */
  outputFileName?: string

  /**
   * Files to watch for changes
   * @default [".vue", ".tsx", ".jsx", ".html"]
   */
  files?: string[]

  /**
   * Auto-inject imports for classy functions
   * @default false
   */
  autoImport?: boolean

  /**
   * Debug mode
   * @default false
   */
  debug?: boolean
}

// Helper interface to represent Vite's dev server with the properties we need
export interface ViteServer extends ViteDevServer {
  watcher: {
    on: (event: string, callback: (filePath: string) => void) => void
  }
  middlewares: {
    use: (path: string, handler: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => void) => void
  }
  httpServer: {
    once: (event: string, callback: () => void) => void
  } | null
}

// Type for React component props that can use class variants
export type ClassyProps<TProps = object> = TProps & {
  [key: `class:${string}`]: string
  [key: `className:${string}`]: string
  className?: string
}
