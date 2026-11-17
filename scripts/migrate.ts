import 'dotenv/config';
import { getDbState } from '../src/db/index.ts';

async function main() {
  const state = await getDbState();
  if (state.engine !== 'postgresql' || !state.connected || !state.pool) {
    console.error(
      `[db:migrate] PostgreSQL tidak terhubung (${state.lastError || 'variabel DATABASE_URL / PGHOST belum diatur'}).`
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `[db:migrate] Migrasi selesai untuk ${state.host || 'DSN'}/${state.database || 'default'}. Versi aktif: ${state.appliedMigrations.join(', ')}`
  );
  await state.pool.end().catch(() => {});
}

void main();
