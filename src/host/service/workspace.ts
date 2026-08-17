import { realpath } from 'node:fs/promises'
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path'
import { UniverError } from './errors.ts'
import { univerFilePath, workspacePath, type UniverFilePath, type WorkspacePath } from './identifiers.ts'

/** One workspace-authorized path resolved for a service request. */
export interface AuthorizedPath {
  readonly workspace: WorkspacePath
  readonly path: string
}

/** Resolve an existing `.univer` file inside one workspace. */
export async function resolveExistingUniverPath(cwd: string, value: string): Promise<AuthorizedPath & { readonly path: UniverFilePath }> {
  const resolved = await resolveAuthorizedPath(cwd, value, true)
  requireUniverExtension(resolved.path)
  return { ...resolved, path: univerFilePath(resolved.path) }
}

/** Resolve a new `.univer` target inside one workspace without requiring it to exist. */
export async function resolveNewUniverPath(cwd: string, value: string): Promise<AuthorizedPath & { readonly path: UniverFilePath }> {
  const resolved = await resolveAuthorizedPath(cwd, value, false)
  requireUniverExtension(resolved.path)
  return { ...resolved, path: univerFilePath(resolved.path) }
}

/** Resolve an existing import source inside one workspace. */
export function resolveExistingWorkspacePath(cwd: string, value: string): Promise<AuthorizedPath> {
  return resolveAuthorizedPath(cwd, value, true)
}

/** Resolve an output target inside one workspace without requiring it to exist. */
export function resolveNewWorkspacePath(cwd: string, value: string): Promise<AuthorizedPath> {
  return resolveAuthorizedPath(cwd, value, false)
}

/** Revalidate a branded service request at the provider boundary. */
export async function assertAuthorizedPath(
  workspace: WorkspacePath,
  value: string,
  mustExist: boolean,
): Promise<void> {
  const resolved = await resolveAuthorizedPath(workspace, value, mustExist)
  if (resolved.workspace !== workspace || resolved.path !== value) {
    throw new UniverError('path changed after workspace authorization', 'SESSION_SCOPE_DENIED')
  }
}

async function resolveAuthorizedPath(cwd: string, value: string, mustExist: boolean): Promise<AuthorizedPath> {
  if (value.trim().length === 0) throw new UniverError('path is required', 'INVALID_FILE_PATH')
  let workspace: string
  try {
    workspace = await realpath(cwd)
  } catch (error) {
    throw new UniverError('session workspace does not exist', 'SESSION_SCOPE_UNAVAILABLE', { cause: error })
  }
  const candidate = isAbsolute(value) ? resolve(value) : resolve(workspace, value)
  let canonical: string
  try {
    canonical = mustExist ? await realpath(candidate) : await canonicalizePotentialPath(candidate)
  } catch (error) {
    throw new UniverError(mustExist ? 'path does not exist' : 'path cannot be resolved', 'INVALID_FILE_PATH', { cause: error })
  }
  const fromWorkspace = relative(workspace, canonical)
  if (fromWorkspace === '..' || fromWorkspace.startsWith(`..${sep}`) || isAbsolute(fromWorkspace)) {
    throw new UniverError('path is outside the session workspace', 'SESSION_SCOPE_DENIED')
  }
  return { workspace: workspacePath(workspace), path: canonical }
}

async function canonicalizePotentialPath(candidate: string): Promise<string> {
  let ancestor = candidate
  for (;;) {
    try {
      const canonicalAncestor = await realpath(ancestor)
      return resolve(canonicalAncestor, relative(ancestor, candidate))
    } catch {
      const parent = dirname(ancestor)
      if (parent === ancestor) throw new Error(`no existing ancestor for ${candidate}`)
      ancestor = parent
    }
  }
}

function requireUniverExtension(value: string): void {
  if (extname(value).toLowerCase() !== '.univer') {
    throw new UniverError('Univer file path must end in .univer.', 'INVALID_FILE_PATH')
  }
}
