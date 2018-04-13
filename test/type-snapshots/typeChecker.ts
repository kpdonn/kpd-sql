import ts from "typescript"
import * as path from "path"
import * as fs from "fs"

export function check(fileName: string): any[] {
  const program = ts.createProgram([fileName], compilerOptions)
  const emitResult = program.emit()
  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

  const diagnosticsOutput = allDiagnostics.map(diagnostic => {
    if (diagnostic.file) {
      let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start!
      )
      let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
      return {
        file: path.basename(diagnostic.file.fileName),
        line: line + 1,
        character: character + 1,
        message,
        code: diagnostic.code,
        category: diagnostic.category,
      }
    } else {
      return {
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        code: diagnostic.code,
        category: diagnostic.category,
      }
    }
  })

  return diagnosticsOutput
}

function readUtf8(fileName: string) {
  const contents = fs.readFileSync(fileName, "utf8")
  return contents
}

const parseConfigHost: ts.ParseConfigHost = {
  useCaseSensitiveFileNames: true,
  readDirectory(
    rootDir: string,
    extensions: ReadonlyArray<string>,
    excludes: ReadonlyArray<string> | undefined,
    includes: ReadonlyArray<string>,
    depth?: number
  ): string[] {
    return fs.readdirSync(rootDir)
  },

  fileExists(path: string): boolean {
    return fs.existsSync(path)
  },
  readFile(path: string): string | undefined {
    return readUtf8(path)
  },
}

export const typingsTestDir = path.resolve(__dirname, "..", "..", "typings-tests")
const tsConfigFile = path.resolve(typingsTestDir, "tsconfig.json")

const jsonSourceFile = ts.readJsonConfigFile(tsConfigFile, readUtf8)

const { options: compilerOptions } = ts.parseJsonSourceFileConfigFileContent(
  jsonSourceFile,
  parseConfigHost,
  typingsTestDir
)

function shouldPrintNodeType(node: ts.Node, fileName: string): boolean {
  return (
    (node.kind === ts.SyntaxKind.Identifier ||
      (node.kind >= ts.SyntaxKind.ArrayLiteralExpression &&
        node.kind <= ts.SyntaxKind.NonNullExpression) ||
      (node.kind >= ts.SyntaxKind.VariableDeclaration &&
        node.kind <= ts.SyntaxKind.EnumDeclaration)) &&
    fileName === node.getSourceFile().fileName
  )
}
