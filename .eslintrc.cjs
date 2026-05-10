module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
  overrides: [
    {
      files: ['**/*.test.{js,jsx}', 'src/test/**/*.{js,jsx}'],
      env: { node: true, browser: true },
      globals: { vi: 'readonly' },
      rules: {
        'no-unused-vars': ['error', { argsIgnorePattern: '^_|^(key|value|prefix)$' }],
      },
    },
  ],
}
