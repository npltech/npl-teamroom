import 'dotenv/config';

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'Missing DATABASE_URL. Please check your .env file.'
    );
  }

  // Safe diagnostics - password is never printed
  const url = new URL(connectionString);

  console.log('DATABASE_URL loaded successfully');
  console.log('Database host:', url.hostname);
  console.log('Database port:', url.port);
  console.log('Database user:', decodeURIComponent(url.username));

  // Create PostgreSQL connection
  const client = postgres(connectionString, {
    max: 1,
  });

  // Create Drizzle database instance
  const db = drizzle(client);

  try {
    console.log('Running migrations...');

    await migrate(db, {
      migrationsFolder: './migrations',
    });

    console.log('Migrations complete.');
  } catch (error) {
    console.error('Migration failed:');
    console.error(error);

    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();