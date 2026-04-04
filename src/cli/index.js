#!/usr/bin/env node

import './commands/health.js';
import './commands/pine.js';
import './commands/price.js';
import './commands/backtest.js';

import { run } from './router.js';
await run(process.argv);
