import "react";

declare module "react" {
  interface HTMLAttributes<T extends HTMLElement> {
    [key: `class:${string}`]: string;
  }
}
