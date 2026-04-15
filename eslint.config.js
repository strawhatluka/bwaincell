const js = require('@eslint/js');
const typescript = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        process: true,
        module: true,
        require: true,
        __dirname: true,
        __filename: true,
        exports: true,
        console: true,
        Buffer: true,
        global: true,
        setTimeout: true,
        setInterval: true,
        clearTimeout: true,
        clearInterval: true,
        setImmediate: true,
        clearImmediate: true,
        NodeJS: true,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'warn',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: {
        process: true,
        module: true,
        require: true,
        __dirname: true,
        __filename: true,
        exports: true,
        console: true,
        Buffer: true,
        global: true,
        setTimeout: true,
        setInterval: true,
        clearTimeout: true,
        clearInterval: true,
        setImmediate: true,
        clearImmediate: true,
        NodeJS: true,
      },
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
    languageOptions: {
      globals: {
        jest: true,
        describe: true,
        it: true,
        test: true,
        expect: true,
        beforeEach: true,
        afterEach: true,
        beforeAll: true,
        afterAll: true,
      },
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/'],
  },
];
