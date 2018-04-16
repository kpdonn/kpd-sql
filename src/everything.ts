import * as t from "io-ts"

export type Literal<T extends string> = string extends T ? never : T

export type SqlParam<N extends string, T> = string extends N ? {} : Record<N, T>

export type ColType<T extends Column> = t.TypeOf<T["type"]>

export type InputCol<T extends t.Any = t.Any, U extends boolean = boolean> = {
  type: T
  dbName?: string
  unique: U
}

export type TableColumns<
  TN extends string,
  C extends Record<string, InputCol>,
  StripUnique extends boolean
> = {
  readonly [K in keyof C]: TableColumn<
    TN,
    C[K]["type"],
    K,
    StripUnique extends true ? false : C[K]["unique"]
  >
}

export type Condition<CT extends string = string, P = {}> =
  | IsNotNullCondition<CT, P>
  | IsNullCondition<CT, P>
  | EqCondition<CT, P>
  | AndCondition<CT, P>
  | OrCondition<CT, P>
  | InCondition<CT, P>
  | NotCondition<CT, P>

export type FromType<RT extends string = string, OT extends string = string> =
  | Table<{}, RT, OT>
  | PlainJoin<RT, OT>
  | LeftJoin<RT, OT>

export type SqlPart =
  | GroupBy
  | WithClause
  | SelectStatement
  | Condition
  | FromType
  | Column
  | PlaceholderParam
  | Hardcoded
  | ColumnDeclaration

export type Column<
  TN extends string = string,
  TY extends t.Any = t.Any,
  CAS extends string = string,
  U extends boolean = boolean,
  ATY extends t.TypeOf<TY> = t.TypeOf<TY>
> = TableColumn<TN, TY, CAS, U, ATY> | Aggregate<TN, TY, CAS, ATY>

export type Parameterized = PlaceholderParam | Hardcoded

export interface SqlKind {
  readonly sqlKind: Literal<SqlPart["sqlKind"]>
}

function isSqlPart(obj: any): obj is SqlPart {
  return typeof obj.sqlKind === "string"
}

export class ColumnDeclaration implements SqlKind {
  readonly sqlKind = "columnDeclaration"

  constructor(readonly col: BaseColumn) {}
}

export type NoDups<T extends string, TableNames extends string> = T extends TableNames
  ? never
  : {}

export abstract class FromTable<
  RT extends string,
  OT extends string,
  TblNames extends string = Literal<RT> | Literal<OT>,
  TblNames2 extends TblNames = TblNames
> {
  join<
    _RT extends string,
    _OT extends string,
    _NewTblNames extends string = Literal<_RT> | Literal<_OT>,
    _NTN2 extends _NewTblNames = _NewTblNames
  >(
    table: FromType<_RT, _OT> & NoDups<_NewTblNames, TblNames>,
    cond: Condition<TblNames2 | _NTN2>
  ): FromType<RT | Literal<_RT>, OT | Literal<_OT>> {
    const join = new PlainJoin(this as any, table, cond)
    return join
  }
  leftJoin<
    _RT extends string,
    _OT extends string,
    _NewTblNames extends string = Literal<_RT> | Literal<_OT>,
    _NTN2 extends _NewTblNames = _NewTblNames
  >(
    table: FromType<_RT, _OT> & NoDups<_NewTblNames, TblNames>,
    cond: Condition<TblNames2 | _NTN2>
  ): FromType<RT | Literal<_RT>, OT | Literal<_OT>> {
    const join = new LeftJoin(this as any, table, cond)
    return join
  }
}

export class PlainJoin<RT extends string = never, OT extends string = never>
  extends FromTable<RT, OT>
  implements SqlKind {
  readonly sqlKind = "plainJoin"
  constructor(
    readonly left: FromType,
    readonly right: FromType,
    readonly onCondition: Condition
  ) {
    super()
  }
}
export class LeftJoin<RT extends string = never, OT extends string = never>
  extends FromTable<RT, OT>
  implements SqlKind {
  readonly sqlKind = "leftJoin"
  constructor(
    readonly left: FromType,
    readonly right: FromType,
    readonly onCondition: Condition
  ) {
    super()
  }
}

export class PrivateTable<
  AN extends string,
  OT extends string,
  C extends ValsAre<C, InputCol>
> extends FromTable<AN, OT> implements SqlKind {
  readonly sqlKind = "table"
  readonly _tableColumns: Record<string, TableColumn<AN, t.Any, string, boolean>>
  constructor(readonly _table: string, _columns: C, readonly _tableAs: AN) {
    super()
    this._tableColumns = {}

    for (const colName in _columns) {
      this._tableColumns[colName] = new TableColumn(
        _tableAs,
        _columns[colName].dbName || colName,
        _columns[colName].type,
        colName,
        _columns[colName].unique
      )
    }
    Object.assign(this, this._tableColumns)
  }

  get "*"(): AllCols<C, AN> {
    return all(this as any)
  }
}

export type ValsAre<T, V> = { [K in keyof T]: V }

export type Table<
  C extends ValsAre<C, InputCol> = ValsAre<C, InputCol>,
  AsName extends string = string,
  OT extends string = never,
  StripUnique extends boolean = false
> = PrivateTable<AsName, OT, C> & TableColumns<AsName, C, StripUnique>

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

export abstract class BaseColumn<
  TN extends string = string,
  TY extends t.Any = t.Any,
  CAS extends string = string,
  U extends boolean = boolean,
  ATY extends t.TypeOf<TY> = t.TypeOf<TY>
> {
  private _actualType!: ATY

  constructor(
    readonly _tableAs: TN,
    readonly type: TY,
    readonly _columnAs: CAS,
    readonly unique: U,
    protected readonly _isNot: boolean
  ) {}

  abstract get not(): BaseColumn<TN, TY, CAS, U, ATY>

  eq<
    Col2 extends Column<string, t.Any, string, boolean, NonNullable<ATY>>,
    SPN extends string
  >(
    col2: Col2 | t.TypeOf<TY> | PlaceholderParam<SPN>
  ): Condition<TN | Literal<Col2["_tableAs"]>, SqlParam<SPN, NonNullable<t.TypeOf<TY>>>> {
    return EqCondition.create(this as any, col2, this._isNot) as any
  }

  in<C extends ValsAre<C, BaseColumn<string, TY>>, P, SPN extends string>(
    rightArg: SelectStatement<C, P> | t.TypeOf<TY>[] | PlaceholderParam<SPN>
  ): Condition<TN, P & SqlParam<SPN, NonNullable<t.TypeOf<TY>>>> {
    return InCondition.create(this as any, rightArg, this._isNot) as any
  }

  get isNull(): Condition<TN> {
    return IsNullCondition.create(this as any, this._isNot) as any
  }

  get isNotNull(): Condition<TN> {
    return IsNotNullCondition.create(this as any, this._isNot) as any
  }
}

export class Aggregate<
  TN extends string,
  TY extends t.Any,
  CAS extends string,
  ATY extends t.TypeOf<TY> = t.TypeOf<TY>
> extends BaseColumn<TN, TY, CAS, false, ATY> implements SqlKind {
  readonly sqlKind = "aggregate"

  readonly unique = false

  constructor(
    type: TY,
    _columnAs: CAS,
    readonly _aggColumn: Column<TN>,
    _isNot: boolean = false
  ) {
    super(_aggColumn._tableAs, type, _columnAs, false, _isNot)
  }

  get not(): Aggregate<TN, TY, CAS, ATY> {
    return new Aggregate(this.type, this._columnAs, this._aggColumn, !this._isNot)
  }
}

export class TableColumn<
  TN extends string,
  TY extends t.Any,
  CAS extends string,
  U extends boolean,
  ATY extends t.TypeOf<TY> = t.TypeOf<TY>
> extends BaseColumn<TN, TY, CAS, U, ATY> implements SqlKind {
  readonly sqlKind = "column"

  constructor(
    _tableAs: TN,
    readonly _column: string,
    type: TY,
    _columnAs: CAS,
    unique: U,
    _isNot: boolean = false
  ) {
    super(_tableAs, type, _columnAs, unique, _isNot)
  }

  get not(): TableColumn<TN, TY, CAS, U, ATY> {
    return new TableColumn(
      this._tableAs,
      this._column,
      this.type,
      this._columnAs,
      this.unique,
      !this._isNot
    )
  }

  as<NN extends string>(newName: NN): TableColumn<TN, TY, NN, U> {
    return new TableColumn(this._tableAs, this._column, this.type, newName, this.unique)
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

export function column<T extends t.Any, U extends boolean = false>(
  type: T,
  dbName?: string,
  unique?: U
): InputCol<T, U> {
  return { type, dbName, unique: unique || false } as InputCol<T, U>
}

export abstract class BaseCondition<CT extends string = string, P = {}>
  implements SqlKind {
  readonly _condTables!: CT
  readonly _condParams!: P

  abstract readonly sqlKind: Literal<Condition["sqlKind"]>

  protected static wrapNot<C extends Condition>(
    condition: C,
    isNot: boolean
  ): C | NotCondition {
    return isNot ? new NotCondition(condition) : condition
  }

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

export class NotCondition<CT extends string = string, P = {}> extends BaseCondition<
  CT,
  P
> {
  readonly sqlKind = "not"

  constructor(readonly target: Condition) {
    super()
  }
}

export class IsNullCondition<CT extends string = string, P = {}> extends BaseCondition<
  CT,
  P
> {
  readonly sqlKind = "isNull"

  static create(c: Column, isNot: boolean): IsNullCondition | NotCondition {
    return BaseCondition.wrapNot(new IsNullCondition(c), isNot)
  }

  private constructor(readonly column: Column) {
    super()
  }
}

export class IsNotNullCondition<CT extends string = string, P = {}> extends BaseCondition<
  CT,
  P
> {
  readonly sqlKind = "isNotNull"

  static create(c: Column, isNot: boolean): IsNotNullCondition | NotCondition {
    return BaseCondition.wrapNot(new IsNotNullCondition(c), isNot)
  }

  private constructor(readonly column: Column) {
    super()
  }
}

export class EqCondition<CT extends string = string, P = {}> extends BaseCondition<
  CT,
  P
> {
  readonly sqlKind = "eq"
  readonly right: Column | Hardcoded | PlaceholderParam

  static create<Col1 extends Column = Column>(
    left: Col1,
    rightArg: Column<string, Col1["type"]> | ColType<Col1> | PlaceholderParam,
    isNot: boolean
  ): EqCondition | NotCondition {
    return BaseCondition.wrapNot(new EqCondition(left, rightArg), isNot)
  }

  private constructor(readonly left: Column, rightArg: Column | {} | PlaceholderParam) {
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

  static create(
    left: Column,
    rightArg: SelectStatement | any[] | PlaceholderParam,
    isNot: boolean
  ): InCondition | NotCondition {
    return BaseCondition.wrapNot(new InCondition(left, rightArg), isNot)
  }

  private constructor(
    readonly left: Column,
    rightArg: SelectStatement | any[] | PlaceholderParam<string>
  ) {
    super()

    if (isSqlPart(rightArg)) {
      this.right = rightArg
    } else {
      this.right = new Hardcoded(rightArg)
    }
  }
}

export class GroupBy<GBC extends BaseColumn = BaseColumn> implements SqlKind {
  readonly sqlKind = "groupBy"

  constructor(readonly columns: GBC[]) {}
}

export type TupleKeys<T> = Exclude<keyof T, keyof any[]>

export type SafeInd<T, K extends keyof Base, Base = T> = Extract<T, Base> extends never
  ? never
  : Extract<T, Base>[K]

export type NoDuplicates<T extends string> = { "NO DUPLICATE KEYS ALLOWED": T }
export type ColumnsObj<T> = {
  [K in TupleKeys<T>]: Extract<T[K], BaseColumn | AllCols<any, string>>
}

export type ColumnsWithTableName<
  T extends ValsAre<T, BaseColumn>,
  TblName extends string
> = { [K in keyof T]: T[K]["_tableAs"] extends Literal<TblName> ? T[K] : never }[keyof T]

export type OutputColumns<
  T extends ValsAre<T, BaseColumn>,
  TableNames extends string,
  OrType = never,
  Cols extends BaseColumn = ColumnsWithTableName<T, TableNames>
> = {
  [K in SafeInd<Cols, "_columnAs">]: Cols extends { ["_columnAs"]: K }
    ? t.TypeOf<Cols["type"]> | OrType
    : never
}

export type ArrayToUnion<
  T extends ValsAre<T, BaseColumn | { columns: Record<string, BaseColumn> }>
> = {
  [K in keyof T]: T[K] extends BaseColumn
    ? T[K]
    : T[K] extends { columns: any }
      ? Extract<T[K]["columns"][keyof (T[K]["columns"])], BaseColumn>
      : never
}[keyof T]

export type SelectColumns<
  T extends ValsAre<T, BaseColumn | AllCols<any, string>>,
  Cols extends BaseColumn = ArrayToUnion<T>
> = {
  [K in SafeInd<Cols, "_columnAs">]: Cols extends { ["_columnAs"]: K } ? Cols : never
}

export type NoDupTable<T extends Table, TableNames extends string> = {
  ["_table"]: T["_tableAs"] extends TableNames ? never : string
}

export type ExecuteFunc<
  Cols extends Record<string, BaseColumn>,
  P,
  RT extends string,
  OT extends string,
  O = OutputColumns<Cols, RT> & OutputColumns<Cols, OT, null>
> = {} extends P ? () => Promise<O[]> : (args: P) => Promise<O[]>

export type DeepReadonly<T> = T extends ReadonlyArray<infer U>
  ? DeepReadonlyArray<U>
  : T extends SqlKind ? T : T extends object ? DeepReadonlyObject<T> : T

export interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

export type DeepReadonlyObject<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> }

export type BuilderState = DeepReadonly<{
  selFrom?: FromType
  selColumns: ColumnDeclaration[]
  selWhere?: Condition
  selWith: WithClause[]
  selGroupBy?: GroupBy
}>

export interface SelectStatement<
  Cols extends Record<string, BaseColumn> = {},
  P = {},
  GBC extends BaseColumn = BaseColumn
> extends SqlKind, BuilderState {
  _ignore: {
    _c: Cols
    _p: P
    _gbc: GBC
  }
  readonly sqlKind: "selectStatement"
}

export class SqlBuilder<
  Cols extends Record<string, BaseColumn>,
  P,
  RT extends string,
  OT extends string,
  WT extends ValsAre<WT, Table>,
  GBC extends BaseColumn,
  TblNames extends string = Literal<RT> | Literal<OT>
> implements SelectStatement<Cols, P> {
  readonly sqlKind = "selectStatement"
  _ignore!: {
    _c: Cols
    _p: P
    _gbc: GBC
  }

  private static readonly initialState: BuilderState = {
    selColumns: [],
    selWith: [],
  }

  get selFrom(): FromType {
    if (!this.state.selFrom) {
      throw new Error("From tables was undefined")
    }
    return this.state.selFrom
  }

  get selColumns(): ReadonlyArray<ColumnDeclaration> {
    return this.state.selColumns
  }

  get selWith(): ReadonlyArray<WithClause> {
    return this.state.selWith
  }

  get selWhere(): Condition | undefined {
    return this.state.selWhere
  }

  get table() {
    return this._withTables
  }

  get() {
    return this._withTables
  }

  execute: ExecuteFunc<Cols, P, RT, OT> = (((arg?: P) => {
    return this.plugin.execute(this, this.lookupParamNum, arg)
  }) as any) as ExecuteFunc<Cols, P, RT, OT>

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
    private readonly plugin: SqlPlugin,
    private readonly _withTables: WT = {} as WT
  ) {}

  static _init(plugin: SqlPlugin): SqlBuilder<{}, {}, never, never, {}, never> {
    return new SqlBuilder(SqlBuilder.initialState, plugin)
  }

  select<
    _Cols extends Record<string, BaseColumn>,
    _P,
    _RT extends string,
    _OT extends string,
    _WT extends ValsAre<_WT, Table>,
    _GBC extends BaseColumn
  >(
    cb: (subq: this) => SqlBuilder<_Cols, _P, _RT, _OT, _WT, _GBC>
  ): SqlBuilder<_Cols, _P, _RT, _OT, _WT, _GBC>
  select(): SqlBuilder<Cols, P, RT, OT, WT, GBC>
  select(cb?: (subq: this) => any): any {
    return cb ? cb(this) : this
  }

  from<_RT extends string, _OT extends string>(
    fromType: FromType<_RT, _OT>
  ): SqlBuilder<
    Cols,
    P,
    Literal<RT> | Literal<_RT>,
    Literal<OT> | Literal<_OT>,
    WT,
    GBC
  > {
    return this.next({
      ...this.state,
      selFrom: fromType,
    })
  }

  columns<
    C extends ReadonlyArray<BaseColumn | AllCols<any, string>> &
      {
        [K in keyof T]: T[K] extends BaseColumn
          ? (CheckGroupBy<GBC, T[K]> &
              (T[K]["_columnAs"] extends (
                | (ColumnNames<T[Exclude<keyof T, K>]>)
                | keyof Cols)
                ? NoDuplicates<SafeInd<T[K], "_columnAs">>
                : BaseColumn<TblNames>))
          : T[K] extends AllCols<{}, string>
            ? {
                columns: {
                  [K2 in keyof T[K]["columns"]]: CheckGroupBy<
                    GBC,
                    Extract<T[K]["columns"][K2], BaseColumn>
                  > &
                    (K2 extends (
                      | (ColumnNames<T[Exclude<keyof T, K>]>)
                      | keyof Cols
                      | Exclude<keyof T[K]["columns"], K2>)
                      ? NoDuplicates<K2>
                      : BaseColumn<TblNames>)
                }
              }
            : never
      } & { "0": any },
    T extends ColumnsObj<C> = ColumnsObj<C>
  >(cols: C): SqlBuilder<Cols & SelectColumns<T>, P, RT, OT, WT, GBC> {
    const colDecs = cols.reduce(
      (acc, col) => {
        if ("columns" in col) {
          return [
            ...acc,
            ...Object.keys(col.columns).map(
              colName => new ColumnDeclaration(col.columns[colName])
            ),
          ]
        } else {
          return [...acc, new ColumnDeclaration(col)]
        }
      },
      [] as ColumnDeclaration[]
    )
    return this.next({
      ...this.state,
      selColumns: [...this.state.selColumns, ...colDecs],
    })
  }

  where<CTbles extends TblNames, SP>(
    arg: Condition<CTbles, SP>
  ): SqlBuilder<Cols, P & SP, RT, OT, WT, GBC>
  where<CTbles extends TblNames, SP>(
    arg: ((subSelect: SqlBuilder<{}, {}, RT, OT, WT, GBC>) => Condition<CTbles, SP>)
  ): SqlBuilder<Cols, P & SP, RT, OT, WT, GBC>
  where(arg: Condition | ((arg2: any) => Condition)): any {
    const cond = isSqlPart(arg) ? arg : arg(this.next(SqlBuilder.initialState))

    return this.next({
      ...this.state,
      selWhere: cond,
    })
  }

  with<A extends string, WCols extends Record<string, BaseColumn>, WParams>(
    alias: A,
    withSelect: SelectStatement<WCols, WParams>
  ): SqlBuilder<
    Cols,
    P & WParams,
    RT,
    OT,
    WT & Record<A, Table<WCols, A, never, true>>,
    GBC
  > {
    const withClause = new WithClause(alias, withSelect)

    const newTableCols = withSelect.selColumns
      .map(it => it.col)
      .reduce((acc, c) => ({ ...acc, [c._columnAs]: c }), {})

    const newTable = table({ name: alias, columns: newTableCols })

    return this.next(
      {
        ...this.state,
        selWith: [...this.state.selWith, withClause],
      },
      newTable
    )
  }

  groupBy<_GBC extends BaseColumn>(
    groupByCols: _GBC[]
  ): SqlBuilder<Cols, P, RT, OT, WT, GBC | _GBC> {
    return this.next({
      ...this.state,
      selGroupBy: new GroupBy(groupByCols),
    })
  }

  private next(nextState: BuilderState, newWithTable?: Table): any {
    return new SqlBuilder(
      nextState,
      this.plugin,
      newWithTable
        ? { ...(this._withTables as object), [newWithTable._tableAs]: newWithTable }
        : this._withTables
    )
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

export function init(plugin: SqlPlugin): SqlBuilder<{}, {}, never, never, {}, never> {
  return SqlBuilder._init(plugin)
}

export class WithClause<A extends string = string> implements SqlKind {
  readonly sqlKind = "withClause"

  constructor(readonly alias: A, readonly withQuery: SelectStatement) {}
}

export interface SubQuery<
  T,
  _Cols extends Record<string, BaseColumn>,
  _P,
  _RT extends string,
  _OT extends string,
  _WT extends ValsAre<_WT, Table>,
  _GBC extends BaseColumn
> {
  (arg: T): SqlBuilder<_Cols, _P, _RT, _OT, _WT, _GBC>
}

export type IsAggregated<GBC extends BaseColumn, C extends BaseColumn> = [GBC] extends [
  never
]
  ? C extends Aggregate<string, t.Any, string> ? true : false
  : true

export type CheckGroupBy<GBC extends BaseColumn, C extends BaseColumn> = IsAggregated<
  GBC,
  C
> extends false
  ? {}
  : C extends Aggregate<string, t.Any, string>
    ? {}
    : C extends GBC
      ? {}
      : GBC extends BaseColumn<C["_tableAs"], any, any, true> ? {} : never

type AnyHelper<T> = T extends any ? false : true

type IsAny<T> = boolean extends AnyHelper<T> ? true : false
type NotAny<T> = IsAny<T> extends true ? never : any

export function count(): Aggregate<never, t.NumberType, "count"> {
  return {} as any
}

export type AllCols<C extends ValsAre<C, InputCol>, TN extends string> = {
  _tableName: TN
  columns: TableColumns<TN, C, false>
}

export declare function all<C extends ValsAre<C, InputCol>, TN extends string>(
  table: Table<C, TN>
): AllCols<C, TN>

export type ColumnNames<
  T extends BaseColumn | AllCols<any, string>
> = T extends BaseColumn
  ? SafeInd<T, "_columnAs">
  : T extends AllCols<any, string> ? keyof SafeInd<T, "columns"> : never
