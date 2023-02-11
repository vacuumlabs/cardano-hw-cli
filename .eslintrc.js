// copied from https://github.com/vacuumlabs/nufi and adjusted
module.exports = {
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
    'vacuumlabs',
    'prettier',
  ],
  env: {
    "es6": true,
    "node": true,
    "mocha": true
  },
  rules: {
    '@typescript-eslint/no-explicit-any': [
      'error',
      {
        ignoreRestArgs: true,
      },
    ],
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',

    // https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-use-before-define.md#how-to-use
    // note you must disable the base rule as it can report incorrect errors
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error'],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
    // Why detect cycles: https://spin.atomicobject.com/2018/06/25/circular-dependencies-javascript
    // TLDR - memory crashes, tangled architecture, unreadable code, undefined imports
    'import/no-cycle': [
      'error',
    ],
    'import/no-extraneous-dependencies': ['error'],
    'spaced-comment': ['error', 'always', {block: {balanced: true}}],
    'quote-props': ['error', 'consistent'],
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    createDefaultProgram: true,
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
      },
    },
  },
  plugins: ['import'],
}
