// The only React <-> core glue: re-render whenever the store's model changes.
import { useSyncExternalStore } from 'react'
import type { Store } from '../core/store'

export const useModel = <Model, Message>(store: Store<Model, Message>): Model =>
  useSyncExternalStore(store.subscribe, store.getModel)
