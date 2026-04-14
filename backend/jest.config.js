module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests',
    '<rootDir>/commands',
    '<rootDir>/../supabase',
    '<rootDir>/utils',
  ],
  testMatch: ['**/*.test.ts', '**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'commands/**/*.ts',
    '../supabase/**/*.ts',
    'utils/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/*.test.ts',
    '!tests/**',
  ],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@database/(.*)$': '<rootDir>/../supabase/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@commands/(.*)$': '<rootDir>/commands/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@types/(.*)$': '<rootDir>/types/$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 0, // TODO: Increase to 80% as coverage improves
      functions: 0, // TODO: Increase to 80% as coverage improves
      lines: 0, // TODO: Increase to 80% as coverage improves
      statements: 0, // TODO: Increase to 80% as coverage improves
    },
  },
  testTimeout: 10000,
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowJs: true,
          moduleResolution: 'node',
          isolatedModules: true,
        },
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(@octokit)/)'],
};
