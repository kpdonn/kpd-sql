import { spawnSync } from "child_process"

const tscOptions = [
  "configs/definitions.d.ts",
  "--noEmit",
  "--experimentalDecorators",
  "--moduleResolution",
  "node",
  "--target",
  "es5",
  "--module",
  "es2015",
  "--lib",
  "es2015,dom,es7",
  "--strict",
  "--noUnusedLocals",
  "false",
  "--skipLibCheck",
  "--allowSyntheticDefaultImports",
  "--noErrorTruncation",
]

it("Verify output of no-errors matches expected", () => {
  const { stdout, stderr, status } = spawnSync("node_modules/typescript/bin/tsc", [
    "typings-tests/no-errors.ts",
    ...tscOptions,
  ])

  expect(stdout.toString()).toMatchSnapshot()
  expect(stderr.toString()).toMatchSnapshot()
  expect(status).toBe(0)
})
