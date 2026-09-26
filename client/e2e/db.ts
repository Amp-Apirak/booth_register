import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Direct database access for clean-up the API cannot do (e.g. removing a test lucky-draw winner).
 * Uses the server's own `pg` package and connection settings (server/.env).
 */
const serverDir = join(__dirname, '../../server');

function serverEnv(): Record<string, string> {
  const file = join(serverDir, '.env');
  const env: Record<string, string> = {};
  if (!existsSync(file)) return env;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require(join(serverDir, 'node_modules/pg'));
const env = { ...serverEnv(), ...process.env };

// spec files share one worker: open on first use, and again after a file closed it
let pool: { query: (text: string, params: unknown[]) => Promise<{ rows: unknown[] }>; end: () => Promise<void> } | null = null;
const connection = () => (pool ??= new Pool({
  host: env.DB_HOST || 'localhost',
  port: Number(env.DB_PORT || 5432),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME || 'booth_register_db',
  max: 2,
}));

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await connection().query(text, params)).rows as T[];
}

export async function closeDb() {
  const open = pool;
  pool = null;
  await open?.end();
}
