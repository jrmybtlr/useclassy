import "react";

declare module "react" {
  interface HTMLAttributes<T extends HTMLElement> {
    [key: `class:${string}`]:
      | string
      | undefined
      | null
      | false
      | number;
    [key: `className:${string}`]:
      | string
      | undefined
      | null
      | false
      | number;
  }
}
