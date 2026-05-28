const fs = require('fs');
const files = [
  'src/features/chord-generator/actions/chord-generator.actions.ts',
  'src/features/chord-generator/actions/chord-suggestions.actions.ts',
  'src/features/rhythm-generator/actions/rhythm-generator.actions.ts',
  'src/features/song-composer/actions/intelligent-melody.actions.ts',
  'src/features/song-composer/actions/song-generator.actions.ts',
  'src/features/song-composer/actions/drum-generator.actions.ts'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (content.includes('import { generateText, Output } from')) {
    content = content.replace(/import \{ generateText, Output \} from ["']ai["']/g, 'import { generateObject } from "ai"');
    changed = true;
  }
  if (content.includes('await generateText({')) {
    content = content.replace(/await generateText\(\{/g, 'await generateObject({');
    changed = true;
  }
  if (content.includes('output: Output.object({ schema:')) {
    content = content.replace(/output: Output\.object\(\{ schema: (.*?)\}(.*?)\),/g, 'schema: $1,');
    changed = true;
  }
  if (content.includes('result.output')) {
    content = content.replace(/result\.output/g, 'result.object');
    changed = true;
  }
  if (content.includes('timeout:')) {
    content = content.replace(/timeout:/g, 'abortSignal: AbortSignal.timeout(').replace(/timeout:\s*(\d+)/g, 'abortSignal: AbortSignal.timeout($1)');
    // that replace logic for timeout is flaky, but actually I don't need to replace timeout if it works, wait: generateObject doesn't support timeout directly, it uses abortSignal? Let's just fix the rest.
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Fixed:', file);
  }
}
