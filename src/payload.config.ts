import { Questionnaire } from '@/app/(payload)/collections/Questionnaire'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload/config'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  editor: lexicalEditor(),
  // i18n: {
  //   fallbackLanguage: 'en',
  //   supportedLanguages: ['en'],
  // },
  debug: true,
  serverURL: 'http://localhost:3000',

  plugins: [
    // samplePlugin({
    //   enabled: true,
    // }),
  ],

  collections: [
    Questionnaire,
    {
      slug: 'pages',
      admin: {
        useAsTitle: 'title',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'content',
          type: 'richText',
        },
      ],
    },
    {
      slug: 'media',
      upload: true,
      fields: [
        {
          name: 'text',
          type: 'text',
        },
      ],
    },
  ],
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.MONGODB_URI || '',
  }),
  admin: {
    // autoLogin: {
    //   email: 'dev@payloadcms.com',
    //   password: 'test',
    //   prefillOnly: true,
    // },
  },
  async onInit(payload) {
    // const existingUsers = await payload.find({
    //   collection: 'users',
    //   limit: 1,
    // })
    // if (existingUsers.docs.length === 0) {
    //   await payload.create({
    //     collection: 'users',
    //     data: {
    //       email: 'dev@payloadcms.com',
    //       password: 'test',
    //     },
    //   })
    // }
  },
  // Sharp is now an optional dependency -
  // if you want to resize images, crop, set focal point, etc.
  // make sure to install it and pass it to the config.

  // This is temporary - we may make an adapter pattern
  // for this before reaching 3.0 stable
  sharp,
})
