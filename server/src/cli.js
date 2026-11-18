#!/usr/bin/env node
import { processMessages } from './core/engine.js';
import config from './config.js';

async function main() {
  console.log('====================================================');
  console.log('  EventMind AI — Constraint-Aware Event Planner     ');
  console.log('  Mind to Machine Hackathon (Islamabad Event Plan)  ');
  console.log('====================================================');

  const args = process.argv.slice(2);
  let filePath = config.paths.messages;
  let isUpdate = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      filePath = args[i + 1];
      i++;
    } else if (args[i] === '--update') {
      isUpdate = true;
    }
  }

  console.log(`[Config] Model: ${config.geminiModel}`);
  console.log(`[Config] Input File: ${filePath}`);
  console.log(`[Config] Mode: ${isUpdate ? 'INCREMENTAL UPDATE' : 'INITIAL RUN'}`);

  if (config.warnings.length > 0) {
    config.warnings.forEach(w => console.warn(`[Warning] ${w}`));
  }

  try {
    const result = await processMessages({ filePath, isUpdate });
    console.log(`[Status] ${result.status} (${result.messageBytes} bytes ingested)`);
    console.log('[Info] Shared processing service invoked successfully.');
  } catch (err) {
    console.error(`\n[Execution Halt] ${err.message}\n`);
    process.exit(1);
  }
}

main();
