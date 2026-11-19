'use client'

import { useEffect, useMemo, useRef } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import AutoHeight from 'embla-carousel-auto-height'
import {
  fromPayloadQuestionnaire,
  type StoredQuestionnaire,
} from '@remy90/payload-conditions-engine/payload'
import { useQuestionnaire } from '../receiver/useQuestionnaire'
import { answerLabels, explainPages } from '../receiver/explain'
import type { Question, AnswerIssue } from '@remy90/payload-conditions-engine'
import styles from './demo.module.css'

type Props = { document: StoredQuestionnaire; logicOpen: boolean }

function AnswerInput({
  question,
  values,
  issues,
  setAnswer,
}: {
  question: Question
  values: readonly string[]
  issues: AnswerIssue[]
  setAnswer: (questionId: string, values: readonly string[]) => void
}) {
  const errorId = `error-${question.id}`
  const answer = question.answer
  const error = issues.find((issue) => issue.questionId === question.id)
  const message =
    error?.issue === 'required'
      ? 'Choose an answer to continue.'
      : error?.issue === 'unknownOption'
        ? 'Choose one of the available options.'
        : error
          ? 'Choose a single answer.'
          : undefined
  const options =
    answer.type === 'boolean'
      ? [answer.trueOption, answer.falseOption]
      : answer.type === 'multipleChoice'
        ? answer.options
        : []
  const multiple = answer.type === 'multipleChoice' && answer.allowMultipleSelection
  return (
    <fieldset className={styles.question} aria-describedby={message ? errorId : undefined}>
      <legend>
        {question.text} {question.optional && <span className={styles.optional}>Optional</span>}
      </legend>
      {answer.type === 'inputText' ? (
        <textarea
          aria-label={question.text}
          aria-invalid={!!message}
          value={values[0] ?? ''}
          placeholder={answer.prompt}
          rows={2}
          onChange={(event) =>
            setAnswer(question.id, event.target.value ? [event.target.value] : [])
          }
        />
      ) : (
        <div className={styles.options}>
          {options.map((option) => (
            <label className={styles.option} key={option.id}>
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={question.id}
                value={option.id}
                checked={values.includes(option.id)}
                aria-invalid={!!message}
                onChange={() => {
                  setAnswer(
                    question.id,
                    multiple
                      ? values.includes(option.id)
                        ? values.filter((value) => value !== option.id)
                        : [...values, option.id]
                      : [option.id],
                  )
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}
      <p className={styles.issue} id={errorId} aria-hidden={!message} aria-live="polite">
        {message || '\u00a0'}
      </p>
    </fieldset>
  )
}

export function QuestionnaireDemo({ document, logicOpen }: Props) {
  const questionnaire = useMemo(() => fromPayloadQuestionnaire(document), [document])
  const receiver = useQuestionnaire(questionnaire)
  const labels = useMemo(
    () =>
      new Map(
        (document.pages ?? []).map((page) => [String(page.id), page.blockName || String(page.id)]),
      ),
    [document],
  )
  const explain = useMemo(() => explainPages(questionnaire), [questionnaire])
  const explanations = explain(receiver.answers)
  const summary = answerLabels(questionnaire, receiver.answers)
  const [viewportRef, embla] = useEmblaCarousel({ watchDrag: false, loop: false, duration: 28 }, [
    AutoHeight(),
  ])
  const visibleKey = receiver.visiblePages.map((page) => page.id).join('|')
  const selectedIndex = receiver.finished
    ? receiver.visiblePages.length
    : receiver.visiblePages.findIndex((page) => page.id === receiver.currentPage?.id)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)
  const previousQuestionnaire = useRef(questionnaire)

  useEffect(() => {
    if (!embla) return
    embla.reInit()
    embla.scrollTo(selectedIndex, true)
    // Visibility changes require Embla to measure the new slide set.
    // Selection-only changes use the smooth scroll effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embla, visibleKey, questionnaire])

  useEffect(() => {
    // Re-measure destination content, including the summary built while its slide was hidden.
    embla?.reInit()
    embla?.scrollTo(selectedIndex, window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    if (firstRender.current) firstRender.current = false
    else if (previousQuestionnaire.current === questionnaire)
      headingRef.current?.focus({ preventScroll: true })
    previousQuestionnaire.current = questionnaire
  }, [embla, selectedIndex, questionnaire])

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <a className={styles.brand} href="/">
          PAYLOAD <span>/ CONDITIONS</span>
        </a>
        <a href="/admin/collections/questionnaire">Open editor ↗</a>
      </header>
      <div className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>A QUESTIONNAIRE THAT LISTENS</p>
          <h1>{questionnaire.title}</h1>
        </div>
        <p>Every answer shapes what comes next.</p>
      </div>
      <nav aria-label="Questionnaire progress" className={styles.progress}>
        <ol>
          {questionnaire.pages.map((page) => {
            const visible = receiver.visiblePages.some((candidate) => candidate.id === page.id)
            const current = !receiver.finished && receiver.currentPage?.id === page.id
            return (
              <li
                key={page.id}
                aria-hidden={!visible}
                aria-current={current ? 'step' : undefined}
                className={`${styles.progressItem} ${visible ? styles.shown : ''} ${current ? styles.current : ''}`}
              >
                <span>{labels.get(page.id)}</span>
              </li>
            )
          })}
          <li
            className={`${styles.progressItem} ${styles.shown} ${receiver.finished ? styles.current : ''}`}
            aria-current={receiver.finished ? 'step' : undefined}
          >
            <span>Finish</span>
          </li>
        </ol>
      </nav>
      <div className={styles.workspace}>
        <section className={styles.formArea} aria-label="Questionnaire">
          <div className={styles.card}>
            <p className={styles.eyebrow}>
              {receiver.finished
                ? 'ALL DONE'
                : `STEP ${selectedIndex + 1} OF ${receiver.visiblePages.length}`}
            </p>
            <h2 ref={headingRef} tabIndex={-1}>
              {receiver.finished
                ? 'Your trip, your way.'
                : labels.get(receiver.currentPage?.id ?? '')}
            </h2>
            <div ref={viewportRef} className={styles.viewport}>
              <div className={styles.container}>
                {receiver.visiblePages.map((page) => (
                  <section
                    key={page.id}
                    className={styles.slide}
                    inert={receiver.finished || page.id !== receiver.currentPage?.id}
                    aria-hidden={receiver.finished || page.id !== receiver.currentPage?.id}
                  >
                    {page.skippable && <p className={styles.hint}>You can skip this page.</p>}
                    {page.questions.map((question) => (
                      <AnswerInput
                        key={question.id}
                        question={question}
                        values={receiver.answers.get(question.id) ?? []}
                        issues={page.id === receiver.currentPage?.id ? receiver.pageIssues : []}
                        setAnswer={receiver.setAnswer}
                      />
                    ))}
                  </section>
                ))}
                <section
                  className={styles.slide}
                  inert={!receiver.finished}
                  aria-hidden={!receiver.finished}
                >
                  <p className={styles.hint}>
                    Here’s what you told us. This demo keeps your answers in this tab.
                  </p>
                  <dl className={styles.summary}>
                    {summary.map((answer) => (
                      <div key={answer.id}>
                        <dt>{answer.question}</dt>
                        <dd>{answer.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <button className={styles.primary} onClick={receiver.restart}>
                    Restart
                  </button>
                </section>
              </div>
            </div>
            <footer className={styles.navigation}>
              <button
                className={styles.back}
                disabled={!receiver.canGoBack}
                onClick={receiver.back}
              >
                ← Back
              </button>
              {!receiver.finished && (
                <button
                  className={styles.primary}
                  aria-disabled={!receiver.canContinue}
                  onClick={receiver.next}
                >
                  {selectedIndex === receiver.visiblePages.length - 1 ? 'Finish' : 'Next'} →
                </button>
              )}
            </footer>
          </div>
          <p className={styles.footnote}>
            Powered by the conditions engine · Answers on hidden pages are cleared.
          </p>
        </section>
        <details className={styles.logic} open={logicOpen}>
          <summary>
            Logic <span>LIVE</span>
          </summary>
          <div className={styles.logicBody}>
            <h3>Current answers</h3>
            <div aria-live="polite" className={styles.answers}>
              {summary.length ? (
                summary.map((answer) => (
                  <p key={answer.id}>
                    <span>{answer.question}</span>
                    <strong>{answer.value}</strong>
                  </p>
                ))
              ) : (
                <p className={styles.muted}>Waiting for your first answer…</p>
              )}
            </div>
            <h3>Visible page ids</h3>
            <p className={styles.ids}>{receiver.visiblePages.map((page) => page.id).join(' → ')}</p>
            <h3>Page conditions</h3>
            {explanations.map((page) => (
              <section key={page.id} className={styles.rule}>
                <h4>
                  <span className={page.pass ? styles.pass : styles.fail}>
                    {page.pass ? '✓' : '×'}
                  </span>{' '}
                  {labels.get(page.id)}
                  {!!page.groups.length && <small> {page.match.toUpperCase()} groups</small>}
                </h4>
                {!page.groups.length && <p className={styles.muted}>Always shown</p>}
                {page.groups.map((group, index) => (
                  <div key={index} className={styles.group}>
                    <p className={styles.groupTitle}>
                      {group.pass ? '✓' : '×'} Group {index + 1} · {group.match.toUpperCase()}
                    </p>
                    {group.conditions.map((condition, index) => (
                      <p key={index} className={styles.condition}>
                        <span className={condition.pass ? styles.pass : styles.fail}>
                          {condition.pass ? '✓' : '×'}
                        </span>{' '}
                        {condition.text}
                      </p>
                    ))}
                  </div>
                ))}
              </section>
            ))}
          </div>
        </details>
      </div>
    </main>
  )
}
