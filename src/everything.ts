import * as t from "io-ts"
import { Pool } from "pg"

let dbPool: Pool

export function initializePool(pool: Pool): void {
  dbPool = pool
}

export type Literal<T extends string> = string extends T ? never : T

export type SqlParamName<N extends string = string> = Record<"sqlParam", N>
export type SqlParam<N extends string, T> = string extends N ? {} : Record<N, T>

export type ColType<T extends Column> = t.TypeOf<T["_type"]>

export interface SQLReady<Cols> {
  __sqlReady: Cols
}

export type InCol = { type: t.Any; dbName?: string }

export type LiteralOr<
  T extends undefined | string,
  D extends string
> = T extends undefined ? D : string extends T ? D : T

export type TableColumns<TN extends string, C extends Record<string, InCol>> = {
  readonly [K in keyof C]: Column<TN, C[K]["type"], K>
}

export type RemoveKey<T, R extends string> = { [K in Exclude<keyof T, R>]: T[K] }

export type Condition<CT extends string = never, P = {}> = (
  | EqCondition
  | AndCondition
  | OrCondition) &
  RemoveKey<BaseCondition<CT, P>, "sqlKind" | "_condTables" | "_condParams">
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
  readonly sqlKind: Literal<SqlPart["sqlKind"]>
}

function isSqlPart(obj: any): obj is SqlPart {
  return typeof obj.sqlKind === "string"
}

export class ColumnDeclaration implements SqlKind {
  readonly sqlKind = "columnDeclaration"

  constructor(readonly col: Column) {}
}

export class PlainJoin implements SqlKind {
  readonly sqlKind = "plainJoin"
  constructor(readonly joinTable: Table, readonly onCondition: Condition) {}
}
export class LeftJoin implements SqlKind {
  readonly sqlKind = "leftJoin"
  constructor(readonly joinTable: Table, readonly onCondition: Condition) {}
}

export class PrivateTable<C extends ValsAre<C, InCol>, AN extends string>
  implements SqlKind {
  readonly sqlKind = "table"

  constructor(
    readonly _table: string,
    private readonly _columns: C,
    readonly _tableAs: AN
  ) {
    for (const colName in _columns) {
      const thisColumns = (this as any) as NoRO<TableColumns<AN, C>>
      thisColumns[colName] = new Column(
        _tableAs,
        _columns[colName].dbName || colName,
        _columns[colName].type,
        colName
      )
    }
  }

  as<NN extends string>(newAsName: NN): Table<C, NN> {
    return new Table(this._table, this._columns, newAsName)
  }
}

type NoRO<T> = { -readonly [K in keyof T]: T[K] }

export type ValsAre<T, V> = { [K in keyof T]: V }

export type Table<
  C extends ValsAre<C, InCol> = ValsAre<C, InCol>,
  AsName extends string = string
> = PrivateTable<C, AsName> & TableColumns<AsName, C>

export interface TableConstructor {
  new <C extends ValsAre<C, InCol>, AsName extends string>(
    _table: string,
    _columns: C,
    _tableAs: AsName
  ): Table<C, AsName>
}
export const Table: TableConstructor = PrivateTable as TableConstructor

export function table<C extends ValsAre<C, InCol>, N extends string>(arg: {
  name: N
  columns: C
}): Table<C, N> {
  return new Table(arg.name, arg.columns, arg.name)
}

export class Column<
  TN extends string = string,
  TY extends t.Any = t.Mixed,
  CAS extends string = string
> implements SqlKind {
  readonly sqlKind = "column"

  constructor(
    readonly _tableAs: TN,
    readonly _column: string,
    readonly _type: TY,
    readonly _columnAs: CAS
  ) {}

  as<NN extends string>(newName: NN): Column<TN, TY, NN> {
    return new Column(this._tableAs, this._column, this._type, newName)
  }

  eq<Col2 extends Column<any, this["_type"]>, SPN extends string>(
    col2: Col2 | t.TypeOf<TY> | SqlParamName<SPN>
  ): Condition<TN | Literal<Col2["_tableAs"]>, SqlParam<SPN, t.TypeOf<TY>>> {
    return new EqCondition(this, col2)
  }
}

export class Hardcoded implements SqlKind {
  readonly sqlKind = "hardcoded"

  constructor(readonly value: any) {}
}

export class PlaceholderParam<PN extends string = string> implements SqlKind {
  readonly sqlKind = "placeholderParam"

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
  readonly _condTables!: CT
  readonly _condParams!: P

  abstract readonly sqlKind: Literal<Condition["sqlKind"]>

  and<C extends BaseCondition>(
    cond: C & Condition
  ): Condition<CT | C["_condTables"], P & C["_condParams"]> {
    return new AndCondition(this as any, cond)
  }
  or<C extends BaseCondition>(
    cond: C & Condition
  ): Condition<CT | C["_condTables"], P & C["_condParams"]> {
    return new OrCondition(this as any, cond)
  }
}

export class AndCondition<CT extends string = string, P = {}> extends BaseCondition<
  CT,
  P
> {
  readonly sqlKind = "and"
  constructor(readonly left: Condition, readonly right: Condition) {
    super()
  }
}

export class OrCondition<CT extends string = string, P = {}> extends BaseCondition<
  CT,
  P
> {
  readonly sqlKind = "or"

  constructor(readonly left: Condition, readonly right: Condition) {
    super()
  }
}

export class EqCondition<
  Col1 extends Column = Column,
  Col2 extends Column<string, Col1["_type"]> = any,
  SPN extends string = any
> extends BaseCondition<
  Col1["_tableAs"] | Literal<Col2["_tableAs"]>,
  SqlParam<SPN, ColType<Col1>>
> {
  readonly sqlKind = "eq"
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
> = { [K in keyof T]: T[K]["_tableAs"] extends Literal<TblName> ? T[K] : never }[keyof T]

export type OutputColumns<
  T extends Record<string, Column>,
  TableNames extends string,
  OrType = never,
  Cols extends Column = ColumnsWithTableName<T, TableNames>
> = {
  [K in SafeInd<Cols, "_columnAs">]: Cols extends { ["_columnAs"]: K }
    ? t.TypeOf<Cols["_type"]> | OrType
    : never
}

export type NoDupTable<T extends Table, TableNames extends string> = {
  ["_table"]: T["_tableAs"] extends TableNames ? never : string
}

export type ExecuteFunc<P, Cols> = {} extends P
  ? () => Promise<Cols[]>
  : (args: P) => Promise<Cols[]>

export interface SQLReady<Cols> {
  ["_sqlReady"]: Cols
}

export type DeepReadonly<T> = T extends ReadonlyArray<infer U>
  ? DeepReadonlyArray<U>
  : T extends SqlKind ? T : T extends object ? DeepReadonlyObject<T> : T

export interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

export type DeepReadonlyObject<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> }

export type BuilderState = DeepReadonly<{
  fromTables: Table[]
  joins: JoinType[]
  columns: ColumnDeclaration[]
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

  from<T extends Table & NoDupTable<T, TblNames>>(
    table: T
  ): SqlBuilder<RT | T["_tableAs"], OT, Cols, P> {
    return new SqlBuilder({
      ...this.state,
      fromTables: [...this.state.fromTables, table],
    })
  }

  columns<
    C extends ReadonlyArray<Column> &
      {
        [K in keyof T]: T[K]["_columnAs"] extends (
          | (SafeInd<T[Exclude<keyof T, K>], "_columnAs">)
          | keyof Cols)
          ? NoDuplicates<SafeInd<T[K], "_columnAs">>
          : Column<TblNames>
      } & { "0": any },
    T extends ColumnsObj<C> = ColumnsObj<C>
  >(
    cols: C
  ): SqlBuilder<RT, OT, Cols & OutputColumns<T, RT> & OutputColumns<T, OT, null>, P> {
    const colDecs = cols.map(col => new ColumnDeclaration(col))
    return new SqlBuilder({
      ...this.state,
      columns: [...this.state.columns, ...colDecs],
    })
  }

  join<T extends Table & NoDupTable<T, TblNames>>(
    table: T,
    cond: Condition<TblNames | T["_tableAs"]>
  ): SqlBuilder<RT | T["_tableAs"], OT, Cols, P> {
    const join = new PlainJoin(table, cond)
    return new SqlBuilder({
      ...this.state,
      joins: [...this.state.joins, join],
    })
  }

  leftJoin<T extends Table & NoDupTable<T, TblNames>>(
    table: T,
    cond: Condition<TblNames | T["_tableAs"]>
  ): SqlBuilder<RT, OT | T["_tableAs"], Cols, P> {
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
    const columnsSql = this.state.columns.map(this.print).join(", ")

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
    switch (it.sqlKind) {
      case "plainJoin":
        return `join ${pr(it.joinTable)} on ${pr(it.onCondition)}`
      case "leftJoin":
        return `left join ${pr(it.joinTable)} on ${pr(it.onCondition)}`
      case "table":
        return `${it._table} ${it._tableAs}`
      case "hardcoded":
      case "placeholderParam":
        return this.getParamStr(it)
      case "and":
        return `(${pr(it.left)}) AND (${pr(it.right)})`
      case "or":
        return `(${pr(it.left)}) OR (${pr(it.right)})`
      case "column":
        return `${it._tableAs}.${it._column}`
      case "columnDeclaration":
        return `${pr(it.col)} as ${it.col._columnAs}`
      case "eq":
        return `${pr(it.left)} = ${pr(it.right)}`
    }
  }
}

export function select(): SqlBuilder {
  return SqlBuilder.select()
}

interface LookupParamNum {
  (param: Parameterized): number
}

interface SqlPrinter {
  print(part: SqlPart, lpn: LookupParamNum): string
}
