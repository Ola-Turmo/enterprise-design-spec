import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Enterprise Design Spec",
  description: "Open standard for AI-readable enterprise design systems",
  base: "/enterprise-design-spec/",
  themeConfig: {
    nav: [
      { text: "Standard", link: "/design" },
      { text: "Tokens", link: "/tokens" },
      { text: "Assets", link: "/assets" },
      { text: "CLI", link: "/cli" },
    ],
    sidebar: [
      {
        text: "Design Standard",
        items: [
          { text: "DESIGN.md", link: "/design" },
          { text: "BRAND.md", link: "/brand" },
          { text: "Contributing", link: "/contributing" },
        ],
      },
      {
        text: "Tokens",
        items: [
          { text: "Primitives", link: "/tokens/primitives" },
          { text: "Semantic", link: "/tokens/semantic" },
          { text: "Themes", link: "/tokens/themes" },
        ],
      },
      {
        text: "CLI Reference",
        items: [
          { text: "validate", link: "/cli/validate" },
          { text: "catalog", link: "/cli/catalog" },
          { text: "contrast", link: "/cli/contrast" },
          { text: "export", link: "/cli/export" },
          { text: "aliases", link: "/cli/aliases" },
          { text: "diff", link: "/cli/diff" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/Ola-Turmo/enterprise-design-spec" },
    ],
  },
});
