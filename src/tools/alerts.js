import { z } from 'zod';
import { jsonResult } from './_format.js';
import {
  listAlerts,
  createPriceAlert,
  deleteAlert,
} from '../core/alerts.js';

export function registerAlertTools(server) {
  server.tool(
    'tv_alert_list',
    'List alerts on the current TradingView chart. Requires CDP connection.',
    {},
    async () => {
      try {
        return jsonResult(await listAlerts());
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'tv_alert_create_price',
    'Create a price alert on the current chart symbol (local TradingView Desktop only, no webhook). Requires CDP connection.',
    {
      price: z.number().describe('Price level to trigger the alert'),
      condition: z.enum(['crossing', 'crossing_up', 'crossing_down'])
        .optional()
        .default('crossing')
        .describe('Alert condition (default: crossing)'),
      message: z.string().optional().describe('Optional alert message'),
    },
    async ({ price, condition, message }) => {
      try {
        return jsonResult(await createPriceAlert({ price, condition, message }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );

  server.tool(
    'tv_alert_delete',
    'Delete an alert by its id. Fails if the alert is not found. Requires CDP connection.',
    {
      id: z.union([z.string(), z.number()]).describe('Alert id to delete'),
    },
    async ({ id }) => {
      try {
        return jsonResult(await deleteAlert({ id }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );
}
