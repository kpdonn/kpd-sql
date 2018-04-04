import * as t from "io-ts"
import { Pool } from "pg"

export const tbl: unique symbol = Symbol("tableName")
export const tblAs: unique symbol = Symbol("tableAs")
export const col: unique symbol = Symbol("columnName")
export const colAs: unique symbol = Symbol("columnAs")
export const ty: unique symbol = Symbol("typeSymbol")
export const condTbls: unique symbol = Symbol("conditionTables")
export const cp: unique symbol = Symbol("conditionParams")
export const sqlReady: unique symbol = Symbol("sqlReady")

export type tblSym = typeof tbl
export type colSym = typeof col
export type colAsSym = typeof colAs
export type tySym = typeof ty
export type tblAsSym = typeof tblAs
export type cts = typeof condTbls
export type cps = typeof cp

let dbPool: Pool

export function initializePool(pool: Pool): void {
  dbPool = pool
}

export type Literal<T extends string> = string extends T ? never : T

export type SqlParamName<N extends string = string> = Record<"sqlParam", N>
export type SqlParam<N extends string, T> = string extends N ? {} : Record<N, T>

export type ColType<T extends Column> = t.TypeOf<T[tySym]>

export interface SQLReady<Cols> {
  [sqlReady]: Cols
}

export type InCol = { type: t.Any; dbName?: string }

export type LiteralOr<
  T extends undefined | string,
  D extends string
> = T extends undefined ? D : string extends T ? D : T

export type TransformInCol<TN extends string, C extends Record<string, InCol>> = {
  readonly [K in keyof C]: Column<TN, C[K]["type"], LiteralOr<C[K]["dbName"], K>, K>
}

export type TableWithColumns<
  TN extends string = string,
  C extends Record<string, InCol> = Record<string, InCol>,
  AsName extends string = TN
> = Table<TN, C, AsName> & TransformInCol<AsName, C>

export type RemoveKey<T, R extends string> = { [K in Exclude<keyof T, R>]: T[K] }

export type Condition<CT extends string = never, P = {}> = (
  | EqCondition
  | AndCondition
  | OrCondition) &
  RemoveKey<BaseCondition<CT, P>, "kind">
export type JoinType = PlainJoin | LeftJoin

export type SqlPart =
  | Condition
  | JoinType
  | Table
  | Column
  | PlaceholderParam
  | Hardcoded
  | ColumnDeclaration

export type Parameterized = PlaceholderParam | Hardcoded

export interface SqlKind {
  readonly kind: Literal<SqlPart["kind"]>
}

function isSqlPart(obj: any): obj is SqlPart {
  return typeof obj.kind === "string"
}

export class ColumnDeclaration implements SqlKind {
  readonly kind = "columnDeclaration"

  constructor(readonly col: Column) {}
}

export class PlainJoin implements SqlKind {
  readonly kind = "plainJoin"
  constructor(readonly joinTable: Table, readonly onCondition: Condition) {}
}
export class LeftJoin implements SqlKind {
  readonly kind = "leftJoin"
  constructor(readonly joinTable: Table, readonly onCondition: Condition) {}
}

export class Table<
  TN extends string = string,
  C extends Record<string, InCol> = {},
  AsName extends string = string
> implements SqlKind {
  readonly kind = "table";
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
> implements SqlKind {
  readonly kind = "column";

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

export class Hardcoded implements SqlKind {
  readonly kind = "hardcoded"

  constructor(readonly value: any) {}
}

export class PlaceholderParam<PN extends string = string> implements SqlKind {
  readonly kind = "placeholderParam"

  constructor(readonly sqlParam: PN) {}
}

export function param<N extends string & (string extends N ? never : string)>(
  paramName: N
): PlaceholderParam<N> {
  return new PlaceholderParam(paramName)
}

export function column<T extends t.Any>(type: T, dbName?: string) {
  return { type, dbName }
}

export abstract class BaseCondition<CT extends string = never, P = {}>
  implements SqlKind {
  readonly [condTbls]: CT;
  readonly [cp]: P

  abstract readonly kind: Literal<Condition["kind"]>

  and<C extends BaseCondition>(cond: C & Condition): Condition<CT | C[cts], P & C[cps]> {
    return new AndCondition(this as any, cond)
  }
  or<C extends BaseCondition>(cond: C & Condition): Condition<CT | C[cts], P & C[cps]> {
    return new OrCondition(this as any, cond)
  }
}

export class AndCondition<CT extends string = string, P = {}> extends BaseCondition<
  CT,
  P
> {
  readonly kind = "and"
  constructor(readonly left: Condition, readonly right: Condition) {
    super()
  }
}

export class OrCondition<CT extends string = string, P = {}> extends BaseCondition<
  CT,
  P
> {
  readonly kind = "or"

  constructor(readonly left: Condition, readonly right: Condition) {
    super()
  }
}

export class EqCondition<
  Col1 extends Column = Column,
  Col2 extends Column<string, Col1[tySym]> = any,
  SPN extends string = any
> extends BaseCondition<
  Col1[tblAsSym] | Literal<Col2[tblAsSym]>,
  SqlParam<SPN, ColType<Col1>>
> {
  readonly kind = "eq"
  readonly right: Column | Hardcoded | PlaceholderParam

  constructor(
    readonly left: Col1,
    rightArg: Col2 | ColType<Col1> | PlaceholderParam<SPN>
  ) {
    super()

    if (isSqlPart(rightArg)) {
      this.right = rightArg
    } else {
      this.right = new Hardcoded(rightArg)
    }
  }
}

export type ArrayKeys = keyof any[]

export type TupleKeys<T> = Exclude<keyof T, ArrayKeys>

export type SafeInd<T, K extends keyof Base, Base = T> = Extract<T, Base> extends never
  ? never
  : Extract<T, Base>[K]

export type NoDuplicates<T extends string> = { "NO DUPLICATE KEYS ALLOWED": T }
export type ColumnsObj<T> = { [K in TupleKeys<T>]: Extract<T[K], Column> }

export type ColumnsWithTableName<
  T extends Record<string, Column>,
  TblName extends string
> = { [K in keyof T]: T[K][tblAsSym] extends Literal<TblName> ? T[K] : never }[keyof T]

export type OutputColumns<
  T extends Record<string, Column>,
  TableNames extends string,
  OrType = never,
  Cols extends Column = ColumnsWithTableName<T, TableNames>
> = {
  [K in SafeInd<Cols, colAsSym>]: Cols extends { [colAs]: K }
    ? t.TypeOf<Cols[tySym]> | OrType
    : never
}

export type NoDupTable<T extends TableWithColumns, TableNames extends string> = {
  [tbl]: T[tblAsSym] extends TableNames ? never : string
}

export type ExecuteFunc<P, Cols> = {} extends P
  ? () => Promise<Cols[]>
  : (args: P) => Promise<Cols[]>

export interface SQLReady<Cols> {
  [sqlReady]: Cols
}

export type DeepReadonly<T> = T extends ReadonlyArray<infer U>
  ? DeepReadonlyArray<U>
  : T extends SqlKind ? T : T extends object ? DeepReadonlyObject<T> : T

export interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

export type DeepReadonlyObject<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> }

export type BuilderState = DeepReadonly<{
  fromTables: Table[]
  joins: JoinType[]
  columns: Column[]
  whereCondition?: Condition
}>

export class SqlBuilder<
  RT extends string = never,
  OT extends string = never,
  Cols = {},
  P = {},
  TblNames extends string = Literal<RT> | Literal<OT>
> {
  private static readonly initialState: BuilderState = {
    fromTables: [],
    joins: [],
    columns: [],
  }

  execute: ExecuteFunc<P, Cols> = (((arg?: P) => {
    throw new Error("not implemented")
  }) as any) as ExecuteFunc<P, Cols>

  private paramNumber = 1
  private readonly paramMap = new Map<Parameterized, number>()

  constructor(readonly state: BuilderState) {}

  static select(): SqlBuilder {
    return new SqlBuilder(SqlBuilder.initialState)
  }

  from<T extends TableWithColumns & NoDupTable<T, TblNames>>(
    table: T
  ): SqlBuilder<RT | T[tblAsSym], OT, Cols, P> {
    return new SqlBuilder({
      ...this.state,
      fromTables: [...this.state.fromTables, table],
    })
  }

  columns<
    C extends ReadonlyArray<Column> &
      {
        [K in keyof T]: T[K][colAsSym] extends (
          | (SafeInd<T[Exclude<keyof T, K>], colAsSym>)
          | keyof Cols)
          ? NoDuplicates<SafeInd<T[K], colAsSym>>
          : Column<TblNames>
      } & { "0": any },
    T extends ColumnsObj<C> = ColumnsObj<C>
  >(
    cols: C
  ): SqlBuilder<RT, OT, Cols & OutputColumns<T, RT> & OutputColumns<T, OT, null>, P> {
    return new SqlBuilder({
      ...this.state,
      columns: [...this.state.columns, ...cols],
    })
  }

  join<T extends TableWithColumns & NoDupTable<T, TblNames>>(
    table: T,
    cond: Condition<TblNames | T[tblAsSym]>
  ): SqlBuilder<RT | T[tblAsSym], OT, Cols, P> {
    const join = new PlainJoin(table, cond)
    return new SqlBuilder({
      ...this.state,
      joins: [...this.state.joins, join],
    })
  }

  leftJoin<T extends TableWithColumns & NoDupTable<T, TblNames>>(
    table: T,
    cond: Condition<TblNames | T[tblAsSym]>
  ): SqlBuilder<RT, OT | T[tblAsSym], Cols, P> {
    const join = new LeftJoin(table, cond)
    return new SqlBuilder({
      ...this.state,
      joins: [...this.state.joins, join],
    })
  }

  where<CTbles extends TblNames, SP>(
    cond: Condition<CTbles, SP>
  ): SqlBuilder<RT, OT, Cols, P & SP> {
    return new SqlBuilder({
      ...this.state,
      whereCondition: cond,
    })
  }

  whereSub<CTbles extends TblNames, SP>(
    condCallback: (subSelect: SqlBuilder<RT, OT, {}>) => Condition<CTbles, SP>
  ): SqlBuilder<RT, OT, Cols, P & SP> {
    const subQueryBuilder = new SqlBuilder(SqlBuilder.initialState)
    const callbackResult = condCallback(subQueryBuilder)
    return new SqlBuilder({
      ...this.state,
      whereCondition: callbackResult,
    })
  }

  toSql(): string {
    const columnsSql = this.state.columns
      .map(c => this.print(new ColumnDeclaration(c)))
      .join(", ")

    const fromSql = this.state.fromTables.map(this.print).join(", ")

    const joinSql = this.state.joins.map(this.print).join("\n")

    const whereSql = this.state.whereCondition
      ? `WHERE ${this.print(this.state.whereCondition)}`
      : ""

    const result = `SELECT ${columnsSql} FROM ${fromSql} ${joinSql} ${whereSql}`
    return result
  }

  private getParamStr(param: Parameterized): string {
    if (!this.paramMap.has(param)) {
      this.paramMap.set(param, this.paramNumber++)
    }
    const paramNumber = this.paramMap.get(param)!
    return `$${paramNumber}`
  }

  private print = (it: SqlPart): string => {
    const pr = this.print
    switch (it.kind) {
      case "plainJoin":
        return `join ${pr(it.joinTable)} on ${pr(it.onCondition)}`
      case "leftJoin":
        return `left join ${pr(it.joinTable)} on ${pr(it.onCondition)}`
      case "table":
        return `${it[tbl]} ${it[tblAs]}`
      case "hardcoded":
      case "placeholderParam":
        return this.getParamStr(it)
      case "and":
        return `(${pr(it.left)}) AND (${pr(it.right)})`
      case "or":
        return `(${pr(it.left)}) OR (${pr(it.right)})`
      case "column":
        return `${it[tblAs]}.${it[col]}`
      case "columnDeclaration":
        return `${pr(it.col)} as ${it.col[colAs]}`
      case "eq":
        return `${pr(it.left)} = ${pr(it.right)}`
    }
  }
}

export function select(): SqlBuilder {
  return SqlBuilder.select()
}
