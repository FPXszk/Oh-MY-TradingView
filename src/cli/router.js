import { parseArgs } from 'node:util';

const commands = new Map();

export function register(name, config) {
  commands.set(name, config);
}

function printHelp() {
  process.stdout.write('Usage: tv <command> [options]\n\n');
  process.stdout.write('Commands:\n');
  const maxLen = Math.max(...[...commands.keys()].map(k => k.length));
  for (const [name, cmd] of commands) {
    if (cmd.subcommands) {
      const subs = [...cmd.subcommands.keys()].join(', ');
      process.stdout.write(`  ${name.padEnd(maxLen + 2)}${cmd.description}  [${subs}]\n`);
    } else {
      process.stdout.write(`  ${name.padEnd(maxLen + 2)}${cmd.description}\n`);
    }
  }
  process.stdout.write('\nRun "tv <command> --help" for command-specific options.\n');
  process.stdout.write('\nDISCLAIMER\n');
  process.stdout.write('  Not affiliated with TradingView Inc.\n');
  process.stdout.write("  Use subject to TradingView's Terms of Use: tradingview.com/policies\n");
}

function printCommandHelp(name, cmd) {
  if (cmd.subcommands) {
    process.stdout.write(`Usage: tv ${name} <subcommand> [options]\n\n`);
    process.stdout.write('Subcommands:\n');
    for (const [sub, subConf] of cmd.subcommands) {
      process.stdout.write(`  ${sub.padEnd(12)}${subConf.description}\n`);
    }
  } else {
    process.stdout.write(`Usage: tv ${name} [options]\n\n`);
    process.stdout.write(`${cmd.description}\n`);
  }
  const opts = cmd.options || {};
  if (Object.keys(opts).length > 0) {
    process.stdout.write('\nOptions:\n');
    for (const [k, v] of Object.entries(opts)) {
      const flag = v.short ? `-${v.short}, --${k}` : `    --${k}`;
      process.stdout.write(`  ${flag.padEnd(20)}${v.description || ''}\n`);
    }
  }
}

export async function run(argv) {
  const args = argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    process.exit(0);
  }

  const cmdName = args[0];
  const cmd = commands.get(cmdName);

  if (!cmd) {
    process.stderr.write(`Unknown command: ${cmdName}\n`);
    process.stderr.write('Run "tv --help" for a list of commands.\n');
    process.exit(1);
  }

  let handler, options;
  if (cmd.subcommands) {
    const subName = args[1];
    if (!subName || subName === '--help' || subName === '-h') {
      printCommandHelp(cmdName, cmd);
      process.exit(0);
    }
    const sub = cmd.subcommands.get(subName);
    if (!sub) {
      process.stderr.write(`Unknown subcommand: ${cmdName} ${subName}\n`);
      printCommandHelp(cmdName, cmd);
      process.exit(1);
    }
    handler = sub.handler;
    options = sub.options || {};
    try {
      const { values, positionals } = parseArgs({
        args: args.slice(2),
        options: { help: { type: 'boolean', short: 'h' }, ...options },
        allowPositionals: true,
        strict: false,
      });
      if (values.help) {
        process.stdout.write(`Usage: tv ${cmdName} ${subName} [options]\n\n`);
        process.stdout.write(`${sub.description}\n`);
        process.exit(0);
      }
      await execute(handler, values, positionals);
    } catch (err) {
      handleError(err);
    }
  } else {
    handler = cmd.handler;
    options = cmd.options || {};
    try {
      const { values, positionals } = parseArgs({
        args: args.slice(1),
        options: { help: { type: 'boolean', short: 'h' }, ...options },
        allowPositionals: true,
        strict: false,
      });
      if (values.help) {
        printCommandHelp(cmdName, cmd);
        process.exit(0);
      }
      await execute(handler, values, positionals);
    } catch (err) {
      handleError(err);
    }
  }
}

async function execute(handler, values, positionals) {
  try {
      const result = await handler(values, positionals);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exit(0);
  } catch (err) {
    handleError(err);
  }
}

function handleError(err) {
  const message = err.message || String(err);
  const payload = err.result
    ? { ...err.result, success: false, error: message }
    : { success: false, error: message };
  if (/CDP|connection|ECONNREFUSED|not running/i.test(message)) {
    process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
    process.exit(2);
  }
  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(1);
}
