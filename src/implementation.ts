import * as Immutable from "immutable"
import { Pool } from "pg"
import { TableWithColumns } from "./utils"
import { Column } from "./table"
import { Condition } from "./condition"
import { SqlBuilder } from "./kpdSql"

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
class SqlBuilderImpl {
  constructor(private readonly state = BuilderState()) {}

  from(table: TableWithColumns): SqlBuilderImpl {
    let newState = this.state.withMutations(arg => {
      arg.set("fromTable", table)
    })

    return new SqlBuilderImpl(newState)
  }

  join(table: TableWithColumns, cond: Condition<any>): SqlBuilderImpl {
    return this.addJoin("inner", table, cond)
  }

  leftJoin(table: TableWithColumns, cond: Condition<any>): SqlBuilderImpl {
    return this.addJoin("left", table, cond)
  }

  addJoin(
    type: "inner" | "left",
    table: TableWithColumns,
    cond: Condition<any>
  ): SqlBuilderImpl {
    const newState = this.state.updateIn(["joins"], joins =>
      joins.push({ type, table, cond })
    )

    return new SqlBuilderImpl(newState)
  }

  columns(cols: Column[]): SqlBuilderImpl {
    const newState = this.state.updateIn(["columns"], stateCols =>
      stateCols.withMutations((mut: any) => {
        cols.forEach(col => mut.push(col))
      })
    )
    return new SqlBuilderImpl(newState)
  }

  where(cond: Condition<any>): SqlBuilderImpl {
    const newState = this.state.updateIn(["wheres"], wheres => wheres.push({ cond }))

    return new SqlBuilderImpl(newState)
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
      const onClause = ` on ${join.cond} `
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

export function select(): SqlBuilder {
  return new SqlBuilderImpl() as any
}

export function tuple<T extends any[] & { "0": any }>(array: T): T {
  return array
}
