import * as t from "io-ts"

export type Literal<T extends string> = string extends T ? never : T

export type SqlParam<N extends string, T> = string extends N ? {} : Record<N, T>

export type ColType<T extends Column> = t.TypeOf<T["type"]>

export type InputCol<T extends t.Any = t.Any, U extends boolean = boolean> = {
  type: T
  dbName?: string
  unique: U
}

export type TableColumns<TN extends string, C extends Record<string, InputCol>> = {
  readonly [K in keyof C]: Column<TN, C[K]["type"], K, C[K]["unique"]>
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
  | WithClause
  | SelectStatement
  | Condition
  | FromType
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
  C extends Record<string, InputCol>,
  AN extends string,
  OT extends string = never
> extends FromTable<AN, OT> implements SqlKind {
  readonly sqlKind = "table"

  constructor(
    readonly _table: string,
    private readonly _columns: C,
    readonly _tableAs: AN
  ) {
    super()
    for (const colName in _columns) {
      const thisColumns = (this as any) as NoRO<TableColumns<AN, C>>
      thisColumns[colName] = new Column(
        _tableAs,
        _columns[colName].dbName || colName,
        _columns[colName].type,
        colName,
        _columns[colName].unique
      )
    }
  }
}

type NoRO<T> = { -readonly [K in keyof T]: T[K] }

export type ValsAre<T, V> = { [K in keyof T]: V }

export type Table<
  C extends ValsAre<C, InputCol> = ValsAre<C, InputCol>,
  AsName extends string = string,
  OT extends string = never
> = PrivateTable<C, AsName, OT> & TableColumns<AsName, C>

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
  CAS extends string = string,
  U extends boolean = boolean
> implements SqlKind {
  readonly sqlKind = "column"

  constructor(
    readonly _tableAs: TN,
    readonly _column: string,
    readonly type: TY,
    readonly _columnAs: CAS,
    readonly unique: U,
    private readonly _isNot: boolean = false
  ) {}

  get not(): Column<TN, TY, CAS, U> {
    return new Column(
      this._tableAs,
      this._column,
      this.type,
      this._columnAs,
      this.unique,
      true
    )
  }

  as<NN extends string>(newName: NN): Column<TN, TY, NN, U> {
    return new Column(this._tableAs, this._column, this.type, newName, this.unique)
  }

  eq<Col2 extends Column<string, TY>, SPN extends string>(
    col2: Col2 | t.TypeOf<TY> | PlaceholderParam<SPN>
  ): Condition<TN | Literal<Col2["_tableAs"]>, SqlParam<SPN, t.TypeOf<TY>>> {
    return EqCondition.create(this, col2, this._isNot) as any
  }

  in<C extends ValsAre<C, Column<string, TY>>, P, SPN extends string>(
    rightArg: SelectStatement<C, P> | t.TypeOf<TY>[] | PlaceholderParam<SPN>
  ): Condition<TN, P & SqlParam<SPN, t.TypeOf<TY>>> {
    return InCondition.create(this, rightArg, this._isNot) as any
  }

  get isNull(): Condition<TN> {
    return IsNullCondition.create(this, this._isNot) as any
  }

  get isNotNull(): Condition<TN> {
    return IsNotNullCondition.create(this, this._isNot) as any
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

export type ArrayKeys = keyof any[]

export type TupleKeys<T> = Exclude<keyof T, ArrayKeys>

export type SafeInd<T, K extends keyof Base, Base = T> = Extract<T, Base> extends never
  ? never
  : Extract<T, Base>[K]

export type NoDuplicates<T extends string> = { "NO DUPLICATE KEYS ALLOWED": T }
export type ColumnsObj<T> = { [K in TupleKeys<T>]: Extract<T[K], Column> }

export type ColumnsWithTableName<T extends ValsAre<T, Column>, TblName extends string> = {
  [K in keyof T]: T[K]["_tableAs"] extends Literal<TblName> ? T[K] : never
}[keyof T]

export type OutputColumns<
  T extends ValsAre<T, Column>,
  TableNames extends string,
  OrType = never,
  Cols extends Column = ColumnsWithTableName<T, TableNames>
> = {
  [K in SafeInd<Cols, "_columnAs">]: Cols extends { ["_columnAs"]: K }
    ? t.TypeOf<Cols["type"]> | OrType
    : never
}

export type ArrayToUnion<T> = { [K in keyof T]: T[K] }[keyof T]

export type SelectColumns<
  T extends ValsAre<T, Column>,
  Cols extends Column = ArrayToUnion<T>
> = {
  [K in SafeInd<Cols, "_columnAs">]: Cols extends { ["_columnAs"]: K } ? Cols : never
}

export type NoDupTable<T extends Table, TableNames extends string> = {
  ["_table"]: T["_tableAs"] extends TableNames ? never : string
}

export type ExecuteFunc<
  Cols extends Record<string, Column>,
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
}>

export interface SelectStatement<Cols extends Record<string, Column> = {}, P = {}>
  extends SqlKind,
    BuilderState {
  _ignore: {
    _c: Cols
    _p: P
  }
  readonly sqlKind: "selectStatement"
}

export class SqlBuilder<
  Cols extends Record<string, Column>,
  P,
  RT extends string,
  OT extends string,
  WT extends ValsAre<WT, Table>,
  TblNames extends string = Literal<RT> | Literal<OT>
> implements SelectStatement<Cols, P> {
  readonly sqlKind = "selectStatement"
  _ignore!: {
    _c: Cols
    _p: P
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

  static _init(plugin: SqlPlugin): SqlBuilder<{}, {}, never, never, {}> {
    return new SqlBuilder(SqlBuilder.initialState, plugin)
  }

  select<
    _Cols extends Record<string, Column>,
    _P,
    _RT extends string,
    _OT extends string,
    _WT extends ValsAre<_WT, Table>
  >(
    cb: (subq: this) => SqlBuilder<_Cols, _P, _RT, _OT, _WT>
  ): SqlBuilder<_Cols, _P, _RT, _OT, _WT>
  select(): SqlBuilder<Cols, P, RT, OT, WT>
  select(cb?: (subq: this) => any): any {
    return cb ? cb(this) : this
  }

  from<_RT extends string, _OT extends string>(
    fromType: FromType<_RT, _OT>
  ): SqlBuilder<Cols, P, Literal<RT> | Literal<_RT>, Literal<OT> | Literal<_OT>, WT> {
    return this.next({
      ...this.state,
      selFrom: fromType,
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
  >(cols: C): SqlBuilder<Cols & SelectColumns<T>, P, RT, OT, WT> {
    const colDecs = cols.map(col => new ColumnDeclaration(col))
    return this.next({
      ...this.state,
      selColumns: [...this.state.selColumns, ...colDecs],
    })
  }

  where<CTbles extends TblNames, SP>(
    arg: Condition<CTbles, SP>
  ): SqlBuilder<Cols, P & SP, RT, OT, WT>
  where<CTbles extends TblNames, SP>(
    arg: ((subSelect: SqlBuilder<{}, {}, RT, OT, WT>) => Condition<CTbles, SP>)
  ): SqlBuilder<Cols, P & SP, RT, OT, WT>
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
  ): SqlBuilder<Cols, P & WParams, RT, OT, WT & Record<A, Table<WCols, A>>> {
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

export function init(plugin: SqlPlugin): SqlBuilder<{}, {}, never, never, {}> {
  return SqlBuilder._init(plugin)
}

export class WithClause<A extends string = string> implements SqlKind {
  readonly sqlKind = "withClause"

  constructor(readonly alias: A, readonly withQuery: SelectStatement) {}
}

export interface SubQuery<
  T,
  _Cols extends Record<string, Column>,
  _P,
  _RT extends string,
  _OT extends string,
  _WT extends ValsAre<_WT, Table>
> {
  (arg: T): SqlBuilder<_Cols, _P, _RT, _OT, _WT>
}

type AnyHelper<T> = T extends any ? false : true

type IsAny<T> = boolean extends AnyHelper<T> ? true : false
type NotAny<T> = IsAny<T> extends true ? never : any
