import { SQLFrom, Table, SQLJoin, Col, Columns, TOut } from "./kpdSql"

import * as Immutable from "immutable"

export const tableName: unique symbol = Symbol("tableName")

interface Join {
  type: "inner" | "left"
  table: Table
  onLeft: Col
  onRight: Col
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
    newState = newState.updateIn(["tableMap"], tm => tm.set(table[tableName], abbr))

    return new SqlBuilder(newState)
  }

  join(table: Table, onLeft: Col, onRight: Col): SqlBuilder {
    return this.addJoin("inner", table, onLeft, onRight)
  }

  leftJoin(table: Table, onLeft: Col, onRight: Col): SqlBuilder {
    return this.addJoin("left", table, onLeft, onRight)
  }

  addJoin(type: "inner" | "left", table: Table, onLeft: Col, onRight: Col): SqlBuilder {
    let newState = this.state.set("tableNum", this.state.tableNum + 1)

    const abbr = `t${newState.tableNum}`
    newState = newState
      .updateIn(["tableMap"], tm => tm.set(table[tableName], abbr))
      .updateIn(["joins"], joins => joins.push({ type, table, onLeft, onRight }))

    return new SqlBuilder(newState)
  }

  select(cols: Col[]): SqlBuilder {
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

    const fromTableName = state.fromTable![tableName]
    const fromTableAbr = state.tableMap.get(fromTableName)
    const fromClause = ` from ${fromTableName} ${fromTableAbr} `

    sql += fromClause

    state.joins.forEach(join => {
      const joinTableName = join.table[tableName]
      const joinAbbr = state.tableMap.get(joinTableName)
      const onClause = ` on ${this.colToStr(join.onLeft)} = ${this.colToStr(join.onRight)} `
      sql += ` ${join.type} join ${joinTableName} ${joinAbbr} ${onClause} `
    })

    return sql
  }

  colToStr(col: Col): string {
    const colTable = this.state.tableMap.get(col[tableName])
    const colStr = `${colTable}.${col.name} `
    return colStr
  }
}

export function buildSql(): SQLFrom {
  return new SqlBuilder() as any
}

export function table<N extends string, C extends Columns>(arg: {
  name: N
  columns: C
}): TOut<N, C> {
  const result: any = { [tableName]: arg.name }

  Object.keys(arg.columns).forEach(colName => {
    result[colName] = { [tableName]: arg.name, name: colName, ...arg.columns[colName] }
  })

  return result
}
