import type { ComponentType } from 'react'

/** Translation function bound to this plugin's locale namespace. */
export type Translate = (key: string) => string

/** Minimal DSH browser context used by this independently-built client module. */
export interface ClientContext {
  readonly conversationEvents: { register(definition: unknown): void }
  readonly locale: {
    register(namespace: string, dictionaries: { readonly zh: Record<string, string>; readonly en: Record<string, string> }): () => void
    bind(namespace: string): Translate
  }
  readonly slots: {
    inject(name: string, mount: () => unknown): () => void
    register(config: Record<string, unknown>, component: ComponentType<Record<string, unknown>>): unknown
  }
  effect(factory: () => (() => void) | unknown, label: string): void
}

/** Session snapshot fields consumed by the Univer dock. */
export interface SessionSnapshot {
  readonly running?: boolean
  readonly chat?: {
    readonly timeline?: {
      readonly turns?: Map<unknown, { readonly data?: Map<string, unknown> }>
    }
  }
}
