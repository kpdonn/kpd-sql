import ts, { VariableDeclarationList } from "typescript"
import * as path from "path"
import * as fs from "fs"

export function check(fileName: string): [any[], ts.Diagnostic[]] {
  const program = ts.createProgram([fileName], compilerOptions)
  const emitResult = program.emit()
  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

  // Get the checker, we will use it to find more about classes
  const checker = program.getTypeChecker()

  const output: any[] = []

  const symbolSeenSet = new Set<ts.Symbol>()

  // Visit every sourceFile in the program
  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      // Walk the tree to search for classes
      ts.forEachChild(sourceFile, visit)
    }
  }

  return [output, allDiagnostics]

  function visit(node: ts.Node) {
    let symbol = checker.getSymbolAtLocation(node)

    if (shouldPrintNodeType(node, fileName) && symbol && !symbolSeenSet.has(symbol)) {
      symbolSeenSet.add(symbol)
      output.push(nodeTypeInfo(node, symbol))
    }
    ts.forEachChild(node, visit)
  }

  function nodeTypeInfo(node: ts.Node, symbol?: ts.Symbol) {
    const typeAtLocationString = checker.typeToString(
      checker.getTypeAtLocation(node),
      node.parent,
      ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.AllowUniqueESSymbolType
    )

    const symbolFormatFlags =
      ts.SymbolFormatFlags.WriteTypeParametersOrArguments |
      ts.SymbolFormatFlags.AllowAnyNodeKind
    const symbolString = symbol
      ? checker.symbolToString(symbol, node.parent, symbolFormatFlags)
      : symbol

    return {
      symbol: symbolString,
      type: typeAtLocationString,
      nodeKind: node.kind,
    }
  }
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
  if (
    node.kind === ts.SyntaxKind.VariableDeclarationList &&
    (node as VariableDeclarationList).declarations.length <= 1
  ) {
    return false
  }
  return (
    (node.kind === ts.SyntaxKind.Identifier ||
      (node.kind >= ts.SyntaxKind.ArrayLiteralExpression &&
        node.kind <= ts.SyntaxKind.NonNullExpression) ||
      (node.kind >= ts.SyntaxKind.VariableDeclaration &&
        node.kind <= ts.SyntaxKind.EnumDeclaration)) &&
    fileName === node.getSourceFile().fileName
  )
}
