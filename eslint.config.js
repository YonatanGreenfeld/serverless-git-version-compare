const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const globals = require('globals');

module.exports = [
  eslintPluginPrettierRecommended,
  {
    files: ['**/*.js'],
    ignores: ['node_modules/', 'dist/'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.node,
      },
    },
  },
];
