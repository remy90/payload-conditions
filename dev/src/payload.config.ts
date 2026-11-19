import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { questionnairePlugin } from '@remy90/payload-conditions-plugin'
import { buildConfig } from 'payload'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const secret = process.env.PAYLOAD_SECRET ||
  (process.env.DEMO_LOCALHOST === '1' ? 'localhost-demo-only-change-before-deploying' : undefined)
if (!secret) {
  throw new Error('PAYLOAD_SECRET is required. Set DEMO_LOCALHOST=1 only for the localhost demo.')
}

export default buildConfig({
  secret,
  admin: {
    user: 'users',
    importMap: { baseDir: dirname },
    autoLogin: { email: 'demo@example.com', password: 'demo', prefillOnly: true },
  },
  db: sqliteAdapter({
    client: { url: process.env.DEMO_DATABASE_URL || `file:${path.resolve(dirname, '../demo.db')}` },
  }),
  collections: [{ slug: 'users', auth: true, fields: [] }],
  plugins: [
    questionnairePlugin({
      preview: (doc) => `/q/${doc.id}?preview=1`,
      livePreview: {
        url: ({ data }) => `/q/${data.id}?preview=1`,
        breakpoints: [
          { name: 'mobile', label: 'Mobile', width: 375, height: 667 },
          { name: 'desktop', label: 'Desktop', width: 1440, height: 900 },
        ],
      },
    }),
  ],
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
