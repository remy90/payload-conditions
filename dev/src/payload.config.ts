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
  plugins: [
    payloadConditions({
      preview: (doc) => `http://localhost:3000/q/${doc.id}?preview=1`,
      livePreview: {
        url: ({ data }) => `http://localhost:3000/q/${data.id}?preview=1`,
        breakpoints: [
          { name: 'mobile', label: 'Mobile', width: 375, height: 667 },
          { name: 'desktop', label: 'Desktop', width: 1440, height: 900 },
        ],
      },
    }),
  ],
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
