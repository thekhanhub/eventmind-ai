#!/usr/bin/env node
import { processMessages } from './core/engine.js';
import config from './config.js';

async function main() {
  const args = process.argv.slice(2);
  let filePath = config.paths.messages;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      filePath = args[i + 1];
      i++;
    }
  }

  if (config.warnings.length > 0) {
    config.warnings.forEach(w => console.warn(`[Config Warning] ${w}`));
  }

  try {
    const result = await processMessages({ filePath });
    if (result.success) {
      console.log('\n[EventMind AI] Execution finished successfully.');
      process.exit(0);
    } else {
      console.warn(`\n[EventMind AI] Execution finished with status: ${result.mode}`);
      process.exit(0);
    }
  } catch (err) {
    console.error(`\n[Execution Halt] ${err.message}\n`);
    process.exit(1);
  }
}

main();
