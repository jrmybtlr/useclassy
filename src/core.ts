import crypto from "crypto";
import { hashFunction } from "./utils";

// Supported file extensions
export const SUPPORTED_FILES = [".vue", ".ts", ".tsx", ".js", ".jsx", ".html"];

// Base constants for class transformations
export const CLASS_REGEX = /class="([^"]*)"(?![^>]*:class)/g;
export const CLASS_MODIFIER_REGEX = /class:([\w-:]+)="([^"]*)"/g;
export const MULTIPLE_CLASS_REGEX = /class="[^"]*"(\s*class="[^"]*")*/g;

// React-specific constants
export const REACT_CLASS_REGEX = /className="([^"]*)"(?![^>]*:className)/g;
export const REACT_CLASS_MODIFIER_REGEX = /className:([\w-:]+)="([^"]*)"/g;
export const REACT_MULTIPLE_CLASS_REGEX =
  /className="[^"]*"(\s*className="[^"]*")*/g;

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
  // Extract regular classes
  let classMatch;
  while ((classMatch = classRegex.exec(code)) !== null) {
    const classes = classMatch[1];
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

          // Add individual modifier parts for better coverage
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

    return `${classAttrName}="${modifiedClassesArr.join(" ")}"`;
  });
}

/**
 * Merges multiple class attributes into a single one
 */
export function mergeClassAttributes(code: string, attrName: string): string {
  const multipleClassRegex = new RegExp(
    `${attrName}="[^"]*"(\\s*${attrName}="[^"]*")*`,
    "g"
  );

  return code.replace(multipleClassRegex, (match) => {
    const allClasses =
      match
        .match(new RegExp(`${attrName}="([^"]*)"`, "g"))
        ?.map((cls) => {
          const subMatch = cls.match(new RegExp(`${attrName}="([^"]*)"`));
          return subMatch ? subMatch[1] : "";
        })
        .filter(Boolean)
        .join(" ") || "";

    return `${attrName}="${allClasses}"`;
  });
}
