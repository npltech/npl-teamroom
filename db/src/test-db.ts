import 'dotenv/config';
import postgres from 'postgres';

async function testConnection() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is missing');
  }

  console.log('Testing Supabase connection...');

  const sql = postgres(connectionString, {
    max: 1,
  });

  try {
    const result = await sql`SELECT NOW() AS current_time`;

    console.log('✅ Database connection successful!');
    console.log('Database time:', result[0].current_time);
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error);
  } finally {
    await sql.end();
  }
}

testConnection();