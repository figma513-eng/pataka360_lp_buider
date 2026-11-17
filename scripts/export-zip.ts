import 'dotenv/config';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildFullProjectBackupZip } from '../src/server/fullExportService.ts';

async function main() {
  const result = await buildFullProjectBackupZip();
  const argOut = process.argv[2]?.trim();
  const outPath = argOut
    ? path.resolve(argOut)
    : path.join(os.tmpdir(), result.filename);

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, result.buffer, { mode: 0o600 });

  console.log(`ZIP backup created successfully:`);
  console.log(`  Path   : ${outPath}`);
  console.log(`  Files  : ${result.manifest.counts.files}`);
  console.log(`  Users  : ${result.manifest.counts.users}`);
  console.log(`  Projects: ${result.manifest.counts.projects}`);
  console.log(`  Events : ${result.manifest.counts.analyticsEvents}`);
  console.log(`  Media  : ${result.manifest.counts.media}`);
  console.log(`  Size   : ${(result.buffer.length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error('Export ZIP failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
