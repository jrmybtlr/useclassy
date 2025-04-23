import { HTMLAttributes, DetailedHTMLProps } from "react";

type VariantClassNames = {
  [key: `class${string}`]: string;
};

export type DivWithVariants = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & VariantClassNames;
