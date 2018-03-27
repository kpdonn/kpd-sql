import { SQLFrom, SQLJoin } from "./kpdSql"

import * as Immutable from "immutable"
import { Table, ColInfo, Condition } from "./table"
import { Pool } from "pg"

export const tbl: unique symbol = Symbol("tableName")
export const tblAs: unique symbol = Symbol("tableAs")
export const col: unique symbol = Symbol("columnName")
export const colAs: unique symbol = Symbol("columnAs")
export const ty: unique symbol = Symbol("typeSymbol")

export type tblSym = typeof tbl
export type colSym = typeof col
export type colAsSym = typeof colAs
export type tySym = typeof ty
export type tblAsSym = typeof tblAs

let dbPool: Pool

export function initializePool(pool: Pool): void {
  dbPool = pool
}

interface Join {
  type: "inner" | "left"
  table: Table
  cond: Condition<any>
}

const BuilderState = Immutable.Record({
  fromTable: (undefined as any) as Table,
  joins: Immutable.List<Join>(),
  columns: Immutable.List(),
  wheres: Immutable.List()
})
class SqlBuilder {
  constructor(private readonly state = BuilderState()) {}

  from(table: Table): SqlBuilder {
    let newState = this.state.withMutations(arg => {
      arg.set("fromTable", table)
    })

    return new SqlBuilder(newState)
  }

  join(table: Table, cond: Condition<any>): SqlBuilder {
    return this.addJoin("inner", table, cond)
  }

  leftJoin(table: Table, cond: Condition<any>): SqlBuilder {
    return this.addJoin("left", table, cond)
  }

  addJoin(type: "inner" | "left", table: Table, cond: Condition<any>): SqlBuilder {
    const newState = this.state.updateIn(["joins"], joins =>
      joins.push({ type, table, cond })
    )

    return new SqlBuilder(newState)
  }

  columns(cols: ColInfo[]): SqlBuilder {
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

    const fromClause = ` from ${state.fromTable.toSql()} `

    sql += fromClause

    state.joins.forEach(join => {
      sql += " \n "
      const onClause = ` on ${join.cond.toSql()} `
      sql += ` ${join.type} join ${join.table.toSql()} ${onClause} `
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
