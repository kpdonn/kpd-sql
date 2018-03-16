import * as t from "io-ts"

export declare const tableName: unique symbol

export interface Columns {
  [key: string]: { type: t.Mixed }
}

export interface Table {
  [tableName]: string
}
export interface Col<TN extends string = any, Type extends t.Any = t.Mixed> {
  name: string
  type: Type
  [tableName]: TN
}

export type ColOut<N extends string, C extends Columns> = {
  [K in keyof C]: {
    name: K
    [tableName]: N
    type: C[K]["type"]
    as<NN extends string>(newName: NN): { name: NN; [tableName]: N; type: C[K]["type"] }
  }
}

export type TOut<N extends string, C extends Columns> = {
  [tableName]: N
} & ColOut<N, C>

export declare function table<N extends string, C extends Columns>(arg: {
  name: N
  columns: C
}): TOut<N, C>

export type ArrayKeys = keyof any[]

export type TupleKeys<T> = Exclude<keyof T, ArrayKeys>

export type TabCols<T extends { [index: string]: Col }, K extends keyof T, U extends string> = {
  [P in K]: T[P][typeof tableName] extends U ? P : never
}[K]
export type Grab<T extends { [index: string]: Col }, K extends keyof T, U extends string> = GetVal<
  T[TabCols<T, K, U>]["name"],
  T
>

export type GetVal<N extends string, T extends { [index: string]: Col }> = {
  [K in N]: FilterVal<K, T[keyof T]>
}

export type TypeCol<N extends string, U extends t.Any> = { name: N; type: U }

export type FilterVal<N extends string, T extends Col> = T extends TypeCol<N, infer U>
  ? t.TypeOf<U>
  : never

export interface SQLFrom<Tables extends Table = never, OptTables extends Table = never, Cols = {}> {
  from<T extends Table>(table: T): SQLJoin<Tables | T, OptTables, Cols>
}

export type GCol<C extends Col> = C

export interface SQLSelect<RT extends Table, OT extends Table, Cols> {
  select<
    C extends {
      [K in TupleKeys<C>]: C[K] extends GCol<infer U>
        ? (U["name"] extends (C[Exclude<TupleKeys<C>, K>] extends GCol<infer X> ? X["name"] : never)
            ? never
            : Col<(RT | OT)[typeof tableName]>)
        : never
    } & { "0": any }
  >(
    cols: C
  ): SQLWhere<
    RT,
    OT,
    Cols &
      Grab<C, TupleKeys<C>, RT[typeof tableName]> &
      Partial<Grab<C, TupleKeys<C>, OT[typeof tableName]>>
  >
}

export interface SQLJoin<RT extends Table, OT extends Table, Cols> extends SQLSelect<RT, OT, Cols> {
  join<T extends Table, LCol extends Col<(RT | OT)[typeof tableName]>>(
    table: T,
    left: LCol,
    right: Col<T[typeof tableName], LCol["type"]>
  ): SQLJoin<RT | T, OT, Cols>

  leftJoin<T extends Table, LCol extends Col<(RT | OT)[typeof tableName]>>(
    table: T,
    left: LCol,
    right: Col<T[typeof tableName], LCol["type"]>
  ): SQLJoin<RT, OT | T, Cols>
}

export interface SQLExecute<RT extends Table, OT extends Table, Cols> {
  execute(): [Cols]
}

export interface SQLWhere<RT extends Table, OT extends Table, Cols>
  extends SQLExecute<RT, OT, Cols> {
  where<C extends Col<(RT | OT)[typeof tableName]>>(
    col: C,
    val: t.TypeOf<C["type"]> | Col<(RT | OT)[typeof tableName], C["type"]>
  ): SQLWhere<RT, OT, Cols>
}

export declare function buildSql(): SQLFrom
