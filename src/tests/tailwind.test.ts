import path from "path";
import { describe, expect, it } from "vitest";

import {
  USECLASSY_DEFAULT_OUTPUT_DIR,
  USECLASSY_DEFAULT_OUTPUT_FILE,
  getUseClassyManifestPath,
  getUseClassyTailwindSourceDirective,
  getUseClassyTailwindSourceLineForRootStylesheet,
  getUseClassyTailwindV3ContentEntry,
} from "../tailwind";

describe("tailwind path helpers", () => {
  it("exposes defaults matching the plugin", () => {
    expect(USECLASSY_DEFAULT_OUTPUT_DIR).toBe(".classy");
    expect(USECLASSY_DEFAULT_OUTPUT_FILE).toBe("output.classy.html");
  });

  it("getUseClassyManifestPath joins output dir and file", () => {
    expect(getUseClassyManifestPath()).toBe(".classy/output.classy.html");
    expect(
      getUseClassyManifestPath({
        outputDir: "custom",
        outputFileName: "out.html",
      }),
    ).toBe("custom/out.html");
  });

  it("getUseClassyTailwindV3ContentEntry prefixes ./", () => {
    expect(getUseClassyTailwindV3ContentEntry()).toBe("./.classy/output.classy.html");
  });

  it("getUseClassyTailwindSourceLineForRootStylesheet uses ./ manifest", () => {
    expect(getUseClassyTailwindSourceLineForRootStylesheet()).toBe(
      '@source "./.classy/output.classy.html";',
    );
  });

  it("getUseClassyTailwindSourceDirective is relative to the stylesheet", () => {
    const root = path.join(path.sep, "proj");
    const css = path.join(root, "src", "app.css");
    const line = getUseClassyTailwindSourceDirective(css, root);
    expect(line).toBe('@source "../.classy/output.classy.html";');
  });

  it("getUseClassyTailwindSourceDirective supports Nuxt app/ vite root", () => {
    const manifestRoot = path.join(path.sep, "proj");
    const css = path.join(manifestRoot, "app", "assets", "main.css");
    const line = getUseClassyTailwindSourceDirective(css, manifestRoot);
    expect(line).toBe('@source "../../.classy/output.classy.html";');
  });
});
