import { defineTool } from "eve/tools";
import { z } from "zod";
import { searchProductsOutputSchema } from "../../entity-schemas.js";
import { formatToolListResult } from "../../tool-display-format.js";
import { SEARCH_PRODUCTS_REPLY_GUIDANCE } from "../../tool-reply-guidance.js";

export const SEARCH_PRODUCTS_TOOL_NAME = "search_products";

export const searchProductsInputSchema = z.object({
  query: z.string().min(1).describe("Product name or SKU to search for."),
});

const DEMO_PRODUCTS = [
  {
    id: "sku-1001",
    name: "Wireless Keyboard",
    price: 79.99,
    currency: "USD",
    inStock: true,
    url: "https://shop.example.com/products/sku-1001",
  },
  {
    id: "sku-2042",
    name: "USB-C Hub",
    price: 45.99,
    currency: "USD",
    inStock: true,
    url: "https://shop.example.com/products/sku-2042",
  },
  {
    id: "sku-3308",
    name: "Monitor Stand",
    price: 129.99,
    currency: "USD",
    inStock: false,
    url: "https://shop.example.com/products/sku-3308",
  },
] as const;

export function defineSearchProductsTool() {
  return defineTool({
    description:
      "Search the product catalog and return matching items. " +
      "Results render in chat UI — do not restate product names, prices, or SKUs in your reply.",
    inputSchema: searchProductsInputSchema,
    outputSchema: searchProductsOutputSchema,
    async execute({ query }) {
      const normalized = query.trim().toLowerCase();
      const items = DEMO_PRODUCTS.filter(
        (product) =>
          product.name.toLowerCase().includes(normalized) ||
          product.id.toLowerCase().includes(normalized)
      );

      return formatToolListResult(
        "items",
        items.map((product) => ({ ...product })),
        {
          replyGuidance: SEARCH_PRODUCTS_REPLY_GUIDANCE,
        }
      );
    },
  });
}

export const searchProductsTool = defineSearchProductsTool();
