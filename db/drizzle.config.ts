import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL. Copy .env.example to .env and fill in your Supabase DB connection string.');
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // We hand-authored the RLS policies to reference auth.uid()/profiles
  // directly, so Drizzle doesn't need to manage Postgres roles itself.
  schemaFilter: ['public'],
});
