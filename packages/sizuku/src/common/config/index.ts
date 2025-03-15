export type Config = {
  schema: {
    name: 'PascalCase' | 'camelCase'
  }
  type: {
    name: 'PascalCase' | 'camelCase'
    export: boolean
  }
  input?: string
  output?: string
  comment?: boolean
}

export const DEFAULT_CONFIG: Config = {
  schema: {
    name: 'PascalCase',
  },
  type: {
    name: 'PascalCase',
    export: false,
  },
  comment: false,
} as const
