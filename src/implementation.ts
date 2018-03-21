import { SQLFrom, SQLJoin } from "./kpdSql"

import * as Immutable from "immutable"
import { Table, ColInfo } from "./table"

export const tbl: unique symbol = Symbol("tableName")
export const col: unique symbol = Symbol("columnName")
export const ty: unique symbol = Symbol("typeSymbol")

export type tblSym = typeof tbl
export type colSym = typeof col
export type tySym = typeof ty

interface Join {
  type: "inner" | "left"
  table: Table
  onLeft: ColInfo
  onRight: ColInfo
}
const BuilderState = Immutable.Record({
  fromTable: undefined as undefined | Table,
  joins: Immutable.List(),
  tableMap: Immutable.Map(),
  columns: Immutable.List(),
  tableNum: 0
})
class SqlBuilder {
  constructor(private readonly state = BuilderState()) {}

  from(table: Table): SqlBuilder {
    let newState = this.state.withMutations(arg => {
      arg.set("fromTable", table)
      arg.set("tableNum", arg.tableNum + 1)
    })

    const abbr = `t${newState.tableNum}`
    newState = newState.updateIn(["tableMap"], tm => tm.set(table[tbl], abbr))

    return new SqlBuilder(newState)
  }

  join(table: Table, onLeft: ColInfo, onRight: ColInfo): SqlBuilder {
    return this.addJoin("inner", table, onLeft, onRight)
  }

  leftJoin(table: Table, onLeft: ColInfo, onRight: ColInfo): SqlBuilder {
    return this.addJoin("left", table, onLeft, onRight)
  }

  addJoin(
    type: "inner" | "left",
    table: Table,
    onLeft: ColInfo,
    onRight: ColInfo
  ): SqlBuilder {
    let newState = this.state.set("tableNum", this.state.tableNum + 1)

    const abbr = `t${newState.tableNum}`
    newState = newState
      .updateIn(["tableMap"], tm => tm.set(table[tbl], abbr))
      .updateIn(["joins"], joins => joins.push({ type, table, onLeft, onRight }))

    return new SqlBuilder(newState)
  }

  select(cols: ColInfo[]): SqlBuilder {
    const newState = this.state.updateIn(["columns"], stateCols =>
      stateCols.withMutations((mut: any) => {
        cols.forEach(col => mut.push(col))
      })
    )
    return new SqlBuilder(newState)
  }

  toSql(): string {
    let sql = "Select "
    const state = this.state
    const selectCols = state.columns.map(col => this.colToStr(col)).join(", ")

    sql += selectCols + " "

    const fromTableName = state.fromTable![tbl]
    const fromTableAbr = state.tableMap.get(fromTableName)
    const fromClause = ` from ${fromTableName} ${fromTableAbr} `

    sql += fromClause

    state.joins.forEach(join => {
      const joinTableName = join.table[tbl]
      const joinAbbr = state.tableMap.get(joinTableName)
      const onClause = ` on ${this.colToStr(join.onLeft)} = ${this.colToStr(
        join.onRight
      )} `
      sql += ` ${join.type} join ${joinTableName} ${joinAbbr} ${onClause} `
    })

    return sql
  }

  colToStr(colInfo: ColInfo): string {
    const colTable = this.state.tableMap.get(colInfo[tbl])
    const colStr = `${colTable}.${colInfo[col]} `
    return colStr
  }
}

export function buildSql(): SQLFrom {
  return new SqlBuilder() as any
}

export function tuple<T extends any[] & { "0": any }>(array: T): T {
  return array
}
