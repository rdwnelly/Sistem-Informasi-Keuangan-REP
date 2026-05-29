// PostCSS plugin to remove @supports blocks that reference modern CSS color functions
// like `lab()` which are not supported by some parsers (Turbopack/esbuild).
function removeLabSupports() {
  return {
    postcssPlugin: "postcss-remove-lab-supports",
    Once(root) {
      root.walkAtRules("supports", (atRule) => {
        if (atRule.params && atRule.params.includes("lab(")) {
          atRule.remove();
        }
      });
    },
  };
}
removeLabSupports.postcss = true;

const config = {
  plugins: ["@tailwindcss/postcss", removeLabSupports],
};

export default config;
