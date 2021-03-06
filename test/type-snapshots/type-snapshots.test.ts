import * as fs from "fs"
import * as path from "path"
import { check, typingsTestDir } from "./typeChecker"

describe("Verify output of typings test files matches expected", async () => {
  const files = fs
    .readdirSync(typingsTestDir)
    .filter(it => it.endsWith(".ts"))
    .map(file => path.resolve(typingsTestDir, file))

  files.forEach(file =>
    it(`Verify output of typings test file ${path.basename(file)}`, async () => {
      const diagnostics = check(file)
      expect(diagnostics).toMatchSnapshot()
    })
  )
})
