import * as t from "io-ts"

export type Literal<T extends string> = string extends T ? never : T

export type SqlParam<N extends string, T> = string extends N ? {} : Record<N, T>

export type ColType<T extends Column> = t.TypeOf<T["_type"]>

export type InputCol = { type: t.Any; dbName?: string }

export type TableColumns<TN extends string, C extends Record<string, InputCol>> = {
  readonly [K in keyof C]: Column<TN, C[K]["type"], K>
}

export type RemoveKey<T, R extends string> = { [K in Exclude<keyof T, R>]: T[K] }

export type Condition<CT extends string = never, P = {}> = (
  | EqCondition
  | AndCondition
  | OrCondition
  | InCondition) &
  RemoveKey<BaseCondition<CT, P>, "sqlKind" | "_condTables" | "_condParams">
export type JoinType = PlainJoin | LeftJoin

export type SqlPart =
  | SelectStatement
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

export class PrivateTable<C extends ValsAre<C, InputCol>, AN extends string>
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
  C extends ValsAre<C, InputCol> = ValsAre<C, InputCol>,
  AsName extends string = string
> = PrivateTable<C, AsName> & TableColumns<AsName, C>

export interface TableConstructor {
  new <C extends ValsAre<C, InputCol>, AsName extends string>(
    _table: string,
    _columns: C,
    _tableAs: AsName
  ): Table<C, AsName>
}
export const Table: TableConstructor = PrivateTable as TableConstructor

export function table<C extends ValsAre<C, InputCol>, N extends string>(arg: {
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
    col2: Col2 | t.TypeOf<TY> | PlaceholderParam<SPN>
  ): Condition<TN | Literal<Col2["_tableAs"]>, SqlParam<SPN, t.TypeOf<TY>>> {
    return new EqCondition(this, col2)
  }

  in<C extends ValsAre<C, t.TypeOf<TY>>, P, SPN extends string>(
    rightArg: SqlBuilder<any, any, C, P> | t.TypeOf<TY>[] | PlaceholderParam<SPN>
  ): Condition<TN, P & SqlParam<SPN, t.TypeOf<TY>>> {
    return new InCondition(this, rightArg)
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

export class InCondition<CT extends string = string, P = {}> extends BaseCondition<
  CT,
  P
> {
  readonly sqlKind = "inCondition"
  readonly right: SelectStatement | Hardcoded | PlaceholderParam

  constructor(
    readonly left: Column,
    rightArg: SelectStatement | any[] | PlaceholderParam<any>
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
  T extends ValsAre<T, Column>,
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

export type DeepReadonly<T> = T extends ReadonlyArray<infer U>
  ? DeepReadonlyArray<U>
  : T extends SqlKind ? T : T extends object ? DeepReadonlyObject<T> : T

export interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

export type DeepReadonlyObject<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> }

export type BuilderState = DeepReadonly<{
  selFromTables: Table[]
  selJoins: JoinType[]
  selColumns: ColumnDeclaration[]
  selWhere?: Condition
}>

export interface SelectStatement extends SqlKind, BuilderState {
  readonly sqlKind: "selectStatement"
}

export class SqlBuilder<
  RT extends string = never,
  OT extends string = never,
  Cols = {},
  P = {},
  TblNames extends string = Literal<RT> | Literal<OT>
> implements SelectStatement {
  readonly sqlKind = "selectStatement"

  private static readonly initialState: BuilderState = {
    selFromTables: [],
    selJoins: [],
    selColumns: [],
  }

  get selFromTables(): ReadonlyArray<Table> {
    return this.state.selFromTables
  }

  get selJoins(): ReadonlyArray<JoinType> {
    return this.state.selJoins
  }

  get selColumns(): ReadonlyArray<ColumnDeclaration> {
    return this.state.selColumns
  }

  get selWhere(): Condition | undefined {
    return this.state.selWhere
  }

  execute: ExecuteFunc<P, Cols> = (((arg?: P) => {
    return this.plugin.execute(this, this.lookupParamNum, arg)
  }) as any) as ExecuteFunc<P, Cols>

  toSql(): string {
    return this.plugin.printSql(this, this.lookupParamNum)
  }

  private paramNumber = 0
  private _paramMap: Map<Parameterized, number> | undefined
  private get paramMap(): Map<Parameterized, number> {
    if (!this._paramMap) {
      this._paramMap = new Map()
    }
    return this._paramMap
  }

  private constructor(
    private readonly state: BuilderState,
    private readonly plugin: SqlPlugin
  ) {}

  static select(plugin: SqlPlugin): SqlBuilder {
    return new SqlBuilder(SqlBuilder.initialState, plugin)
  }

  from<T extends Table & NoDupTable<T, TblNames>>(
    table: T
  ): SqlBuilder<RT | T["_tableAs"], OT, Cols, P> {
    return this.next({
      ...this.state,
      selFromTables: [...this.state.selFromTables, table],
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
    return this.next({
      ...this.state,
      selColumns: [...this.state.selColumns, ...colDecs],
    })
  }

  join<T extends Table & NoDupTable<T, TblNames>>(
    table: T,
    cond: Condition<TblNames | T["_tableAs"]>
  ): SqlBuilder<RT | T["_tableAs"], OT, Cols, P> {
    const join = new PlainJoin(table, cond)
    return this.next({
      ...this.state,
      selJoins: [...this.state.selJoins, join],
    })
  }

  leftJoin<T extends Table & NoDupTable<T, TblNames>>(
    table: T,
    cond: Condition<TblNames | T["_tableAs"]>
  ): SqlBuilder<RT, OT | T["_tableAs"], Cols, P> {
    const join = new LeftJoin(table, cond)
    return this.next({
      ...this.state,
      selJoins: [...this.state.selJoins, join],
    })
  }

  where<CTbles extends TblNames, SP>(
    arg: Condition<CTbles, SP>
  ): SqlBuilder<RT, OT, Cols, P & SP>
  where<CTbles extends TblNames, SP>(
    arg: ((subSelect: SqlBuilder<RT, OT, {}>) => Condition<CTbles, SP>)
  ): SqlBuilder<RT, OT, Cols, P & SP>
  where(arg: Condition | ((arg: SqlBuilder) => Condition)): SqlBuilder {
    const cond = isSqlPart(arg) ? arg : arg(this.next(SqlBuilder.initialState))

    return this.next({
      ...this.state,
      selWhere: cond,
    })
  }

  private next(nextState: BuilderState): any {
    return new SqlBuilder(nextState, this.plugin)
  }

  private lookupParamNum = (param: Parameterized): number => {
    if (!this.paramMap.has(param)) {
      this.paramMap.set(param, this.paramNumber++)
    }
    const paramNumber = this.paramMap.get(param)!
    return paramNumber
  }
}

export interface LookupParamNum {
  (param: Parameterized): number
}

export interface SqlPlugin {
  printSql(part: SqlPart, lpn: LookupParamNum): string
  execute(part: SqlPart, lpn: LookupParamNum, args?: object): Promise<any>
}

export function init(plugin: SqlPlugin) {
  return {
    select: () => SqlBuilder.select(plugin),
  }
}
