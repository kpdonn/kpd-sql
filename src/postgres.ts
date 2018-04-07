import { SqlPart, LookupParamNum } from "./everything"

export function printSql(sqlPart: SqlPart, pNum: LookupParamNum): string {
  const pr = (it: SqlPart): string => {
    switch (it.sqlKind) {
      case "plainJoin":
        return `join ${pr(it.joinTable)} on ${pr(it.onCondition)}`
      case "leftJoin":
        return `left join ${pr(it.joinTable)} on ${pr(it.onCondition)}`
      case "table":
        return `${it._table} ${it._tableAs}`
      case "hardcoded":
      case "placeholderParam":
        return `$${pNum(it) + 1}`
      case "and":
        return `(${pr(it.left)}) AND (${pr(it.right)})`
      case "or":
        return `(${pr(it.left)}) OR (${pr(it.right)})`
      case "column":
        return `${it._tableAs}.${it._column}`
      case "columnDeclaration":
        return `${pr(it.col)} as ${it.col._columnAs}`
      case "eq":
        return `${pr(it.left)} = ${pr(it.right)}`
      case "selectStatement":
        const columnsSql = it.columns.map(pr).join(", ")
        const fromSql = it.fromTables.map(pr).join(", ")
        const joinSql = it.joins.map(pr).join("\n")
        const whereSql = it.where ? `WHERE ${pr(it.where)}` : ""
        return `SELECT ${columnsSql} FROM ${fromSql} ${joinSql} ${whereSql}`
    }
  }
  return pr(sqlPart)
}
