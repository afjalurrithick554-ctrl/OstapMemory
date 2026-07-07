export type SpaceKind = 'default' | 'project'

export interface Space {
  id: string
  name: string
  kind: SpaceKind
  slug: string | null
  icon: string | null
  description: string | null
  removable: boolean
  hidden: boolean
  order: number
}

export interface CreateSpaceRequest {
  name: string
  icon?: string | null
  description?: string | null
}

export interface UpdateSpaceRequest {
  name?: string
  icon?: string | null
  order?: number
  description?: string | null
}
