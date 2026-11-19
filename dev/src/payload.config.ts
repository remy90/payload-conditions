import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { payloadConditions } from '@remy90/payload-conditions-plugin'
import { buildConfig } from 'payload'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || 'localhost-demo-only-change-before-deploying',
  admin: {
    user: 'users',
    importMap: { baseDir: dirname },
    autoLogin: { email: 'demo@example.com', password: 'demo', prefillOnly: false },
  },
  db: sqliteAdapter({ client: { url: `file:${path.resolve(dirname, '../demo.db')}` } }),
  collections: [{ slug: 'users', auth: true, fields: [] }],
  plugins: [payloadConditions()],
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
