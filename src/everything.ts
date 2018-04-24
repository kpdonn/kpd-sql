import * as t from "io-ts"

export type Literal<
  T extends PropertyKey | undefined | null,
  NN extends NonNullable<T> = NonNullable<T>
> = string extends NN ? never : number extends NN ? never : symbol extends NN ? never : NN

export type SqlParam<N extends string, T> = string extends N ? {} : Record<N, T>

export type unknown = {} | null | undefined

export interface InputCol<T extends t.Any = t.Any, U extends boolean = boolean> {
  type: T
  dbName?: string
  unique: U
}

export type TableColumns<TN extends string, C extends Record<string, InputCol>> = {
  readonly [K in Extract<keyof C, string>]: TableColumn<
    TN,
    K,
    C[K]["unique"],
    t.TypeOf<C[K]["type"]>
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
  CAS extends string = string,
  U extends boolean = boolean,
  ATY extends unknown = unknown
> =
  | TableColumn<TN, CAS, U, ATY>
  | Aggregate<TN, CAS, ATY>
  | CountAggregate<TN, CAS>
  | JsonAggregate<TN, CAS>

export type Parameterized = PlaceholderParam | Hardcoded

export interface SqlKind {
  readonly sqlKind: Literal<SqlPart["sqlKind"]>
}

export function isSqlPart(obj: any): obj is SqlPart {
  return typeof obj.sqlKind === "string"
}

export class ColumnDeclaration implements SqlKind {
  readonly sqlKind = "columnDeclaration"

  constructor(readonly col: Column) {}
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
    // tslint:disable-next-line:no-shadowed-variable
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
    // tslint:disable-next-line:no-shadowed-variable
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
  C extends ValsAre<C, Column>
> extends FromTable<AN, OT> implements SqlKind {
  readonly sqlKind = "table"
  constructor(readonly _table: string, readonly _tableColumns: C, readonly _tableAs: AN) {
    super()
    Object.assign(this, _tableColumns)
  }

  get "*"(): AllCols<C, AN> {
    return all(this as any)
  }
}

export type ValsAre<T, V> = { [K in keyof T]: V }

export type Table<
  C extends Record<string, Column> = Record<string, Column>,
  AsName extends string = string,
  OT extends string = never
> = PrivateTable<AsName, OT, C> & C

export interface TableConstructor {
  new <C extends ValsAre<C, Column>, AsName extends string>(
    _table: string,
    _columns: C,
    _tableAs: AsName
  ): Table<C, AsName>
}
export const Table: TableConstructor = PrivateTable as TableConstructor

export function table<C extends ValsAre<C, InputCol>, N extends string>(arg: {
  name: N
  columns: C
}): Table<TableColumns<N, C>, N> {
  const _tableColumns: Record<string, Column> = {}

  Object.keys(arg.columns).forEach((colName: string & keyof C) => {
    _tableColumns[colName] = new TableColumn(
      arg.columns[colName].dbName || colName,
      arg.columns[colName].type,
      colName,
      arg.columns[colName].unique,
      arg.name
    )
  })

  return new Table(arg.name, _tableColumns, arg.name) as Table<TableColumns<N, C>, N>
}

export abstract class BaseColumn<
  TN extends string = string,
  CAS extends string = string,
  U extends boolean = boolean,
  ATY extends unknown = unknown
> {
  readonly _actualType!: ATY

  constructor(
    readonly type: t.Any,
    readonly _columnAs: CAS,
    readonly unique: U,
    readonly _tableAs?: TN,
    protected readonly _isNot: boolean = false
  ) {}

  abstract get not(): BaseColumn<TN, CAS, U, ATY>

  eq<Col2 extends Column<string, string, boolean, NonNullable<ATY>>, SPN extends string>(
    col2: Col2 | ATY | PlaceholderParam<SPN>
  ): Condition<
    TN | Literal<NonNullable<Col2["_tableAs"]>>,
    SqlParam<SPN, NonNullable<ATY>>
  > {
    return EqCondition.create(this as any, col2, this._isNot) as any
  }

  in<C extends ValsAre<C, Column<string, string, boolean, ATY>>, P, SPN extends string>(
    rightArg: SelectStatement<C, P> | ATY[] | PlaceholderParam<SPN>
  ): Condition<TN, P & SqlParam<SPN, NonNullable<ATY>>> {
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
  TN extends string = string,
  CAS extends string = string,
  ATY extends unknown = unknown
> extends BaseColumn<TN, CAS, false, ATY> implements SqlKind {
  readonly sqlKind = "aggregate"

  readonly unique = false

  constructor(
    type: t.Any,
    _columnAs: CAS,
    readonly funcName: string,
    readonly _aggColumn: Column<TN> | Array<Column<TN>>,
    _isNot: boolean = false
  ) {
    super(type, _columnAs, false, undefined, _isNot)
  }

  get not(): Aggregate<TN, CAS, ATY> {
    return new Aggregate(
      this.type,
      this._columnAs,
      this.funcName,
      this._aggColumn,
      !this._isNot
    )
  }
}

export class CountAggregate<TN extends string = never, CAS extends string = "count">
  extends BaseColumn<TN, CAS, false, number>
  implements SqlKind {
  readonly sqlKind = "countAggregate"
  readonly funcName = "count"

  readonly unique = false

  constructor(_columnAs: CAS, readonly _aggColumn?: Column<TN>, _isNot: boolean = false) {
    super(t.number, _columnAs, false, undefined, _isNot)
  }

  get not(): CountAggregate<TN, CAS> {
    return new CountAggregate(this._columnAs, this._aggColumn, !this._isNot)
  }
}

export class JsonAggregate<
  TN extends string = string,
  CAS extends string = string,
  ATY = {}
> extends BaseColumn<TN, CAS, false, ATY> implements SqlKind {
  readonly sqlKind = "jsonAggregate"
  readonly funcName = "json_agg"

  readonly unique = false

  constructor(
    _columnAs: CAS,
    readonly _aggColumns: ColumnDeclaration[],
    _isNot: boolean = false
  ) {
    super(t.number, _columnAs, false, undefined, _isNot)
  }

  get not(): JsonAggregate<TN, CAS, ATY> {
    return new JsonAggregate(this._columnAs, this._aggColumns, !this._isNot)
  }
}

export class TableColumn<
  TN extends string,
  CAS extends string,
  U extends boolean,
  ATY extends unknown = unknown
> extends BaseColumn<TN, CAS, U, ATY> implements SqlKind {
  readonly sqlKind = "column"

  constructor(
    readonly dbName: string,
    type: t.Any,
    _columnAs: CAS,
    unique: U,
    readonly _tableAs: TN,
    _isNot: boolean = false
  ) {
    super(type, _columnAs, unique, _tableAs, _isNot)
  }

  get not(): TableColumn<TN, CAS, U, ATY> {
    return new TableColumn(
      this.dbName,
      this.type,
      this._columnAs,
      this.unique,
      this._tableAs,
      !this._isNot
    )
  }

  as<NN extends string>(newName: NN): TableColumn<TN, NN, U, ATY> {
    return new TableColumn(
      this.dbName,
      this.type,
      newName,
      this.unique,
      this._tableAs,
      this._isNot
    )
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

  // tslint:disable-next-line:no-shadowed-variable
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

  // tslint:disable-next-line:no-shadowed-variable
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
    rightArg:
      | Column<string, string, boolean, Col1["_actualType"]>
      | NonNullable<Col1["_actualType"]>
      | PlaceholderParam,
    isNot: boolean
  ): EqCondition | NotCondition {
    return BaseCondition.wrapNot(new EqCondition(left, rightArg), isNot)
  }

  private constructor(readonly left: Column, rightArg: Column | {} | PlaceholderParam) {
    super()

    this.right = isSqlPart(rightArg) ? rightArg : new Hardcoded(rightArg)
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

    this.right = isSqlPart(rightArg) ? rightArg : new Hardcoded(rightArg)
  }
}

export class GroupBy<GBC extends Column = Column> implements SqlKind {
  readonly sqlKind = "groupBy"

  constructor(readonly columns: GBC[]) {}
}

export type TupleKeys<T> = Exclude<keyof T, keyof any[]>

export type SafeInd<T, K extends keyof Base, Base = T> = Extract<T, Base> extends never
  ? never
  : Extract<T, Base>[K]

export interface NoDuplicates<T extends PropertyKey> {
  "NO DUPLICATE KEYS ALLOWED": T
}
export type ColumnsObj<T> = {
  [K in TupleKeys<T>]: Extract<T[K], BaseColumn | AllCols<any, string>>
}

export type ColumnsWithTableName<
  T extends Record<string, BaseColumn>,
  TblName extends string
> = {
  [K in keyof T]: NonNullable<T[K]["_tableAs"]> extends Literal<TblName> ? T[K] : never
}[keyof T]

export type OutputColumns<
  T extends ValsAre<T, BaseColumn>,
  TableNames extends string,
  OrType = never,
  Cols extends BaseColumn = ColumnsWithTableName<T, TableNames>
> = {
  [K in SafeInd<Cols, "_columnAs">]: Cols extends { ["_columnAs"]: K }
    ? Cols["_actualType"] | OrType
    : never
}

export type ColumnsWithNoTableName<T extends Record<string, BaseColumn>> = {
  [K in keyof T]: [NonNullable<T[K]["_tableAs"]>] extends [never] ? T[K] : never
}[keyof T]

export type NoTableColumns<
  T extends ValsAre<T, BaseColumn>,
  Cols extends BaseColumn = ColumnsWithNoTableName<T>
> = {
  [K in SafeInd<Cols, "_columnAs">]: Cols extends { ["_columnAs"]: K }
    ? Cols["_actualType"]
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
  T extends ValsAre<T, BaseColumn | { columns: Record<string, BaseColumn> }>,
  Cols extends BaseColumn = ArrayToUnion<T>
> = {
  [K in SafeInd<Cols, "_columnAs">]: Cols extends { ["_columnAs"]: K } ? Cols : never
}

export interface NoDupTable<T extends Table, TableNames extends string> {
  ["_table"]: T["_tableAs"] extends TableNames ? never : string
}

export type ExecuteFunc<
  Cols extends Record<string, BaseColumn>,
  P,
  RT extends string,
  OT extends string,
  O = NoTableColumns<Cols> & OutputColumns<Cols, RT> & OutputColumns<Cols, OT, null>
> = {} extends P ? () => Promise<O[]> : (args: P) => Promise<O[]>

export type DeepReadonly<T> = T extends ReadonlyArray<infer U>
  ? DeepReadonlyArray<U>
  : T extends SqlKind ? T : T extends object ? DeepReadonlyObject<T> : T

export interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

export type DeepReadonlyObject<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> }

export interface BuilderState {
  readonly selFrom?: FromType
  readonly selColumns: ReadonlyArray<ColumnDeclaration>
  readonly selWhere?: Condition
  readonly selWith: ReadonlyArray<WithClause>
  readonly selGroupBy?: GroupBy
}

export interface SelectStatement<
  Cols extends Record<string, Column> = {},
  P = {},
  GBC extends Column = Column
> extends SqlKind, BuilderState {
  _ignore: {
    _c: Cols
    _p: P
    _gbc: GBC
  }
  readonly sqlKind: "selectStatement"
}

export type FuncWithNamesAndRest<T, FuncNames extends string> = {
  [K in keyof T]: T[K] extends Function ? (K extends FuncNames ? K : never) : K
}[keyof T]
export type BeforeSelect<T> = {
  [K in FuncWithNamesAndRest<T, "from" | "with" | "select">]: T[K]
}
export type BeforeFrom<T> = { [K in FuncWithNamesAndRest<T, "from">]: T[K] }
export type AfterFrom<T> = { [K in FuncWithNamesAndRest<T, "groupBy" | "columns">]: T[K] }
export type AfterGroupBy<T> = { [K in FuncWithNamesAndRest<T, "columns">]: T[K] }
export type AfterColumns<T> = {
  [K in FuncWithNamesAndRest<T, "columns" | "where" | "toSql" | "execute">]: T[K]
}
export type AfterWhere<T> = { [K in FuncWithNamesAndRest<T, "toSql" | "execute">]: T[K] }

export class SqlBuilder<
  Cols extends Record<string, Column>,
  P,
  RT extends string,
  OT extends string,
  WT extends ValsAre<WT, Table>,
  GBC extends Column,
  TblNames extends string = Literal<RT> | Literal<OT>
> implements SelectStatement<Cols, P> {
  readonly sqlKind = "selectStatement"
  _ignore!: {
    _c: Cols
    _p: P
    _gbc: GBC
    _RT: RT
    _OT: OT
    _WT: WT
    _TblNames: TblNames
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

  get selGroupBy() {
    return this.state.selGroupBy
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
    _Cols extends Record<string, Column>,
    _P,
    _RT extends string,
    _OT extends string,
    _WT extends ValsAre<_WT, Table>,
    _GBC extends Column
  >(
    cb: (
      subq: BeforeFrom<SqlBuilder<Cols, P, RT, OT, WT, GBC>>
    ) => AfterWhere<SqlBuilder<_Cols, _P, _RT, _OT, _WT, _GBC>>
  ): AfterWhere<SqlBuilder<_Cols, _P, _RT, _OT, _WT, _GBC>>
  select(): BeforeFrom<SqlBuilder<Cols, P, RT, OT, WT, GBC>>
  select(cb?: (subq: any) => any): any {
    return cb ? cb(this) : this
  }

  from<_RT extends string, _OT extends string>(
    fromType: FromType<_RT, _OT>
  ): AfterFrom<
    SqlBuilder<Cols, P, Literal<RT> | Literal<_RT>, Literal<OT> | Literal<_OT>, WT, GBC>
  > {
    return this.next({
      ...this.state,
      selFrom: fromType,
    })
  }

  columns<
    C extends ReadonlyArray<Column | AllCols<any, string>> &
      {
        [K in keyof T]: T[K] extends BaseColumn
          ? (CheckGroupBy<GBC, T[K], T> &
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
                    Extract<T[K]["columns"][K2], BaseColumn>,
                    T
                  > &
                    (K2 extends (
                      | (ColumnNames<T[Exclude<keyof T, K>]>)
                      | keyof Cols
                      | Exclude<keyof T[K]["columns"], K2>)
                      ? NoDuplicates<Extract<K2, PropertyKey>>
                      : BaseColumn<TblNames>)
                }
              }
            : never
      } & { "0": any },
    T extends ColumnsObj<C> = ColumnsObj<C>
  >(cols: C): AfterColumns<SqlBuilder<Cols & SelectColumns<T>, P, RT, OT, WT, GBC>> {
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
  ): AfterWhere<SqlBuilder<Cols, P & SP, RT, OT, WT, GBC>>
  where<CTbles extends TblNames, SP>(
    arg: ((subSelect: SqlBuilder<{}, {}, RT, OT, WT, GBC>) => Condition<CTbles, SP>)
  ): AfterWhere<SqlBuilder<Cols, P & SP, RT, OT, WT, GBC>>
  where(arg: Condition | ((arg2: any) => Condition)): any {
    const cond = isSqlPart(arg) ? arg : arg(this.next(SqlBuilder.initialState))

    return this.next({
      ...this.state,
      selWhere: cond,
    })
  }

  with<A extends string, WCols extends Record<string, Column>, WParams>(
    alias: A,
    withSelect: SelectStatement<WCols, WParams>
  ): BeforeSelect<
    SqlBuilder<
      Cols,
      P & WParams,
      RT,
      OT,
      WT & Record<A, Table<TransformColumns<WCols, A>, A, never>>,
      GBC
    >
  > {
    const withClause = new WithClause(alias, withSelect)

    const newTableCols = withSelect.selColumns
      .map(it => it.col)
      .map(it => new TableColumn(it._columnAs, it.type, it._columnAs, false, alias))
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

  groupBy<_GBC extends Column>(
    groupByCols: _GBC[]
  ): AfterGroupBy<SqlBuilder<Cols, P, RT, OT, WT, GBC | _GBC>> {
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

  // tslint:disable-next-line:no-shadowed-variable
  private lookupParamNum = (param: Parameterized): number => {
    if (!this.paramMap.has(param)) {
      this.paramMap.set(param, this.paramNumber++)
    }
    const paramNumber = this.paramMap.get(param)!
    return paramNumber
  }
}

export type LookupParamNum = (param: Parameterized) => number

export interface SqlPlugin {
  printSql(part: SqlPart, lpn: LookupParamNum): string
  execute(part: SqlPart, lpn: LookupParamNum, args?: object): Promise<any>
}

export function init(
  plugin: SqlPlugin
): BeforeSelect<SqlBuilder<{}, {}, never, never, {}, never>> {
  return SqlBuilder._init(plugin)
}

export class WithClause<A extends string = string> implements SqlKind {
  readonly sqlKind = "withClause"

  constructor(readonly alias: A, readonly withQuery: SelectStatement) {}
}

export type SubQuery<
  T,
  _Cols extends Record<string, Column>,
  _P,
  _RT extends string,
  _OT extends string,
  _WT extends ValsAre<_WT, Table>,
  _GBC extends Column
> = (arg: T) => SqlBuilder<_Cols, _P, _RT, _OT, _WT, _GBC>

export type IsAggregated<GBC extends BaseColumn, T> = [GBC] extends [never]
  ? [Extract<T[keyof T], Aggregate | CountAggregate | JsonAggregate>] extends [never]
    ? false
    : true
  : true

export type CheckGroupBy<GBC extends BaseColumn, C extends BaseColumn, T> = IsAggregated<
  GBC,
  T
> extends false
  ? {}
  : C extends Aggregate | CountAggregate | JsonAggregate
    ? {}
    : C extends GBC
      ? {}
      : GBC extends BaseColumn<NonNullable<C["_tableAs"]>, string, true> ? {} : never

type AnyHelper<T> = T extends any ? false : true

type IsAny<T> = boolean extends AnyHelper<T> ? true : false
type NotAny<T> = IsAny<T> extends true ? never : any

export function count(): CountAggregate<never, "count"> {
  return new CountAggregate("count")
}

export type TransformHelper<Col, TN extends string> = Col extends TableColumn<
  string,
  infer CAS,
  boolean,
  infer ATY
>
  ? TableColumn<TN, CAS, false, ATY>
  : Col extends Aggregate<string, infer CAS2, infer ATY2>
    ? Aggregate<TN, CAS2, ATY2>
    : Col extends CountAggregate<string, infer CAS3>
      ? CountAggregate<TN, CAS3>
      : Col extends JsonAggregate<string, infer CAS4, infer ATY4>
        ? JsonAggregate<TN, CAS4, ATY4>
        : never

export type TransformColumns<C extends Record<string, Column>, TN extends string> = {
  [K in keyof C]: TransformHelper<C[K], TN>
}

export interface AllCols<C extends Record<string, Column>, TN extends string> {
  _tableAs: TN
  columns: TransformColumns<C, TN>
}

export function all<C extends Record<string, Column>, TN extends string>(
  // tslint:disable-next-line:no-shadowed-variable
  table: Table<C, TN>
): AllCols<C, TN> {
  return {
    _tableAs: table._tableAs,
    columns: table._tableColumns as any,
  }
}

export type ColumnNames<
  T extends BaseColumn | AllCols<any, string>
> = T extends BaseColumn
  ? SafeInd<T, "_columnAs">
  : T extends AllCols<any, string> ? keyof SafeInd<T, "columns"> : never

export function sum<TN extends string = string, CAS extends string = string>(
  col: Column<TN, CAS, boolean, number>
): Aggregate<TN, "sum", number> {
  return new Aggregate(t.number, "sum", "sum", col)
}

export function jsonAgg<
  C extends ReadonlyArray<Column | AllCols<any, string>> &
    {
      [K in keyof T]: T[K] extends BaseColumn
        ? (T[K]["_columnAs"] extends (ColumnNames<T[Exclude<keyof T, K>]>)
            ? NoDuplicates<SafeInd<T[K], "_columnAs">>
            : BaseColumn)
        : T[K] extends AllCols<{}, string>
          ? {
              columns: {
                [K2 in keyof T[K]["columns"]]: K2 extends (
                  | (ColumnNames<T[Exclude<keyof T, K>]>)
                  | Exclude<keyof T[K]["columns"], K2>)
                  ? NoDuplicates<Extract<K2, PropertyKey>>
                  : BaseColumn
              }
            }
          : never
    } & { "0": any },
  T extends ColumnsObj<C> = ColumnsObj<C>,
  CAS extends string = string,
  Tbls extends {
    [K in keyof T]: Literal<SafeInd<T[K], "_tableAs", BaseColumn>>
  }[keyof T] = { [K in keyof T]: Literal<SafeInd<T[K], "_tableAs", BaseColumn>> }[keyof T]
>(name: CAS, cols: C): JsonAggregate<Tbls, CAS, JsonAggOutput<T>> {
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

  return new JsonAggregate(name, colDecs, cols as any)
}

export type JsonAggOutput<
  T extends ValsAre<T, BaseColumn | { columns: Record<string, BaseColumn> }>,
  Cols extends BaseColumn = ArrayToUnion<T>
> = {
  [K in SafeInd<Cols, "_columnAs">]: Cols extends { _columnAs: K }
    ? Cols["_actualType"]
    : never
}
