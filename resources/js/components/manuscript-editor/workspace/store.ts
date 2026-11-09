import { useSyncExternalStore } from 'react';

/**
 * A tiny external store. The editor page keeps fast-changing state (save
 * status, check issues, the focused editor) here, so only the components
 * that show it re-render, never the editors.
 */
export type Store<T> = {
    get: () => T;
    set: (next: T | ((previous: T) => T)) => void;
    subscribe: (listener: () => void) => () => void;
};

export function createStore<T>(initial: T): Store<T> {
    let value = initial;
    const listeners = new Set<() => void>();

    return {
        get: () => value,
        set: (next) => {
            const resolved =
                typeof next === 'function'
                    ? (next as (previous: T) => T)(value)
                    : next;

            if (!Object.is(resolved, value)) {
                value = resolved;
                listeners.forEach((listener) => listener());
            }
        },
        subscribe: (listener) => {
            listeners.add(listener);

            return () => listeners.delete(listener);
        },
    };
}

export function useStore<T>(store: Store<T>): T {
    return useSyncExternalStore(store.subscribe, store.get, store.get);
}
