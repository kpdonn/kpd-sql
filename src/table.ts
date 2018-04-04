import * as t from "io-ts"
import { SQLExecute, SQLReady } from "./kpdSql"
import {
  SqlParamName,
  InCol,
  TableWithColumns,
  tbl,
  tblAs,
  colAs,
  col,
  ty,
  tySym,
  tblAsSym,
  Literal,
  SqlParam,
  ColType,
} from "./utils"
import { EqCondition, Condition } from "./condition"

export class Table<
  TN extends string,
  C extends Record<string, InCol>,
  AsName extends string
> {
  readonly [tbl]: TN;
  readonly [tblAs]: AsName

  constructor(name: TN, private _columns: C, asName: AsName) {
    this[tbl] = name
    this[tblAs] = asName

    Object.keys(_columns).forEach(colName => {
      const anyThis: any = this
      anyThis[colName] = new Column(
        asName,
        _columns[colName].dbName || colName,
        _columns[colName].type,
        colName
      )
    })
  }

  as<NN extends string>(newAsName: NN): TableWithColumns<TN, C, NN> {
    return new Table(this[tbl], this._columns, newAsName) as TableWithColumns<TN, C, NN>
  }
}

export function table<
  N extends string,
  C extends { [K in keyof C]: InCol },
  AN extends string = N
>(arg: { name: N; columns: C; asName?: AN }): TableWithColumns<N, C, AN> {
  return new Table(arg.name, arg.columns, arg.asName || arg.name) as any
}

export class Column<
  TN extends string = string,
  TY extends t.Any = t.Mixed,
  CN extends string = string,
  CAS extends string = CN
> {
  readonly [tblAs]: TN;
  readonly [col]: CN;
  readonly [colAs]: CAS;

  readonly [ty]: TY

  constructor(tblName: TN, colName: CN, type: TY, colAsName: CAS) {
    this[tblAs] = tblName
    this[col] = colName
    this[ty] = type
    this[colAs] = colAsName
  }

  as<NN extends string>(newName: NN): Column<TN, TY, CN, NN> {
    return new Column(this[tblAs], this[col], this[ty], newName)
  }

  eq<Col2 extends Column<any, this[tySym]>, SPN extends string>(
    col2: Col2 | t.TypeOf<TY> | SqlParamName<SPN>
  ): Condition<TN | Literal<Col2[tblAsSym]>, SqlParam<SPN, t.TypeOf<TY>>> {
    return new EqCondition(this, col2)
  }
}

export function param<N extends string>(param: N): SqlParamName<N> {
  return { sqlParam: param }
}

export function column<T extends t.Any>(type: T, dbName?: string) {
  return { type, dbName }
}
