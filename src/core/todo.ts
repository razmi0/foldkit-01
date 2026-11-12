// The TODO app logic. Pure: no DOM, no React, no randomness in update.
// Everything here can be unit-tested by calling init/update directly.

import { Data, Effect, Random, Schema } from 'effect'
import type { Command, Next, Program } from './store'

// ─── MODEL ────────────────────────────────────────────────────────────
// The whole state of the app, described with Effect Schema
// (the Schema is also used in dev to check every new model, see entry.tsx).

const Todo = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  done: Schema.Boolean,
})
export type Todo = typeof Todo.Type

export const Model = Schema.Struct({
  todos: Schema.Array(Todo),
  draft: Schema.String, // what is typed in the input right now
})
export type Model = typeof Model.Type

// ─── MESSAGE ──────────────────────────────────────────────────────────
// What happened, in the past tense. Data.taggedEnum gives us constructors
// (Message.ChangedDraft({ text })) and exhaustive matching ($match).

export type Message = Data.TaggedEnum<{
  ChangedDraft: { readonly text: string }
  SubmittedTodo: {}
  GeneratedTodoId: { readonly id: string; readonly text: string } // from a Command
  ToggledTodo: { readonly id: string }
  DeletedTodo: { readonly id: string }
  ClearedCompleted: {}
}>
export const Message = Data.taggedEnum<Message>()

// ─── COMMANDS ─────────────────────────────────────────────────────────
// A Command is just an Effect that ends with a Message.
// Effect's Random (instead of Math.random) is swappable in tests.

const generateTodoId = (text: string): Command<Message> =>
  Effect.gen(function* () {
    const n = yield* Random.nextIntBetween(0, Number.MAX_SAFE_INTEGER)
    return Message.GeneratedTodoId({ id: n.toString(36), text })
  })

// ─── INIT ─────────────────────────────────────────────────────────────

const init = (): Next<Model, Message> => ({
  model: {
    todos: [
      { id: 'a', text: 'Read the Effect docs', done: true },
      { id: 'b', text: 'Build a todo list', done: false },
    ],
    draft: '',
  },
})

// ─── UPDATE ───────────────────────────────────────────────────────────
// Returns the next model (never mutates) and, optionally, commands to run.
// $match is exhaustive: forget a Message and TypeScript fails.

const update = (model: Model, message: Message): Next<Model, Message> =>
  Message.$match(message, {
    ChangedDraft: ({ text }) => ({ model: { ...model, draft: text } }),

    // Step 1: can't create a random id here (impure), so ask for a Command.
    SubmittedTodo: () => {
      const text = model.draft.trim()
      if (text === '') return { model }
      return {
        model: { ...model, draft: '' },
        commands: [generateTodoId(text)],
      }
    },

    // Step 2: the Command finished and sent the id back.
    GeneratedTodoId: ({ id, text }) => ({
      model: { ...model, todos: [...model.todos, { id, text, done: false }] },
    }),

    ToggledTodo: ({ id }) => ({
      model: {
        ...model,
        todos: model.todos.map(todo =>
          todo.id === id ? { ...todo, done: !todo.done } : todo,
        ),
      },
    }),

    DeletedTodo: ({ id }) => ({
      model: { ...model, todos: model.todos.filter(todo => todo.id !== id) },
    }),

    ClearedCompleted: () => ({
      model: { ...model, todos: model.todos.filter(todo => !todo.done) },
    }),
  })

export const todoProgram: Program<Model, Message> = { init, update }
