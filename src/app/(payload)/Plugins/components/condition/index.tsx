// 'use client'

import React from 'react'
import QuestionCondition from './questionCondition'

export const Condition: React.FC = () => {
  // const { fields } = useFormFields(([formFields, dispatch]) => ({
  //   dispatch,
  //   fields: formFields,
  // }))

  return (
    <div>
      <QuestionCondition pageType="pages" />
    </div>
  )
}
