module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  transform: {
    '^.+\.[jt]s$': [
      '@swc/jest',
      { jsc: { target: 'es2022', parser: { syntax: 'typescript' } }, module: { type: 'commonjs' } },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!postgres/)'],
  setupFiles: ['<rootDir>/test/load-env.cjs'],
  maxWorkers: 1,
};
