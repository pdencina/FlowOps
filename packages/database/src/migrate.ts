import 'dotenv/config';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrationClient } from './connection';

async function main() {
  console.log('🗄️  Running migrations...');

  const db = drizzle(migrationClient);
  await migrate(db, { migrationsFolder: './src/migrations' });

  console.log('✅ Migrations complete');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
