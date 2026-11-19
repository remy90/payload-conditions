import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { build } from 'esbuild'
import { expect, it } from 'vitest'

it('ships a client bundle without the Payload server runtime', async () => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL('../dist/client.js', import.meta.url))],
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    // Keep Payload imports visible so an accidental server dependency fails here.
    external: [
      'react',
      'react/jsx-runtime',
      '@payloadcms/ui',
      '@remy90/payload-conditions-engine',
      'payload',
    ],
    metafile: true,
    write: false,
  })

  const payloadImports = Object.values(result.metafile.outputs)
    .flatMap((output) => output.imports)
    .filter(({ path }) => /^payload(?:\/|$)/.test(path))
  expect(payloadImports).toEqual([])

  const bundle = result.outputFiles[0].contents
  console.info('client bundle bytes', {
    minified: bundle.length,
    gzip: gzipSync(bundle).length,
  })
})
