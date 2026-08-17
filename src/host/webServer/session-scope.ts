import { realpath } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { SessionId, type SessionStore } from '@deepseek-ai/dsh-session'
import { UniverError } from '../service/errors.ts'
import { resolveUniverFile } from '../provider/unit-content-operations.ts'

/** Resolve a browser file only when it belongs to the addressed live session. */
export async function resolveAuthorizedFile(value: unknown, sessionId: unknown, sessions: SessionStore) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new UniverError('file is required', 'INVALID_REQUEST')
  }
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    throw new UniverError('sessionId is required', 'INVALID_REQUEST')
  }
  const cwd = sessions.get(SessionId(sessionId))?.header.cwd
  if (cwd === undefined) throw new UniverError('session is unavailable or has no workspace', 'SESSION_SCOPE_UNAVAILABLE')
  const candidate = isAbsolute(value) ? value : resolve(cwd, value)
  let workspace: string
  let file: string
  try {
    ;[workspace, file] = await Promise.all([realpath(cwd), realpath(candidate)])
  } catch (error) {
    throw new UniverError('file or session workspace does not exist', 'INVALID_FILE_PATH', { cause: error })
  }
  const fromWorkspace = relative(workspace, file)
  if (fromWorkspace === '..' || fromWorkspace.startsWith(`..${sep}`) || isAbsolute(fromWorkspace)) {
    throw new UniverError('file is outside the session workspace', 'SESSION_SCOPE_DENIED')
  }
  return resolveUniverFile(file)
}
