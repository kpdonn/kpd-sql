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

  async execute(
    part: SqlPart,
    lpn: LookupParamNum,
    paramArgs: object = {}
  ): Promise<any> {
    const [sql, vals] = this._buildSql(part, lpn, paramArgs)

    const results = await this.pool.query(sql, vals)
    return results.rows
  }

  private _buildSql(
    part: SqlPart,
    lpn: LookupParamNum,
    paramArgs: any = {}
  ): [string, any[]] {
    const paramVals: any[] = []
    const thisVal = { paramVals, lpn, paramArgs, pr: this.print }
    const sqlString = this.print.call(thisVal, part)
    return [sqlString, paramVals]
  }

  private print: PrintFunc = function(it) {
    switch (it.sqlKind) {
      case "plainJoin":
        return `JOIN ${this.pr(it.joinTable)} ON ${this.pr(it.onCondition)}`
      case "leftJoin":
        return `LEFT JOIN ${this.pr(it.joinTable)} ON ${this.pr(it.onCondition)}`
      case "table":
        if (it._table === it._tableAs) {
          return `${it._table}`
        } else {
          return `${it._table} ${it._tableAs}`
        }
      case "hardcoded": {
        const paramIndex = this.lpn(it)
        this.paramVals[paramIndex] = it.value
        return `$${paramIndex + 1}`
      }
      case "placeholderParam": {
        const paramIndex = this.lpn(it)
        this.paramVals[paramIndex] = this.paramArgs[it.sqlParam]
        return `$${paramIndex + 1}`
      }
      case "not":
        return `NOT (${this.pr(it.target)})`
      case "and":
        return `(${this.pr(it.left)}) AND (${this.pr(it.right)})`
      case "or":
        return `(${this.pr(it.left)}) OR (${this.pr(it.right)})`
      case "column":
        return `${it._tableAs}.${it._column}`
      case "columnDeclaration":
        return `${this.pr(it.col)} as "${it.col._columnAs}"`
      case "eq":
        return `${this.pr(it.left)} = ${this.pr(it.right)}`
      case "inCondition":
        return `${this.pr(it.left)} = ANY (${this.pr(it.right)})`

      case "selectStatement":
        const columnsSql = it.selColumns.map(x => this.pr(x)).join(",\n")
        const fromSql = it.selFromTables.map(x => this.pr(x)).join(",\n")
        const joinSql = it.selJoins.map(x => this.pr(x)).join("\n")
        const whereSql = it.selWhere ? `WHERE ${this.pr(it.selWhere)}` : ""
        return ["SELECT", columnsSql, "FROM", fromSql, joinSql, whereSql].join("\n")
    }
  }
}

interface PrintFunc {
  (
    this: { pr: PrintFunc; lpn: LookupParamNum; paramVals: any[]; paramArgs: any },
    it: SqlPart
  ): string
}
