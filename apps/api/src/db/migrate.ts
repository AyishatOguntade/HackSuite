import { readdir, readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pool } from './index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(__dirname, '..', 'migrations')

async function migrate() {
  const client = await pool.connect()
  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Get applied migrations
    const { rows } = await client.query<{ version: string }>(
      'SELECT version FROM schema_migrations ORDER BY version'
    )
    const applied = new Set(rows.map((r) => r.version))

    // Read migration files
    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort()

    let count = 0
    for (const file of files) {
      const version = file.replace('.sql', '')
      if (applied.has(version)) {
        console.log(`  [skip] ${file}`)
        continue
      }

      console.log(`  [run]  ${file}`)
      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8')

      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [version]
        )
        await client.query('COMMIT')
        count++
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      }
    }

    console.log(`\nMigrations complete. Applied: ${count}, Skipped: ${files.length - count}`)
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
