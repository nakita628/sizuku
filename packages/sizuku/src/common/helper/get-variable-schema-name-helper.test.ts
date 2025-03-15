import { describe, expect, it } from 'vitest'
import type { Config } from '../config'
import { getVariableSchemaNameHelper } from './get-variable-schema-name-helper'

const camelCaseConfig: Config = {
  schema: {
    name: 'camelCase',
  },
  type: {
    name: 'camelCase',
    export: true,
  },
}

const pascalCaseConfig: Config = {
  schema: {
    name: 'PascalCase',
  },
  type: {
    name: 'PascalCase',
    export: true,
  },
}

const getVariableSchemaNameHelperTestCases = [
  {
    name: 'User',
    config: camelCaseConfig,
    expected: 'userSchema',
  },
  {
    name: 'Post',
    config: pascalCaseConfig,
    expected: 'PostSchema',
  },
]

describe('getVariableSchemaNameHelper', () => {
  it.concurrent.each(getVariableSchemaNameHelperTestCases)(
    'getVariableSchemaNameHelper($name, $config) -> $expected',
    ({ name, config, expected }) => {
      const result = getVariableSchemaNameHelper(name, config)
      expect(result).toBe(expected)
    },
  )
})
