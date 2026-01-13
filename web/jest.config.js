/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        module: 'commonjs',
        moduleResolution: 'node',
        target: 'ES2017',
        strict: true,
        skipLibCheck: true,
        resolveJsonModule: true,
      },
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    '!src/**/*.d.ts',
  ],
  testTimeout: 10000,
  // Mock @solana/web3.js and @coral-xyz/anchor for unit tests
  transformIgnorePatterns: [
    '/node_modules/(?!(@solana|@coral-xyz)/)',
  ],
};
