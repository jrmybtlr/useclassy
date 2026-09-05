/**
 * Workspace mirror of the JSX augmentation shipped by
 * `vite-plugin-useclassy/react`. App consumers should prefer:
 *
 *   import 'vite-plugin-useclassy/react'
 *   // or: /// <reference types="vite-plugin-useclassy/react" />
 */
import 'react'

type ClassyAttrValue = string | number | boolean | null | undefined

declare module 'react' {
  // `T` is required to merge with React's generic HTML/SVG attribute interfaces.
  /* eslint-disable @typescript-eslint/no-unused-vars */
  interface HTMLAttributes<T> {
    [key: `class:${string}`]: ClassyAttrValue
    [key: `className:${string}`]: ClassyAttrValue
  }

  interface SVGAttributes<T> {
    [key: `class:${string}`]: ClassyAttrValue
    [key: `className:${string}`]: ClassyAttrValue
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

export {}
