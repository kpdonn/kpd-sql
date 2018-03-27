import * as t from "io-ts"
import {
  tblSym,
  colSym,
  tySym,
  col,
  ty,
  tblAsSym,
  tblAs,
  tbl,
  colAsSym,
  colAs
} from "./implementation"
import { Table, ColInfo, Condition, Literal } from "./table"

export type ArrayKeys = keyof any[]

export type TupleKeys<T> = Exclude<keyof T, ArrayKeys>

export type TabCols<
  ColArr extends { [index: string]: ColInfo },
  ArrInd extends keyof ColArr,
  TblNames extends string
> = { [Ind in ArrInd]: ColArr[Ind][tblSym] extends TblNames ? Ind : never }[ArrInd]

export type Grab<
  ColArr extends { [index: string]: ColInfo },
  ArrInd extends keyof ColArr,
  TblNames extends string
> = [TabCols<ColArr, ArrInd, TblNames>] extends [never]
  ? {}
  : GetVal<ColArr[TabCols<ColArr, ArrInd, TblNames>][colAsSym], ColArr>

export type GetVal<
  ColNames extends string,
  ColArr extends { [index: string]: ColInfo }
> = { [K in ColNames]: FilterVal<K, ColArr[keyof ColArr]> }

export type TypeCol<N extends string, U extends t.Any> = { [colAs]: N; [ty]: U }

export type FilterVal<N extends string, T extends ColInfo> = T extends TypeCol<N, infer U>
  ? t.TypeOf<U>
  : never

export interface SQLFrom<
  Tables extends string = never,
  OptTables extends string = never,
  Cols = {}
> {
  from<T extends Table & NoDupTable<T, Tables>>(
    table: T
  ): SQLJoin<Tables | T[tblAsSym], OptTables, Cols>
}

export type GCol<C extends ColInfo> = C

export interface SQLColumns<
  RT extends string,
  OT extends string,
  Cols = {},
  TblNames extends string = Literal<RT> | Literal<OT>
> {
  columns<
    C extends {
      [K in TupleKeys<C>]: C[K] extends GCol<infer U>
        ? (U[colAsSym] extends (
            | (C[Exclude<TupleKeys<C>, K>] extends GCol<infer X> ? X[colAsSym] : never)
            | keyof Cols)
            ? ([Exclude<TupleKeys<C>, K> | keyof Cols] extends [never]
                ? ColInfo<TblNames>
                : never)
            : ColInfo<TblNames>)
        : never
    } & { "0": any }
  >(
    cols: C
  ): SQLSelectAndWhere<
    RT,
    OT,
    Cols &
      Grab<C, TupleKeys<C>, Literal<RT>> &
      EmptyIfNone<Partial<Grab<C, TupleKeys<C>, Literal<OT>>>>
  >
}

export type EmptyIfNone<T> = string extends keyof T
  ? {}
  : [keyof T] extends [never] ? {} : T

export interface SQLSelectAndWhere<RT extends string, OT extends string, Cols>
  extends SQLColumns<RT, OT, Cols>,
    SQLWhere<RT, OT, Cols> {}

export type NoDupTable<T extends Table, TableNames extends string> = {
  [tbl]: T[tblAsSym] extends TableNames ? never : string
}
export interface SQLJoin<
  RT extends string,
  OT extends string,
  Cols,
  TblNames extends string = Literal<RT> | Literal<OT>
> extends SQLColumns<RT, OT, Cols> {
  join<T extends Table & NoDupTable<T, TblNames>, LCol extends ColInfo<TblNames>>(
    table: T,
    cond: Condition<TblNames | T[tblAsSym]>
  ): SQLJoin<RT | T[tblAsSym], OT, Cols>

  leftJoin<T extends Table & NoDupTable<T, TblNames>, LCol extends ColInfo<TblNames>>(
    table: T,
    cond: Condition<TblNames | T[tblAsSym]>
  ): SQLJoin<RT, OT | T[tblAsSym], Cols>
}

export interface SQLExecute<RT extends string, OT extends string, Cols>
  extends SQLReady<Cols> {
  execute(): Promise<Cols[]>
  toSql(): string
}

export declare const sqlReady: unique symbol
export interface SQLReady<Cols> {
  [sqlReady]: Cols
}

export interface SQLWhere<
  RT extends string,
  OT extends string,
  Cols,
  TblNames extends string = Literal<RT> | Literal<OT>
> extends SQLExecute<RT, OT, Cols> {
  where<CTbles extends TblNames>(cond: Condition<CTbles>): SQLWhere<RT, OT, Cols>

  whereSub<CTbles extends TblNames>(
    cond: (subSelect: SQLFrom<RT, OT, {}>) => Condition<CTbles>
  ): SQLWhere<RT, OT, Cols>
}
