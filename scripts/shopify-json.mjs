// Shopify's language editor adds a generated-file header before valid JSON.
// Keep ordinary malformed JSON (including other comments) an error.
export function parseShopifyJson(source) {
  const header = /^\s*\/\*[\s\S]*?\*\/\s*/.exec(source);
  if (header && header[0].includes('The contents of this file are auto-generated.')) {
    source = source.slice(header[0].length);
  }
  return JSON.parse(source);
}
