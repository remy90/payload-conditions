import type { BlocksFieldClient, ClientConfig } from 'payload'

export function showBlockName(
  field: Pick<BlocksFieldClient, 'blocks' | 'blockReferences'>,
  blockType: string | undefined,
  blocksMap: ClientConfig['blocksMap'] = {},
): boolean {
  if (!blockType) return true
  const block = blocksMap[blockType] ??
    (field.blockReferences ?? field.blocks ?? []).find(
      (block) => typeof block !== 'string' && block.slug === blockType,
    )
  return typeof block === 'object' ? !block.admin?.disableBlockName : true
}
