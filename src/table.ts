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

export const condTbls: unique symbol = Symbol("conditionTables")
export type cts = typeof condTbls
export const cp: unique symbol = Symbol("conditionParams")
export type cps = typeof cp

export abstract class Condition<CT extends string = string, P = {}> {
  readonly [condTbls]: CT;
  readonly [cp]: P
  abstract readonly kind: Literal<ConditionType["kind"]>

  and<C extends Condition>(cond: C): Condition<CT | C[cts], P & C[cps]> {
    return new AndCondition(this, cond)
  }
  or<C extends Condition>(cond: C): Condition<CT | C[cts], P & C[cps]> {
    return new OrCondition(this, cond)
  }
}

export class AndCondition<CT extends string = string, P = {}> extends Condition<CT, P> {
  readonly kind = "and"
  constructor(readonly left: Condition, readonly right: Condition) {
    super()
  }
}

export class OrCondition<CT extends string = string, P = {}> extends Condition<CT, P> {
  readonly kind = "or"

  constructor(readonly left: Condition, readonly right: Condition) {
    super()
  }
}

export class EqCondition<
  Col1 extends Column = Column,
  Col2 extends Column<string, Col1[tySym]> = never,
  SPN extends string = never
> extends Condition<
  Col1[tblAsSym] | Literal<Col2[tblAsSym]>,
  SqlParam<SPN, ColType<Col1>>
> {
  readonly kind = "eq"

  constructor(
    readonly left: Col1,
    readonly right: Col2 | ColType<Col1> | SqlParamName<SPN>
  ) {
    super()
  }
}

export function param<N extends string>(param: N): SqlParamName<N> {
  return { sqlParam: param }
}

const Book = table({
  name: "book",
  columns: {
    id: { type: t.number },
    title: { type: t.string },
    year: { type: t.number },
    pages: { type: t.number },
    authorId: { type: t.number },
  },
})

export function column<T extends t.Any>(type: T, dbName?: string) {
  return { type, dbName }
}

const Vet = table({
  name: "vet",
  columns: {
    id: column(t.number),
    firstName: column(t.string, "first_name"),
    lastName: column(t.string, "last_name"),
  },
})
const testcond = Book.id.eq(Book.authorId).or(Vet.firstName.eq(Book.title))

export type ConditionType = EqCondition | AndCondition | OrCondition
declare const unknownCond: ConditionType
