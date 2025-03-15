import type { Config } from '../config'
import { describe, expect, it } from 'vitest'
import { getVariableNameHelper } from './get-variable-name-helper'

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

const getVariableNameHelperTestCases = [
  {
    name: 'User',
    config: camelCaseConfig,
    expected: 'user',
  },
  {
    name: 'Post',
    config: pascalCaseConfig,
    expected: 'Post',
  },
]

describe('getVariableNameHelper', () => {
  it.concurrent.each(getVariableNameHelperTestCases)(
    'getVariableNameHelper($name, $config) -> $expected',
    ({ name, config, expected }) => {
      const result = getVariableNameHelper(name, config)
      expect(result).toBe(expected)
    },
  )
})
