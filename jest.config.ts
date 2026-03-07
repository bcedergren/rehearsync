import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          jsx: "react-jsx",
          esModuleInterop: true,
          paths: { "@/*": ["./src/*"] },
        },
      },
    ],
  },
  clearMocks: true,
  collectCoverageFrom: [
    "src/lib/services/**/*.ts",
    "src/lib/validators/**/*.ts",
    "src/lib/api/errors.ts",
    "src/lib/api/response.ts",
    "src/lib/local-storage.ts",
  ],
};

export default config;
