import { SqlPart, LookupParamNum, SqlPlugin } from "./everything"
import { Pool } from "pg"

export class PgPlugin implements SqlPlugin {
  static init(pool: Pool): PgPlugin {
    return new PgPlugin(pool)
  }

  private constructor(private readonly pool: Pool) {}

  printSql(part: SqlPart, lpn: LookupParamNum): string {
    const result = this._buildSql(part, lpn)
    return result[0]
  }

  async execute(part: SqlPart, lpn: LookupParamNum, args: object = {}): Promise<any> {
    const [sql, vals] = this._buildSql(part, lpn, args)

    const results = await this.pool.query(sql, vals)
    return results.rows
  }

  private _buildSql(part: SqlPart, lpn: LookupParamNum, args: any = {}): [string, any[]] {
    const paramVals: any[] = []
    const pr = (it: SqlPart): string => {
      switch (it.sqlKind) {
        case "plainJoin":
          return `JOIN ${pr(it.joinTable)} ON ${pr(it.onCondition)}`
        case "leftJoin":
          return `LEFT JOIN ${pr(it.joinTable)} ON ${pr(it.onCondition)}`
        case "table":
          if (it._table === it._tableAs) {
            return `${it._table}`
          } else {
            return `${it._table} ${it._tableAs}`
          }
        case "hardcoded": {
          const paramIndex = lpn(it)
          paramVals[paramIndex] = it.value
          return `$${paramIndex + 1}`
        }
        case "placeholderParam": {
          const paramIndex = lpn(it)
          paramVals[paramIndex] = args[it.sqlParam]
          return `$${paramIndex + 1}`
        }
        case "and":
          return `(${pr(it.left)}) AND (${pr(it.right)})`
        case "or":
          return `(${pr(it.left)}) OR (${pr(it.right)})`
        case "column":
          return `${it._tableAs}.${it._column}`
        case "columnDeclaration":
          return `${pr(it.col)} as "${it.col._columnAs}"`
        case "eq":
          return `${pr(it.left)} = ${pr(it.right)}`
        case "selectStatement":
          const columnsSql = it.columns.map(pr).join(",\n")
          const fromSql = it.fromTables.map(pr).join(",\n")
          const joinSql = it.joins.map(pr).join("\n")
          const whereSql = it.where ? `WHERE ${pr(it.where)}` : ""
          return ["SELECT", columnsSql, "FROM", fromSql, joinSql, whereSql].join("\n")
      }
    }
    const sqlString = pr(part)
    return [sqlString, paramVals]
  }
}
