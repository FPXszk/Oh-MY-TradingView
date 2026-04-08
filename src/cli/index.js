#!/usr/bin/env node

import './commands/health.js';
import './commands/pine.js';
import './commands/price.js';
import './commands/backtest.js';
import './commands/launch.js';
import './commands/capture.js';
import './commands/stream.js';
import './commands/market-intel.js';
import './commands/workspace.js';
import './commands/alerts.js';

import { run } from './router.js';
await run(process.argv);
