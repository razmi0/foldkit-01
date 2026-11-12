// The VIEW: a pure function of the model.
// Convention: no useState here. All state lives in the core (src/core/todo.ts).
// Events don't run logic. They only dispatch a Message.

import { useEffect } from 'react'
import type { Store } from '../core/store'
import { Message, type Model, type Todo } from '../core/todo'
import { useModel } from './useModel'

type Dispatch = (message: Message) => void

export const TodoApp = ({ store }: { store: Store<Model, Message> }) => {
  const model = useModel(store)
  const remaining = model.todos.filter(todo => !todo.done).length

  // Side effect of rendering, not app state: keep the tab title in sync.
  useEffect(() => {
    document.title = `Todos (${remaining})`
  }, [remaining])

  return <TodoView model={model} dispatch={store.dispatch} remaining={remaining} />
}

const TodoView = ({
  model,
  dispatch,
  remaining,
}: {
  model: Model
  dispatch: Dispatch
  remaining: number
}) => (
  <main>
    <h1 className="title">Todo list</h1>

    <form
      className="new-todo"
      onSubmit={event => {
        event.preventDefault()
        dispatch(Message.SubmittedTodo())
      }}
    >
      <input
        className="new-todo-input"
        placeholder="What needs to be done?"
        aria-label="New todo"
        value={model.draft}
        onChange={event => dispatch(Message.ChangedDraft({ text: event.target.value }))}
      />
      <button className="button add" type="submit">
        Add
      </button>
    </form>

    {model.todos.length === 0 ? (
      <p className="empty">Nothing to do. Add something above.</p>
    ) : (
      <ul className="todos">
        {model.todos.map(todo => (
          <TodoItem key={todo.id} todo={todo} dispatch={dispatch} />
        ))}
      </ul>
    )}

    <footer className="footer">
      <span>
        {remaining} item{remaining === 1 ? '' : 's'} left
      </span>
      <button
        className="button clear"
        type="button"
        onClick={() => dispatch(Message.ClearedCompleted())}
      >
        Clear completed
      </button>
    </footer>
  </main>
)

const TodoItem = ({ todo, dispatch }: { todo: Todo; dispatch: Dispatch }) => (
  <li className={todo.done ? 'todo done' : 'todo'}>
    <label className="todo-label">
      <input
        type="checkbox"
        checked={todo.done}
        onChange={() => dispatch(Message.ToggledTodo({ id: todo.id }))}
      />
      <span className="todo-text">{todo.text}</span>
    </label>
    <small className="id">#{todo.id}</small>
    <button
      className="button delete"
      type="button"
      aria-label={`Delete ${todo.text}`}
      onClick={() => dispatch(Message.DeletedTodo({ id: todo.id }))}
    >
      ×
    </button>
  </li>
)
