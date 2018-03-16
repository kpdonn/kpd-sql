import * as t from "io-ts"

export declare const tableName: unique symbol

export interface Columns {
  [key: string]: { type: t.Mixed }
}

export interface Table {
  [tableName]: string
}
export interface Col<TN extends string = any> {
  name: string
  type: t.Mixed
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

export interface SQLSelect<Tables extends Table, OptTables extends Table, Cols> {
  select<
    C extends {
      [K in TupleKeys<C>]: C[K] extends GCol<infer U>
        ? (U["name"] extends (C[Exclude<TupleKeys<C>, K>] extends GCol<infer X> ? X["name"] : never)
            ? never
            : Col<(Tables | OptTables)[typeof tableName]>)
        : never
    } & { "0": any }
  >(
    cols: C
  ): SQLSelect<
    Tables,
    OptTables,
    Cols &
      Grab<C, TupleKeys<C>, Tables[typeof tableName]> &
      Partial<Grab<C, TupleKeys<C>, OptTables[typeof tableName]>>
  >

  execute(): [Cols]
}

export interface SQLJoin<Tables extends Table, OptTables extends Table, Cols>
  extends SQLSelect<Tables, OptTables, Cols> {
  join<T extends Table>(
    table: T,
    left: Col<Tables[typeof tableName]>,
    right: Col<T[typeof tableName]>
  ): SQLJoin<Tables | T, OptTables, Cols>

  leftJoin<T extends Table>(
    table: T,
    left: Col<Tables[typeof tableName]>,
    right: Col<T[typeof tableName]>
  ): SQLJoin<Tables, OptTables | T, Cols>
}

export declare function buildSql(): SQLFrom
