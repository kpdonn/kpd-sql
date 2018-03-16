import { SQLFrom, Table, SQLJoin, Col, Columns, TOut } from "./kpdSql"

export const tableName: unique symbol = Symbol("tableName")

interface Join {
  type: "inner" | "left"
  table: Table
  onLeft: Col
  onRight: Col
}

class SqlBuilder {
  fromTable!: Table

  readonly joins: Join[] = []
  readonly tableMap = new Map<string, string>()

  readonly columns: Col[] = []

  tableNum = 0

  from(table: Table): this {
    this.tableNum++
    this.fromTable = table
    this.tableMap.set(table[tableName], `t${this.tableNum}`)
    return this
  }

  join(table: Table, onLeft: Col, onRight: Col): this {
    return this.addJoin("inner", table, onLeft, onRight)
  }

  leftJoin(table: Table, onLeft: Col, onRight: Col): this {
    return this.addJoin("left", table, onLeft, onRight)
  }

  addJoin(type: "inner" | "left", table: Table, onLeft: Col, onRight: Col): this {
    this.tableNum++
    this.tableMap.set(table[tableName], `t${this.tableNum}`)
    this.joins.push({ type, table, onLeft, onRight })
    return this
  }

  select(cols: Col[]): this {
    cols.forEach(col => this.columns.push(col))
    return this
  }

  toSql(): string {
    let sql = "Select "
    const selectCols = this.columns.map(col => this.colToStr(col)).join(", ")

    sql += selectCols + " "

    const fromTableName = this.fromTable[tableName]
    const fromTableAbr = this.tableMap.get(fromTableName)
    const fromClause = ` from ${fromTableName} ${fromTableAbr} `

    sql += fromClause

    this.joins.forEach(join => {
      const joinTableName = join.table[tableName]
      const joinAbbr = this.tableMap.get(joinTableName)
      const onClause = ` on ${this.colToStr(join.onLeft)} = ${this.colToStr(join.onRight)} `
      sql += ` ${join.type} join ${joinTableName} ${joinAbbr} ${onClause} `
    })

    return sql
  }

  colToStr(col: Col): string {
    const colTable = this.tableMap.get(col[tableName])
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
