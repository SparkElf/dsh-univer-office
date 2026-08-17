import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import {
  BUNDLED_SKILL_RANK,
  type SkillCandidate,
  type SkillDefinition,
  type SkillProvider,
} from '@deepseek-ai/dsh-skill'

const PROVIDER_NAME = 'univer'
const INVOCATION = { modelInvocable: true, userInvocable: true } as const
const DEFINITIONS = [
  {
    name: 'univer',
    description: 'Create, inspect, edit, import, export, and hand off multi-Unit .univer files with isolated worktrees and version-matched Facade API lookup. Use for any Univer file task before loading a Unit-specific skill.',
  },
  {
    name: 'univer-sheet',
    description: 'Read, write, format, calculate, and structurally verify Univer Sheet Units. Use for spreadsheet values, formulas, ranges, tables, formatting, and Sheet export.',
  },
  {
    name: 'univer-doc',
    description: 'Create, edit, inspect, and structurally verify Univer Doc Units. Use for paragraphs, rich text, tables, images, charts, and document export.',
  },
  {
    name: 'univer-slide',
    description: 'Create, edit, inspect, and structurally verify Univer Slide Units. Use for presentations, pages, shapes, text, images, tables, charts, and slide export.',
  },
  {
    name: 'univer-base',
    description: 'Create, edit, inspect, and structurally verify Univer Base Units. Use for Base tables, fields, records, views, and formulas.',
  },
  {
    name: 'univer-board',
    description: 'Create, edit, inspect, and structurally verify Univer Board Units. Use for canvas shapes, connectors, images, charts, and layout.',
  },
] as const

const CANDIDATES: readonly SkillCandidate[] = DEFINITIONS.map((definition) => {
  const url = new URL(`../skills/${definition.name}/SKILL.md`, import.meta.url)
  return {
    ...definition,
    invocation: INVOCATION,
    provider: PROVIDER_NAME,
    source: 'bundled',
    resourceBase: { kind: 'directory', path: fileURLToPath(new URL(`../skills/${definition.name}/`, import.meta.url)) },
    rank: BUNDLED_SKILL_RANK,
    locator: url,
  }
})

const provider: SkillProvider = {
  name: PROVIDER_NAME,
  list: () => Promise.resolve(CANDIDATES),
  async get(candidate): Promise<SkillDefinition> {
    if (!(candidate.locator instanceof URL)) throw new Error('univer skill locator must be a URL')
    return {
      name: candidate.name,
      description: candidate.description,
      invocation: candidate.invocation,
      provider: candidate.provider,
      source: candidate.source,
      ...candidate.resourceBase === undefined ? {} : { resourceBase: candidate.resourceBase },
      content: stripFrontmatter(await readFile(candidate.locator, 'utf8')),
    }
  },
}

export const name = 'univer-skills'
export const inject = ['skills']

/** Register version-matched Univer instructions on the DSH skill seam. */
export function apply(ctx: Context): void {
  ctx.skills.registerProvider(() => provider)
}

function stripFrontmatter(value: string): string {
  if (!value.startsWith('---\n')) return value
  const end = value.indexOf('\n---\n', 4)
  return end === -1 ? value : value.slice(end + 5)
}
