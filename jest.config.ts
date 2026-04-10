import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      { tsconfig: "tsconfig.json", diagnostics: { ignoreCodes: [151002] } },
    ],
  },
  moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" },
  collectCoverageFrom: ["**/*.ts", "!**/dto/**", "!main.ts"],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
};

export default config;
