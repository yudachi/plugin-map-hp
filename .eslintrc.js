module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: ['airbnb', 'prettier', 'prettier/react', 'poi-plugin'],
  parser: 'babel-eslint',
  plugins: ['import', 'react', 'prettier'],
  rules: {
    semi: ['error', 'never'],
    'import/no-unresolved': [2, { ignore: ['views/.*'] }],
    'react/jsx-filename-extension': 'off',
    'no-underscore-dangle': ['error', { allowAfterThis: true }],
    'import/extensions': ['error', { es: 'never' }],
    'import/no-extraneous-dependencies': 'off',
    'comma-dangle': ['error', 'always-multiline'],
    'no-confusing-arrow': ['error', { allowParens: true }],
    'prettier/prettier': 'error',
    'react/static-property-placement': 'off',
    'react/state-in-constructor': 'off',
  },
}
