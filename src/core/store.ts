// The CORE loop: The Elm Architecture in ~60 lines of plain Effect.
// No React, no DOM. Any view layer can plug in through subscribe/getModel/dispatch.
//
//   Model ──(view)──▶ UI ──(user event)──▶ Message
//     ▲                                      │
//     └───────────── update ◀────────────────┘
//                      │  ▲
//              Command │  │ Message (result)
//                      ▼  │
//                Effect (side effect)

import { Effect, type Fiber } from 'effect'

/** A side effect that always ends with a Message. Its error channel is `never`:
 *  failures must be turned into Messages too (e.g. `FailedSave`). */
export type Command<Message> = Effect.Effect<Message>

/** What init and update return: the next model, plus work for the runtime. */
export type Next<Model, Message> = Readonly<{
  model: Model
  commands?: ReadonlyArray<Command<Message>>
}>

export type Program<Model, Message> = Readonly<{
  init: () => Next<Model, Message>
  update: (model: Model, message: Message) => Next<Model, Message>
}>

export type Store<Model, Message> = Readonly<{
  getModel: () => Model
  dispatch: (message: Message) => void
  subscribe: (listener: () => void) => () => void
  /** Stops all running commands. Call when the app unmounts. */
  dispose: () => void
}>

export type StoreOptions<Model, Message> = Readonly<{
  /** Called after every update. Handy for dev logging and checks. */
  onTransition?: (message: Message, previous: Model, next: Model) => void
}>

export const makeStore = <Model, Message>(
  program: Program<Model, Message>,
  options: StoreOptions<Model, Message> = {},
): Store<Model, Message> => {
  const listeners = new Set<() => void>()
  const running = new Set<Fiber.Fiber<Message>>()
  let disposed = false

  // Run each command on its own fiber; its resulting Message goes back to update.
  const run = (commands: ReadonlyArray<Command<Message>> = []) => {
    for (const command of commands) {
      const fiber = Effect.runFork(command)
      running.add(fiber)
      fiber.addObserver(exit => {
        running.delete(fiber)
        if (!disposed && exit._tag === 'Success') dispatch(exit.value)
      })
    }
  }

  const initial = program.init()
  let model = initial.model

  const dispatch = (message: Message) => {
    if (disposed) return
    const previous = model
    const next = program.update(model, message)
    model = next.model
    options.onTransition?.(message, previous, model)
    if (model !== previous) listeners.forEach(listener => listener())
    run(next.commands)
  }

  run(initial.commands)

  return {
    getModel: () => model,
    dispatch,
    subscribe: listener => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    dispose: () => {
      disposed = true
      running.forEach(fiber => fiber.interruptUnsafe())
      running.clear()
      listeners.clear()
    },
  }
}
