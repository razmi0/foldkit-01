// Wiring: create the core store, then mount the React view on it.
import { Schema } from 'effect'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { makeStore } from './core/store'
import { Model, todoProgram } from './core/todo'
import './styles/todo.css' // scoped by vite-addons/css-scoping.ts
import { TodoApp } from './view/TodoApp'

const store = makeStore(todoProgram, {
  // Dev only: log every transition and check the new model against its Schema.
  onTransition: import.meta.env.DEV
    ? (message, previous, next) => {
        Schema.asserts(Model, next)
        console.groupCollapsed(`[todo] ${message._tag}`)
        console.log('message', message)
        console.log('previous', previous)
        console.log('next', next)
        console.groupEnd()
      }
    : undefined,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TodoApp store={store} />
  </StrictMode>,
)

// Stop running commands when Vite hot-replaces this module.
import.meta.hot?.dispose(() => store.dispose())
