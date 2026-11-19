import { describe, expect, it } from 'vitest'
import { validateConditionAnswer } from '../src/condition/validateAnswer.js'
import { validateConditionOperator } from '../src/condition/validateOperator.js'

const operatorPath = ['pages', '2', 'conditionGroups', '0', 'conditions', '0', 'operator']
const answerPath = [...operatorPath.slice(0, -1), 'answerId']

describe('request validation index', () => {
  it('builds once across fields and Payload validationData wrappers, with isolated requests and documents', () => {
    let builds = 0
    const firstPage = {
      id: 'first',
      blockType: 'page',
      get questions() {
        builds++
        return [
          {
            id: 'q',
            answer: [
              { blockType: 'yesNo',  yesId: 'yes', noId: 'no'  },
            ],
          },
        ]
      },
    }
    const pages = [
      firstPage,
      { id: 'unknown', blockType: 'anotherBlock' },
      { id: 'second', blockType: 'page' },
    ]
    const req = { context: {} }
    for (let row = 0; row < 100; row++) {
      // Payload deep-merges a new data wrapper per field and preserves the pages array.
      const context = { data: { pages }, siblingData: { questionId: 'q' }, req }
      expect(validateConditionOperator('equals', { ...context, path: operatorPath })).toBe(true)
      expect(validateConditionAnswer('yes', { ...context, path: answerPath })).toBe(true)
    }
    expect(builds).toBe(1)
    expect(
      validateConditionOperator('equals', {
        data: { pages },
        siblingData: { questionId: 'q' },
        path: operatorPath,
        req: { context: {} },
      }),
    ).toBe(true)
    expect(builds).toBe(2)
    expect(
      validateConditionOperator('equals', {
        data: { pages: [...pages] },
        siblingData: { questionId: 'q' },
        path: operatorPath,
        req,
      }),
    ).toBe(true)
    expect(builds).toBe(3)
  })

  it('uses original page positions when unknown pages precede the source', () => {
    const data = {
      pages: [
        { id: 'unknown', blockType: 'anotherBlock' },
        {
          id: 'source',
          blockType: 'page',
          questions: [
            {
              id: 'q',
              answer: [
                {
                  blockType: 'yesNo',
                   yesId: 'yes', noId: 'no' ,
                },
              ],
            },
          ],
        },
        { id: 'later', blockType: 'page' },
      ],
    }
    expect(
      validateConditionOperator('equals', {
        data,
        siblingData: { questionId: 'q' },
        req: {},
        path: operatorPath,
      }),
    ).toBe(true)
    const context = { data, siblingData: { questionId: 'q' }, req: { context: {} } }
    expect(validateConditionOperator('equals', { ...context, path: operatorPath })).toBe(true)
    expect(
      validateConditionOperator('equals', {
        ...context,
        path: ['pages', '1', ...operatorPath.slice(2)],
      }),
    ).toEqual(expect.any(String))
    expect(
      validateConditionOperator('equals', {
        ...context,
        path: ['pages', '0', ...operatorPath.slice(2)],
      }),
    ).toEqual(expect.any(String))
  })
})
