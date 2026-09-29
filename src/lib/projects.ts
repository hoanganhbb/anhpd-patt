import type { Project, Ref } from '@/services/types'

import { normalize } from './text'

export const DEFAULT_CATEGORY = 'Tùy biến chức năng'

// Prefer "Tùy biến chức năng" (any accent spelling), otherwise the project's first category.
export const defaultCategory = (categories: Ref[]) =>
  categories.find(c => normalize(c.name) === normalize(DEFAULT_CATEGORY))?.name ??
  categories[0]?.name ??
  ''

// Mantis lists a sub-project twice: nested under its parent as a stub ({ id, name } only)
// and again at the top level with full data (categories, subProjects...). Prefer the full one.
const findProject = (projects: Project[], id: string): Project | undefined => {
  let stub: Project | undefined
  const walk = (list: Project[]): Project | undefined => {
    for (const p of list) {
      if (String(p.id) === id) {
        if (p.categories) return p
        stub ??= p
      }
      const found = walk(p.subProjects ?? [])
      if (found) return found
    }
  }
  return walk(projects) ?? stub
}

export const findProjectById = findProject

export interface ProjectOption {
  id: string
  name: string
  depth: number
  path: string
}

// Depth-first flat list ("Cha / Con" paths), keeping the first occurrence of each id since
// sub-projects may also be listed at top level.
export const flattenProjects = (projects: Project[]): ProjectOption[] => {
  const seen = new Set<string>()
  const walk = (list: Project[], depth: number, parent: string): ProjectOption[] =>
    list.flatMap(p => {
      const path = parent ? `${parent} / ${p.name}` : p.name
      return [
        { id: String(p.id), name: p.name, depth, path },
        ...walk(p.subProjects ?? [], depth + 1, path)
      ]
    })
  return walk(projects, 0, '').filter(o => !seen.has(o.id) && seen.add(o.id))
}

// The project itself plus all of its sub-projects (resolving nested stubs to their full entry).
export const projectWithChildrenIds = (projects: Project[], id: string) => {
  const ids = new Set<string>()
  const walk = (p?: Project) => {
    if (!p || ids.has(String(p.id))) return
    ids.add(String(p.id))
    p.subProjects?.forEach(child => walk(findProject(projects, String(child.id)) ?? child))
  }
  walk(findProject(projects, id))
  return ids
}
