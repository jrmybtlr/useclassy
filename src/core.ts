import crypto from "crypto";
import { hashFunction } from "./utils";

// Supported file extensions
export const SUPPORTED_FILES = [".vue", ".ts", ".tsx", ".js", ".jsx", ".html"];

// Base constants for class transformations
export const CLASS_REGEX = /class="([^"]*)"(?![^>]*:class)/g;
export const CLASS_MODIFIER_REGEX = /class:([\w-:]+)="([^"]*)"/g;
export const MULTIPLE_CLASS_REGEX = /class="[^"]*"(\s*class="[^"]*")*/g;

// React-specific constants
export const REACT_CLASS_REGEX =
  /className=(?:"([^"]*)"|{([^}]*)})(?![^>]*?:)/g;
export const REACT_CLASS_MODIFIER_REGEX =
  /(?:className|class):([\w-:]+)="([^"]*)"/g;
export const REACT_MULTIPLE_CLASS_REGEX =
  /(?:className|class)=(?:"[^"]*"|{[^}]*})(?:\s*(?:className|class)=(?:"[^"]*"|{[^}]*}))*|(?:className|class)="[^"]*"(?:\s*(?:className|class)="[^"]*")*/g;

/**
 * Generates a hash string from the input string
 */
export function hashString(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex").substring(0, 8);
}

/**
 * Generates a cache key for a file
 */
export function generateCacheKey(id: string, code: string): string {
  return hashFunction(id + code).toString();
}

/**
 * Extracts classes from the code
 */
export function extractClasses(
  code: string,
  generatedClassesSet: Set<string>,
  classRegex: RegExp,
  classModifierRegex: RegExp
): void {
  let classMatch;
  while ((classMatch = classRegex.exec(code)) !== null) {
    const classes = classMatch[1] || classMatch[2];
    if (classes) {
      classes.split(" ").forEach((cls) => {
        if (cls.trim()) {
          generatedClassesSet.add(cls.trim());
        }
      });
    }
  }

  // Extract class modifiers
  let modifierMatch;
  while ((modifierMatch = classModifierRegex.exec(code)) !== null) {
    const modifiers = modifierMatch[1];
    const classes = modifierMatch[2];

    if (modifiers && classes) {
      const modifierParts = modifiers.split(":");

      classes.split(" ").forEach((cls) => {
        if (cls.trim()) {
          // Add the full modifier:class combination
          generatedClassesSet.add(`${modifiers}:${cls.trim()}`);

          if (modifierParts.length > 1) {
            modifierParts.forEach((part) => {
              if (part) generatedClassesSet.add(`${part}:${cls.trim()}`);
            });
          }
        }
      });
    }
  }
}

/**
 * Transforms class modifiers in the code
 */
export function transformClassModifiers(
  code: string,
  generatedClassesSet: Set<string>,
  classModifierRegex: RegExp,
  classAttrName: string
): string {
  return code.replace(classModifierRegex, (match, modifiers, classes) => {
    if (!modifiers || modifiers.trim() === "") return match;

    const modifierParts = modifiers.split(":");

    // Process each modifier part
    const modifiedClassesArr = classes
      .split(" ")
      .map((value: string) => value.trim())
      .filter((value: string) => value && value !== "")
      .flatMap((value: string) => {
        // Create an array with the full modifier:class combination
        const result = [`${modifiers}:${value}`];

        // Also add individual modifier parts for better coverage
        if (modifierParts.length > 1) {
          modifierParts.forEach((part: string) => {
            if (part) {
              result.push(`${part}:${value}`);
            }
          });
        }

        return result;
      });

    // Add all modified classes to the set
    modifiedClassesArr.forEach((cls: string) => {
      if (
        cls &&
        !cls.endsWith(":") &&
        !cls.startsWith("'") &&
        !cls.endsWith("'")
      ) {
        generatedClassesSet.add(cls);
      }
    });

    // For React components, always use className as the attribute name
    // regardless of whether the original was class: or className:
    const finalAttrName =
      classAttrName === "className" ? "className" : classAttrName;
    return `${finalAttrName}="${modifiedClassesArr.join(" ")}"`;
  });
}

/**
 * Merges multiple class attributes into a single one
 */
export function mergeClassAttributes(code: string, attrName: string): string {
  const multipleClassRegex = new RegExp(
    `(?:${attrName}|class)=(?:"[^"]*"|{[^}]*})(?:\\s*(?:${attrName}|class)=(?:"[^"]*"|{[^}]*}))*`,
    "g"
  );

  return code.replace(multipleClassRegex, (match) => {
    const allClasses: string[] = [];

    const quotedMatches = match.match(
      new RegExp(`(?:${attrName}|class)="([^"]*)"`, "g")
    );
    if (quotedMatches) {
      quotedMatches.forEach((quoted) => {
        const subMatch = quoted.match(
          new RegExp(`(?:${attrName}|class)="([^"]*)"`)
        );
        if (subMatch && subMatch[1] && subMatch[1].trim()) {
          allClasses.push(subMatch[1].trim());
        }
      });
    }

    const jsxMatches = match.match(
      new RegExp(`(?:${attrName}|class)={([^}]*)}`, "g")
    );

    if (jsxMatches) {
      jsxMatches.forEach((jsx) => {
        const templateMatch = jsx.match(/(?:className|class)={`([^`]*)`}/);
        if (templateMatch?.[1]?.trim()) {
          allClasses.push(templateMatch[1].trim());
          return;
        }

        const exprMatch = jsx.match(/(?:className|class)={(.*)}/);
        const expr = exprMatch?.[1]?.trim();
        if (!expr) return;

        if (allClasses.length === 0) return `${attrName}={${expr}}`;

        return expr.includes("twMerge")
          ? `${attrName}={${expr.replace(
              /twMerge\(["']([^"']*)["']\)/,
              `twMerge("$1 ${allClasses.join(" ")}")`
            )}}`
          : `${attrName}={\`${expr} ${allClasses.join(" ")}\`}`;
      });
    }

    const finalAttrName = attrName === "className" ? "className" : attrName;

    if (allClasses.length > 0 && !jsxMatches) {
      return `${finalAttrName}="${allClasses.join(" ")}"`;
    }

    // If we couldn't process it properly, return the original
    return match;
  });
}
