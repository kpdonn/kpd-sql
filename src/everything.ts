import * as t from "io-ts"

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

export type ConditionType = EqCondition | AndCondition | OrCondition
export type JoinType = PlainJoin | LeftJoin

export type SqlPart = ConditionType | JoinType | Table | Column

export interface SqlKind {
  readonly kind: Literal<SqlPart["kind"]>
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

export function param<N extends string>(param: N): SqlParamName<N> {
  return { sqlParam: param }
}

export function column<T extends t.Any>(type: T, dbName?: string) {
  return { type, dbName }
}

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
  : T extends object ? DeepReadonlyObject<T> : T

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
    return ""
  }
}

export function select(): SqlBuilder {
  return SqlBuilder.select()
}
