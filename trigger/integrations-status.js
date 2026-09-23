import { task } from "@trigger.dev/sdk";

export const trendyN8nGoogleSheets = task({
  id: "trendy-n8n-google-sheets",
  run: async () => {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    return {
      app: "Trendy",
      n8n: {
        configured: Boolean(webhookUrl),
        workflow: "Trendy App — Order & Event Automation",
        webhookPath: "trendy-backend-events",
      },
      googleSheets: {
        configured: Boolean(spreadsheetId),
        workbook: "Trendy Orders",
        tabs: ["Orders", "CartEvents", "Users"],
      },
    };
  },
});
