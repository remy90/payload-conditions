import type { StoredQuestionnaire } from '@remy90/payload-conditions-engine/payload'

export const fillQuestionNames = (data: Record<string, unknown>, blocksField = 'pages') => {
  const pages = data[blocksField] as StoredQuestionnaire['pages']
  const questions = (Array.isArray(pages) ? pages : []).flatMap((page) =>
    page &&
    (page.blockType === 'page' || page.blockType === undefined) &&
    Array.isArray(page.questions)
      ? page.questions.filter((question) => question && typeof question === 'object')
      : [],
  )
  const used = new Set<string>(
    questions.flatMap((question) =>
      typeof question.name === 'string' && question.name.trim() ? [question.name.trim()] : [],
    ),
  )

  for (const question of questions) {
    if (question.name != null && (typeof question.name !== 'string' || question.name.trim()))
      continue
    const label = typeof question.label === 'string' ? question.label.trim() : ''
    if (!label) continue
    const base =
      label
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^[^a-z]+/, '')
        .replace(/_+$/, '')
        .slice(0, 64) || 'question'
    let name = base
    let suffix = 2
    while (used.has(name)) {
      const ending = `_${suffix++}`
      name = base.slice(0, 64 - ending.length) + ending
    }
    question.name = name
    used.add(name)
  }
  return data
}
