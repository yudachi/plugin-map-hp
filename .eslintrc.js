module.exports = {
  'env': {
    'browser': true,
    'es6': true,
    'node': true,
  },
  'extends': [
    "airbnb",
  ],
  'parser': 'babel-eslint',
  'plugins': [
    'import',
    'react',
  ],
  'globals': {
    'html2canvas': false,
    'config': true,
  },
  'rules': {
		'semi': ['error', 'never'],
		'import/no-unresolved': [2, { 'ignore': ['views/.*'] }],
    'react/jsx-filename-extension': 'off',
    'no-underscore-dangle': ['error', { 'allowAfterThis': true }],
    'import/extensions': ['error', { 'es': 'never' }],
    'import/no-extraneous-dependencies': 'off',
    'comma-dangle': ['error', 'always-multiline'],
    'no-confusing-arrow': ['error', {'allowParens': true}],
  },
  'settings': {
    'import/resolver': {
      'node': {
        'extensions': ['.js', '.jsx', '.es'],
        'paths': [__dirname],
      },
    },
    'import/core-modules': [
      'bluebird',
      'electron',
      'react',
      'react-redux',
      'redux-observers',
      'reselect',
      'react-bootstrap',
      'react-fontawesome',
      'path-extra',
      'fs-extra',
      'lodash',
      'cson',
      'react-dom',
      'redux',
      'semver',
    ],
  },
}
