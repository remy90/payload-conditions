type Row = Record<string, unknown>

const invalidRows = (value: unknown, invalid: (row: Row) => boolean = () => false): boolean =>
  value != null &&
  (!Array.isArray(value) ||
    value.some((row) => !row || typeof row !== 'object' || Array.isArray(row) || invalid(row)))

/** Leave malformed arrays for Payload's field shape validation. */
export const hasInvalidQuestionnaireArrays = (document: Row, blocksField = 'pages'): boolean =>
  invalidRows(
    document[blocksField],
    (page) =>
      page.blockType === 'page' &&
      (invalidRows(page.questions, (question) =>
        invalidRows(
          question.answer,
          (answer) => answer.blockType === 'choice' && invalidRows(answer.options),
        ),
      ) ||
        invalidRows(page.conditionGroups, (group) => invalidRows(group.conditions))),
  )
