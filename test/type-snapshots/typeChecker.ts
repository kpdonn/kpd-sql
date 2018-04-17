import * as fs from "fs"
import * as path from "path"
// tslint:disable-next-line:no-implicit-dependencies
import ts from "typescript"

export function check(fileName: string): any[] {
  const program = ts.createProgram([fileName], compilerOptions)
  const emitResult = program.emit()
  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

  const diagnosticsOutput = allDiagnostics.map(diagnostic => {
    if (diagnostic.file) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start!
      )
      const { innerMostMessage, messageChainCodes } = getInnerMostMessageAndCodes(
        diagnostic
      )
      return {
        file: path.basename(diagnostic.file.fileName),
        line: line + 1,
        character: character + 1,
        innerMostMessage,
        messageChainCodes,
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

function getInnerMostMessageAndCodes(
  diagnostic: ts.Diagnostic
): { innerMostMessage: string; messageChainCodes: number[] } {
  const messageChainCodes: number[] = []
  let currentMessage = diagnostic.messageText
  if (typeof currentMessage === "string") {
    return { innerMostMessage: currentMessage, messageChainCodes }
  }
  while (currentMessage.next) {
    messageChainCodes.push(currentMessage.code)
    currentMessage = currentMessage.next
  }
  return { innerMostMessage: currentMessage.messageText, messageChainCodes }
}

function readUtf8(fileName: string) {
  const contents = fs.readFileSync(fileName, "utf8")
  return contents
}

const parseConfigHost: ts.ParseConfigHost = {
  useCaseSensitiveFileNames: true,
  readDirectory(rootDir: string): string[] {
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
