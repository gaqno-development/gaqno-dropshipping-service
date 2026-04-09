import { createHmac } from "node:crypto";

export function generateAliExpressSign(
  apiName: string,
  params: Record<string, string>,
  appSecret: string,
): string {
  const sorted = Object.keys(params).sort();
  const baseString =
    apiName + sorted.map((k) => `${k}${params[k]}`).join("");
  return createHmac("sha256", appSecret)
    .update(baseString)
    .digest("hex")
    .toUpperCase();
}

export function extractProductIdFromUrl(url: string): string {
  const match = url.match(/\/item\/(\d+)\.html/);
  if (match) return match[1];

  const idMatch = url.match(/[\?&]productId=(\d+)/);
  if (idMatch) return idMatch[1];

  const numericOnly = url.match(/(\d{10,})/);
  if (numericOnly) return numericOnly[1];

  throw new Error(`Cannot extract product ID from URL: ${url}`);
}
