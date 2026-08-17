import * as React from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { FileState } from '../../shared/wire/state.ts'
import { getFileState, getUniverStatus, startGateway } from '../api/univer-api.ts'

/** Poll collaboration state for a stable list of files. */
export function useUniverStates(files: readonly string[], sessionId: SessionId, intervalMs = 900): {
  readonly states: Readonly<Record<string, FileState>>
  readonly applyState: (state: FileState) => void
} {
  const [states, setStates] = React.useState<Record<string, FileState>>({})
  const key = files.join('\u0000')
  React.useEffect(() => {
    if (files.length === 0) {
      setStates({})
      return
    }
    let active = true
    const poll = async (): Promise<void> => {
      for (const file of files) {
        try {
          const state = await getFileState(file, sessionId)
          if (!active) return
          setStates((previous) => ({ ...previous, [file]: state }))
        } catch (error) {
          if (!active) return
        }
      }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), intervalMs)
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') void poll()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [key, sessionId, intervalMs])
  return {
    states,
    applyState: React.useCallback((state: FileState) => setStates((previous) => ({ ...previous, [state.file]: state })), []),
  }
}

/** Gateway state and start action used by preview surfaces. */
export function useGatewayStatus(): {
  readonly phase: 'checking' | 'stopped' | 'starting' | 'running' | 'failed'
  readonly start: () => Promise<void>
} {
  const [phase, setPhase] = React.useState<'checking' | 'stopped' | 'starting' | 'running' | 'failed'>('checking')
  React.useEffect(() => {
    let active = true
    void getUniverStatus().then((status) => {
      if (active) setPhase(status.gateway.phase)
    }).catch(() => {
      if (active) setPhase('failed')
    })
    return () => { active = false }
  }, [])
  const start = React.useCallback(async () => {
    setPhase('starting')
    try {
      const result = await startGateway()
      setPhase(result.ok ? 'running' : 'failed')
    } catch (error) {
      setPhase('failed')
    }
  }, [])
  return { phase, start }
}
