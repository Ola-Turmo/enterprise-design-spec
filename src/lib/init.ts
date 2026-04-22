import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { access } from "node:fs/promises";

export type InitResult = {
  name: string;
  path: string;
  filesCreated: number;
};

export async function initBrandSystem(
  targetDir: string,
  name: string,
): Promise<InitResult> {
  let filesCreated = 0;

  // Create directory structure
  const dirs = [
    "tokens/core",
    "tokens/themes",
    "docs/assets/logos",
    "manifests/assets",
    "schemas",
  ];

  for (const dir of dirs) {
    const fullPath = path.join(targetDir, dir);
    try {
      await access(fullPath);
    } catch {
      await mkdir(fullPath, { recursive: true });
    }
  }

  // Create primitives.tokens.json
  const primitivesPath = path.join(targetDir, "tokens", "core", "primitives.tokens.json");
  try {
    await access(primitivesPath);
  } catch {
    await writeFile(
      primitivesPath,
      JSON.stringify(
        {
          color: {
            brand: {
              500: { $type: "color", $value: "#3B82F6" },
              600: { $type: "color", $value: "#175CD3" },
              700: { $type: "color", $value: "#1849A9" },
            },
            gray: {
              50: { $type: "color", $value: "#F8FAFC" },
              900: { $type: "color", $value: "#0F172A" },
            },
            white: { $type: "color", $value: "#FFFFFF" },
            black: { $type: "color", $value: "#000000" },
          },
          font: {
            family: {
              sans: { $type: "fontFamily", $value: "Inter, system-ui, sans-serif" },
            },
            size: {
              300: { $type: "dimension", $value: "1rem" },
              500: { $type: "dimension", $value: "1.25rem" },
              700: { $type: "dimension", $value: "1.875rem" },
            },
          },
          space: {
            200: { $type: "dimension", $value: "0.5rem" },
            400: { $type: "dimension", $value: "1rem" },
            800: { $type: "dimension", $value: "2rem" },
          },
          radius: {
            300: { $type: "dimension", $value: "0.5rem" },
          },
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    filesCreated++;
  }

  // Create semantic.tokens.json
  const semanticPath = path.join(targetDir, "tokens", "core", "semantic.tokens.json");
  try {
    await access(semanticPath);
  } catch {
    await writeFile(
      semanticPath,
      JSON.stringify(
        {
          color: {
            background: {
              brand: {
                default: { $type: "color", $value: "{color.brand.600}" },
              },
              canvas: {
                default: { $type: "color", $value: "{color.gray.50}" },
              },
            },
            text: {
              primary: { $type: "color", $value: "{color.gray.900}" },
              inverse: { $type: "color", $value: "{color.white}" },
            },
          },
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    filesCreated++;
  }

  // Create light.tokens.json
  const lightPath = path.join(targetDir, "tokens", "themes", "light.tokens.json");
  try {
    await access(lightPath);
  } catch {
    await writeFile(
      lightPath,
      JSON.stringify(
        {
          theme: {
            light: {
              color: {
                surface: {
                  default: { $type: "color", $value: "{color.white}" },
                },
                text: {
                  default: { $type: "color", $value: "{color.text.primary}" },
                },
              },
            },
          },
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    filesCreated++;
  }

  // Create dark.tokens.json
  const darkPath = path.join(targetDir, "tokens", "themes", "dark.tokens.json");
  try {
    await access(darkPath);
  } catch {
    await writeFile(
      darkPath,
      JSON.stringify(
        {
          theme: {
            dark: {
              color: {
                surface: {
                  default: { $type: "color", $value: "{color.gray.900}" },
                },
                text: {
                  default: { $type: "color", $value: "{color.text.inverse}" },
                },
              },
            },
          },
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    filesCreated++;
  }

  // Create package.json if not exists
  const packagePath = path.join(targetDir, "package.json");
  try {
    await access(packagePath);
  } catch {
    await writeFile(
      packagePath,
      JSON.stringify(
        {
          name: name,
          version: "0.1.0",
          private: true,
          type: "module",
          scripts: {
            validate: "enterprise-design-spec validate",
            catalog: "enterprise-design-spec catalog",
            contrast: "enterprise-design-spec contrast",
            export: "enterprise-design-spec export",
            aliases: "enterprise-design-spec aliases",
          },
          devDependencies: {
            "enterprise-design-spec": "latest",
          },
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    filesCreated++;
  }

  return {
    name,
    path: targetDir,
    filesCreated,
  };
}
