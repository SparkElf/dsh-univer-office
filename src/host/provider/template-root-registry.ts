import { randomUUID } from 'node:crypto'
import { realpathSync } from 'node:fs'
import { copyFile, mkdir, realpath, rm } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import type { UniverTemplateRootRegistration } from '../service/types.ts'
import { UniverError } from '../service/errors.ts'
import { univerFilePath, type UniverFilePath, type WorkspacePath } from '../service/identifiers.ts'

export interface PreparedTemplateFile {
  readonly file: UniverFilePath
  cleanup(): Promise<void>
}

/** Owns trusted read-only template directories contributed by Host plugins. */
export class TemplateRootRegistry {
  private readonly roots = new Map<symbol, string>()

  register(registration: UniverTemplateRootRegistration): () => void {
    const token = Symbol()
    this.roots.set(token, realpathSync(registration.root))
    return () => {
      this.roots.delete(token)
    }
  }

  async prepare(workspace: WorkspacePath, value: UniverFilePath): Promise<PreparedTemplateFile> {
    const canonical = await realpath(value)
    if (isWithin(workspace, canonical)) {
      return { file: univerFilePath(canonical), cleanup: () => Promise.resolve() }
    }
    if (![...this.roots.values()].some((root) => isWithin(root, canonical))) {
      throw new UniverError(
        'template file is outside the session workspace and registered template roots',
        'SESSION_SCOPE_DENIED'
      )
    }
    const staged = join(workspace, '.dsh-univer-office', 'template-stage', `${randomUUID()}.univer`)
    await mkdir(dirname(staged), { recursive: true })
    await copyFile(canonical, staged)
    return {
      file: univerFilePath(staged),
      cleanup: () => rm(staged, { force: true })
    }
  }

  clear(): void {
    this.roots.clear()
  }
}

function isWithin(root: string, candidate: string): boolean {
  const child = relative(resolve(root), resolve(candidate))
  return child === '' || (child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child))
}
