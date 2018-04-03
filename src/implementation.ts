import { SQLFrom, SQLJoin } from "./kpdSql"

import * as Immutable from "immutable"
import { Pool } from "pg"
import { Condition, TableWithColumns } from "./utils"
import { Column } from "./table"

let dbPool: Pool

export function initializePool(pool: Pool): void {
  dbPool = pool
}

interface Join {
  type: "inner" | "left"
  table: TableWithColumns
  cond: Condition<any>
}

const BuilderState = Immutable.Record({
  fromTable: (undefined as any) as TableWithColumns,
  joins: Immutable.List<Join>(),
  columns: Immutable.List(),
  wheres: Immutable.List(),
})
class SqlBuilder {
  constructor(private readonly state = BuilderState()) {}

  from(table: TableWithColumns): SqlBuilder {
    let newState = this.state.withMutations(arg => {
      arg.set("fromTable", table)
    })

    return new SqlBuilder(newState)
  }

  join(table: TableWithColumns, cond: Condition<any>): SqlBuilder {
    return this.addJoin("inner", table, cond)
  }

  leftJoin(table: TableWithColumns, cond: Condition<any>): SqlBuilder {
    return this.addJoin("left", table, cond)
  }

  addJoin(
    type: "inner" | "left",
    table: TableWithColumns,
    cond: Condition<any>
  ): SqlBuilder {
    const newState = this.state.updateIn(["joins"], joins =>
      joins.push({ type, table, cond })
    )

    return new SqlBuilder(newState)
  }

  columns(cols: Column[]): SqlBuilder {
    const newState = this.state.updateIn(["columns"], stateCols =>
      stateCols.withMutations((mut: any) => {
        cols.forEach(col => mut.push(col))
      })
    )
    return new SqlBuilder(newState)
  }

  where(cond: Condition<any>): SqlBuilder {
    const newState = this.state.updateIn(["wheres"], wheres => wheres.push({ cond }))

    return new SqlBuilder(newState)
  }

  toSql(): string {
    let sql = "Select "
    const state = this.state
    const selectCols = state.columns.map(col => col.toSql()).join(", ")

    sql += selectCols + " \n"

    const fromClause = ` from ${state.fromTable} `

    sql += fromClause

    state.joins.forEach(join => {
      sql += " \n "
      const onClause = ` on ${join.cond.toSql()} `
      sql += ` ${join.type} join ${join.table} ${onClause} `
    })

    sql += "\n where "

    state.wheres.forEach(where => {
      sql += ` ${where.cond.toSql()} `
    })

    return sql
  }

  execute(): Promise<any> {
    const sql = this.toSql()

    const result = dbPool.query(sql).then(res => res.rows)

    return result
  }
}

export function select(): SQLFrom {
  return new SqlBuilder() as any
}

export function tuple<T extends any[] & { "0": any }>(array: T): T {
  return array
}
