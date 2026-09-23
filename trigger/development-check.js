import { task } from "@trigger.dev/sdk";

// A harmless registration check. Storefront events stay on the existing n8n route
// until a server-side Trigger.dev workflow is designed and explicitly connected.
export const trendyDevelopmentCheck = task({
  id: "trendy-development-check",
  run: async () => ({ app: "Trendy", ready: true }),
});
