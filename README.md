# Payload conditions

A workspace for authoring conditional questionnaires in Payload CMS and evaluating them in your frontend.

## Packages

- [Plugin](packages/plugin/README.md): Payload CMS editor, collection, configuration and stored schema.
- [Engine](packages/engine/README.md): framework-free evaluation, answer validation and navigation, with a Payload document adapter.

## Releasing

Publish the engine first, then the plugin. Always use `pnpm publish` or `pnpm -r publish`: pnpm rewrites the plugin's `workspace:^` engine dependency to `^1.0.1` in the published package.

From the workspace root, run:

```sh
pnpm release
```

The release script runs `pnpm build && pnpm test && pnpm -r publish --access public`. pnpm's topological order publishes the engine before the plugin.

## Development

Use Node 26.13.1 and the pnpm version pinned in `package.json`. Tools such as mise and fnm pick up Node from `.node-version`. From the workspace root:

```sh
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

Build, typecheck and test run across both packages.
