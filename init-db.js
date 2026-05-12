import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function initDb() {
  try {
    await client.connect();
    const sql = fs.readFileSync('./init.sql', 'utf8');
    
    // Split by semicolon and filter out empty statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // Execute each statement separately
    for (const statement of statements) {
      await client.query(statement);
    }
    
    console.log('Database initialized successfully');
    await client.end();
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

initDb();
