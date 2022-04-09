/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    "/node_modules/"
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist"
  ]
};