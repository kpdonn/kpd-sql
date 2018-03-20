import * as t from "io-ts"
import { tblSym, colSym, tySym } from "./implementation"
import { Table, ColInfo, Condition } from "./table"

export type ArrayKeys = keyof any[]

export type TupleKeys<T> = Exclude<keyof T, ArrayKeys>

export type TabCols<T extends { [index: string]: ColInfo }, K extends keyof T, U extends string> = {
  [P in K]: T[P][tblSym] extends U ? P : never
}[K]
export type Grab<
  T extends { [index: string]: ColInfo },
  K extends keyof T,
  U extends string
> = GetVal<T[TabCols<T, K, U>][colSym], T>

export type GetVal<N extends string, T extends { [index: string]: ColInfo }> = {
  [K in N]: FilterVal<K, T[keyof T]>
}

export type TypeCol<N extends string, U extends t.Any> = { name: N; type: U }

export type FilterVal<N extends string, T extends ColInfo> = T extends TypeCol<N, infer U>
  ? t.TypeOf<U>
  : never

export interface SQLFrom<Tables extends Table = never, OptTables extends Table = never, Cols = {}> {
  from<T extends Table>(table: T): SQLJoin<Tables | T, OptTables, Cols>
}

export type GCol<C extends ColInfo> = C

export interface SQLSelect<
  RT extends Table,
  OT extends Table,
  Cols,
  TblNames extends string = (RT | OT)[tblSym]
> {
  select<
    C extends {
      [K in TupleKeys<C>]: C[K] extends GCol<infer U>
        ? (U[colSym] extends (
            | (C[Exclude<TupleKeys<C>, K>] extends GCol<infer X> ? X[colSym] : never)
            | keyof Cols)
            ? ([Exclude<TupleKeys<C>, K> | keyof Cols] extends [never] ? ColInfo<TblNames> : never)
            : ColInfo<TblNames>)
        : never
    } & { "0": any }
  >(
    cols: C
  ): SQLSelectAndWhere<
    RT,
    OT,
    Cols & Grab<C, TupleKeys<C>, RT[tblSym]> & Partial<Grab<C, TupleKeys<C>, OT[tblSym]>>
  >
}

export interface SQLSelectAndWhere<RT extends Table, OT extends Table, Cols>
  extends SQLSelect<RT, OT, Cols>,
    SQLWhere<RT, OT, Cols> {}

export interface SQLJoin<
  RT extends Table,
  OT extends Table,
  Cols,
  TblNames extends string = (RT | OT)[tblSym]
> extends SQLSelect<RT, OT, Cols> {
  join<T extends Table, LCol extends ColInfo<TblNames>>(
    table: T,
    left: LCol,
    right: ColInfo<T[tblSym], LCol[tySym]>
  ): SQLJoin<RT | T, OT, Cols>

  leftJoin<T extends Table, LCol extends ColInfo<TblNames>>(
    table: T,
    left: LCol,
    right: ColInfo<T[tblSym], LCol[tySym]>
  ): SQLJoin<RT, OT | T, Cols>
}

export interface SQLExecute<RT extends Table, OT extends Table, Cols> {
  execute(): [Cols]
  toSql(): string
}

export interface SQLWhere<
  RT extends Table,
  OT extends Table,
  Cols,
  TblNames extends string = (RT | OT)[tblSym]
> extends SQLExecute<RT, OT, Cols> {
  where<C extends ColInfo<TblNames>, C2 extends ColInfo<TblNames, C[tySym]>>(
    cond: Condition<C, C2>
  ): SQLWhere<RT, OT, Cols>
}
