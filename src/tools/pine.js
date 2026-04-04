import { z } from 'zod';
import { jsonResult } from './_format.js';
import * as core from '../core/pine.js';

export function registerPineTools(server) {
  server.tool(
    'pine_get_source',
    'Get current Pine Script source code from the editor',
    {},
    async () => {
      try {
        return jsonResult(await core.getSource());
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    }
  );

  server.tool(
    'pine_set_source',
    'Set Pine Script source code in the editor',
    { source: z.string().describe('Pine Script source code to inject') },
    async ({ source }) => {
      try {
        return jsonResult(await core.setSource({ source }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    }
  );

  server.tool(
    'pine_compile',
    'Compile / add the current Pine Script to the chart',
    {},
    async () => {
      try {
        return jsonResult(await core.compile());
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    }
  );

  server.tool(
    'pine_get_errors',
    'Get Pine Script compilation errors from Monaco markers',
    {},
    async () => {
      try {
        return jsonResult(await core.getErrors());
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    }
  );

  server.tool(
    'pine_smart_compile',
    'Intelligent compile: detects button, compiles, checks errors, reports study changes. Use for the compile-check-fix loop.',
    {},
    async () => {
      try {
        return jsonResult(await core.smartCompile());
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    }
  );

  server.tool(
    'pine_analyze',
    'Run offline static analysis on Pine Script code — catches array OOB, unguarded .first()/.last(), strategy misuse. No TradingView connection needed.',
    { source: z.string().describe('Pine Script source code to analyze') },
    async ({ source }) => {
      try {
        return jsonResult(core.analyze({ source }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    }
  );
}
