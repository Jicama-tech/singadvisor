import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { QUIZ_QUESTION_TYPE_LABELS } from "@/lib/course-content";
import type { QuizOptionDoc, QuizQuestionDoc } from "@/lib/courseContentClient";
import { cn } from "@/lib/utils";

/**
 * The question repeater inside a quiz item — EventForm's speaker/ticket-tier
 * pattern, controlled: the whole array is handed down and every edit calls
 * onChange with a new one. The item editor holds the draft, and nothing here
 * talks to the Backend.
 *
 * The three question types are not cosmetic. The Backend refuses to publish a
 * quiz whose single/true-false question has other than exactly one correct
 * answer, whose multiple has none, or whose true-false has other than two
 * options — so picking a correct answer on a radio question clears the others
 * here, switching a question back off "Multiple answers" keeps only the first
 * tick, and picking "True or false" replaces the options with a locked pair
 * rather than letting an unpublishable shape be authored at all.
 */

/**
 * The id a brand-new row carries until the server has seen it — a durable id,
 * not just a React key. The Backend keeps whatever the client sent (`id ||
 * randomUUID()` in course-content.service.ts), so this string is what every
 * later save, edit and delete matches the row on, and it has to be unique
 * across sittings and not merely within one render. A module counter was not:
 * it restarts at one on each page load, so a second sitting mints the `row-1`
 * the first sitting already saved onto that quiz, and editing or deleting
 * either of the two then hits both. randomUUID() is the same generator the
 * Backend falls back to; the clock-and-random tail covers a non-secure context
 * (the admin opened over plain http), where it is not exposed.
 */
const newRowId = () => {
  const unique =
    crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `row-${unique}`;
};

const emptyOption = (): QuizOptionDoc => ({ id: newRowId(), text: "", correct: false });

/** True/false is a fixed pair, so the editor authors it rather than the user:
 * its text is locked and there is no add/remove. */
const trueFalseOptions = (): QuizOptionDoc[] => [
  { id: newRowId(), text: "True", correct: true },
  { id: newRowId(), text: "False", correct: false },
];

/** The radio types allow exactly one correct answer, so the first tick stays
 * and every later one is cleared. */
const onlyFirstCorrect = (options: QuizOptionDoc[]): QuizOptionDoc[] => {
  let seen = false;
  return options.map((o) => {
    if (!o.correct) return o;
    if (seen) return { ...o, correct: false };
    seen = true;
    return o;
  });
};

const emptyQuestion = (): QuizQuestionDoc => ({
  id: newRowId(),
  type: "single",
  prompt: "",
  options: [emptyOption(), emptyOption()],
  explanation: "",
  points: 1,
});

/** The admin's standard 8×8 icon button, with a disabled state for the ▲▼ at
 * the ends of the list. */
const iconButton =
  "grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)] disabled:pointer-events-none disabled:opacity-40";

export function QuizQuestionsEditor({
  questions,
  onChange,
}: {
  questions: QuizQuestionDoc[];
  onChange: (questions: QuizQuestionDoc[]) => void;
}) {
  function patchQuestion(id: string, patch: Partial<QuizQuestionDoc>) {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function moveQuestion(index: number, delta: number) {
    const next = [...questions];
    const [row] = next.splice(index, 1);
    next.splice(index + delta, 0, row);
    onChange(next);
  }

  /** The ticks have to be fixed up with the type, not just the input's shape.
   * "Multiple answers" is the only type that tolerates several correct
   * options, and leaving them behind on the way back to a radio type is
   * invisible — a browser paints one checked button per radio group, so the
   * question looks answerable while the Backend refuses to publish it and
   * clicking the shown option appears to do nothing. */
  function changeType(question: QuizQuestionDoc, type: string) {
    if (type === "true-false") {
      patchQuestion(question.id, { type, options: trueFalseOptions() });
      return;
    }
    patchQuestion(question.id, {
      type,
      ...(type !== "multiple" && { options: onlyFirstCorrect(question.options) }),
    });
  }

  /** Single and true-false allow exactly one correct answer, so marking one
   * unmarks the rest; multiple simply toggles. */
  function setCorrect(question: QuizQuestionDoc, optionId: string, correct: boolean) {
    const exclusive = question.type !== "multiple";
    patchQuestion(question.id, {
      options: question.options.map((o) =>
        o.id === optionId ? { ...o, correct } : exclusive ? { ...o, correct: false } : o,
      ),
    });
  }

  function patchOption(question: QuizQuestionDoc, optionId: string, text: string) {
    patchQuestion(question.id, {
      options: question.options.map((o) => (o.id === optionId ? { ...o, text } : o)),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {questions.length === 0 ? (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          No questions yet. A quiz with no questions can&apos;t be published.
        </p>
      ) : (
        questions.map((q, i) => {
          const locked = q.type === "true-false";
          return (
            <div
              key={q.id}
              className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Q{i + 1}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={i === 0}
                    onClick={() => moveQuestion(i, -1)}
                    className={iconButton}
                  >
                    <Icon name="chevron-down" size={15} className="rotate-180" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={i === questions.length - 1}
                    onClick={() => moveQuestion(i, 1)}
                    className={iconButton}
                  >
                    <Icon name="chevron-down" size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove question ${i + 1}`}
                    onClick={() => onChange(questions.filter((row) => row.id !== q.id))}
                    className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-4">
                <Field label="Question" htmlFor={`q-${q.id}-prompt`} required>
                  <Textarea
                    id={`q-${q.id}-prompt`}
                    rows={2}
                    value={q.prompt}
                    onChange={(e) => patchQuestion(q.id, { prompt: e.target.value })}
                    placeholder="What should they be able to answer?"
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Type" htmlFor={`q-${q.id}-type`}>
                    <Select
                      id={`q-${q.id}-type`}
                      value={q.type}
                      onChange={(e) => changeType(q, e.target.value)}
                    >
                      {Object.entries(QUIZ_QUESTION_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Points" htmlFor={`q-${q.id}-points`}>
                    <Input
                      id={`q-${q.id}-points`}
                      type="number"
                      min={0}
                      value={q.points}
                      onChange={(e) =>
                        patchQuestion(q.id, {
                          points: e.target.value === "" ? 0 : Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    Answers
                  </span>
                  {q.options.map((o) => (
                    <div key={o.id} className="flex items-center gap-2">
                      <input
                        type={q.type === "multiple" ? "checkbox" : "radio"}
                        name={`q-${q.id}-correct`}
                        checked={o.correct}
                        onChange={(e) => setCorrect(q, o.id, e.target.checked)}
                        aria-label={`Mark “${o.text || "this answer"}” correct`}
                        className="h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                      />
                      <Input
                        value={o.text}
                        onChange={(e) => patchOption(q, o.id, e.target.value)}
                        disabled={locked}
                        readOnly={locked}
                        placeholder="An answer"
                        className="flex-1"
                      />
                      <button
                        type="button"
                        aria-label="Remove answer"
                        disabled={locked}
                        onClick={() =>
                          patchQuestion(q.id, {
                            options: q.options.filter((row) => row.id !== o.id),
                          })
                        }
                        className={cn(iconButton, "shrink-0 hover:text-red-600")}
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  ))}
                  {!locked && (
                    <div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          patchQuestion(q.id, { options: [...q.options, emptyOption()] })
                        }
                      >
                        <Icon name="plus" size={14} />
                        Add option
                      </Button>
                    </div>
                  )}
                </div>

                <Field
                  label="Explanation"
                  htmlFor={`q-${q.id}-explanation`}
                  hint="Shown after answering, whichever way it went. Never sent to a public caller."
                >
                  <Textarea
                    id={`q-${q.id}-explanation`}
                    rows={2}
                    value={q.explanation}
                    onChange={(e) => patchQuestion(q.id, { explanation: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          );
        })
      )}

      <div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onChange([...questions, emptyQuestion()])}
        >
          <Icon name="plus" size={16} />
          Add question
        </Button>
      </div>
    </div>
  );
}
