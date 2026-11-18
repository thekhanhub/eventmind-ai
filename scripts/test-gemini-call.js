import config from '../server/src/config.js';
import { aiAdapter } from '../server/src/ai/adapter.js';
import { tracer } from '../server/src/ai/tracer.js';

async function testCall() {
  console.log('====================================================');
  console.log('  EventMind AI — Real Gemini Model Call Verifier   ');
  console.log('====================================================');
  console.log(`[Config] Model: ${config.geminiModel}`);
  console.log(`[Config] API Key Set: ${config.geminiApiKey ? 'YES' : 'NO (Empty)'}`);

  if (!config.geminiApiKey) {
    console.error('\n[Error] GEMINI_API_KEY is not defined in .env.');
    console.error('Please insert your Gemini API key in .env (e.g. GEMINI_API_KEY=AIzaSy...) and rerun.');
    process.exit(1);
  }

  console.log('\n[API Call] Sending actual prompt to Google Gemini...');
  const startTime = Date.now();
  
  const result = await aiAdapter.callModel({
    systemInstruction: 'You are an event planning assistant. Output valid JSON only.',
    prompt: 'Return a JSON object with: {"status": "connected", "eventCity": "Islamabad", "maxDurationHours": 4}',
    area: 'reading',
    responseJson: true
  });

  const elapsed = Date.now() - startTime;
  console.log(`[API Call] Response received in ${elapsed}ms!`);
  console.log('\n----------------- VERIFICATION REPORT -----------------');
  console.log(`Exact Model Name Recorded: ${result.model}`);
  console.log(`Provider Usage Metadata:`);
  console.log(`  - Input Tokens:  ${result.usage.inputTokens}`);
  console.log(`  - Output Tokens: ${result.usage.outputTokens}`);
  console.log(`  - Total Tokens:  ${result.usage.totalTokens}`);
  console.log(`Parsed Output Payload:\n${JSON.stringify(result.data, null, 2)}`);
  console.log(`Trace Entry Status: ${result.traceEntry.status}`);
  console.log(`Trace Saved to: output/trace.json`);
  console.log('-------------------------------------------------------\n');
}

testCall().catch(err => {
  console.error('\n[API Call Failed]', err.message);
  process.exit(1);
});
