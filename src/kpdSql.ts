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

export type TOut<N extends string, C extends Columns> = {
  [tableName]: N
} & { [K in keyof C]: { name: K; [tableName]: N; type: C[K]["type"] } }

export declare function table<N extends string, C extends Columns>(arg: {
  name: N
  columns: C
}): TOut<N, C>

export type ArrayKeys = keyof any[]

export type Grab<T extends { [index: string]: Col }, K extends keyof T> = GetVal<T[K]["name"], T>

export type GetVal<N extends string, T extends { [index: string]: Col }> = {
  [K in N]: FilterVal<K, T[keyof T]>
}

export type TypeCol<N extends string, U extends t.Any> = { name: N; type: U }

export type FilterVal<N extends string, T extends Col> = T extends TypeCol<N, infer U>
  ? t.TypeOf<U>
  : never

export interface SQLFrom<Tables extends Table = never, Cols = {}> {
  from<T extends Table>(table: T): SQLJoin<Tables | T, Cols>
}

export interface SQLSelect<Tables extends Table, Cols> {
  select<C extends Col<Tables[typeof tableName]>[] & { "0": any }>(
    cols: C
  ): SQLSelect<Tables, Cols & Grab<C, Exclude<keyof C, ArrayKeys>>>

  execute(): [Cols]
}

export interface SQLJoin<Tables extends Table, Cols> extends SQLSelect<Tables, Cols> {
  join<T extends Table>(
    table: T,
    left: Col<Tables[typeof tableName]>,
    right: Col<T[typeof tableName]>
  ): SQLJoin<Tables | T, Cols>
}

export declare function buildSql(): SQLFrom

declare function t1<A extends string[] & { "0": any }>(arr: A): { a: A }

declare const h: "hello"
declare const w: "world"
const r1 = t1([h, w])

declare function NoDupArr<
  A extends {
    [K in Exclude<keyof A, ArrayKeys>]: A[K] extends A[Exclude<keyof A, ArrayKeys | K>]
      ? never
      : any
  } & { "0": any }
>(value: A): A

declare const s1: "test"
declare const s2: "test"

const xD3 = NoDupArr([s1, s2]) // error
