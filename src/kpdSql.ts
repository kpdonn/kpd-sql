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
  colAs,
} from "./implementation"
import { Table, ColInfo, Condition, Literal } from "./table"

export type ArrayKeys = keyof any[]

export type TupleKeys<T> = Exclude<keyof T, ArrayKeys>

export type TabCols<
  ColArr extends { [index: string]: ColInfo },
  ArrInd extends keyof ColArr,
  TblNames extends string
> = { [Ind in ArrInd]: ColArr[Ind][tblAsSym] extends TblNames ? Ind : never }[ArrInd]

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
  Cols = {},
  P = {}
> {
  from<T extends Table & NoDupTable<T, Tables>>(
    table: T
  ): SQLJoin<Tables | T[tblAsSym], OptTables, Cols, P>
}

export type GCol<C extends ColInfo> = C
export type SafeInd<T, K extends keyof Base, Base = T> = Extract<T, Base> extends never
  ? never
  : Extract<T, Base>[K]

export type NoDuplicates<T extends string> = { "NO DUPLICATE KEYS ALLOWED": T }
export type ColumnsObj<T> = { [K in TupleKeys<T>]: Extract<T[K], ColInfo> }

export interface SQLColumns<
  RT extends string,
  OT extends string,
  Cols = {},
  P = {},
  TblNames extends string = Literal<RT> | Literal<OT>
> {
  columns<
    C extends {
      [K in keyof T]: T[K][colAsSym] extends (
        | (SafeInd<T[Exclude<keyof T, K>], colAsSym>)
        | keyof Cols)
        ? NoDuplicates<SafeInd<T[K], colAsSym>>
        : ColInfo<TblNames>
    } & { "0": any },
    T extends ColumnsObj<C> = ColumnsObj<C>
  >(
    cols: C
  ): SQLSelectAndWhere<
    RT,
    OT,
    Cols &
      Grab<C, TupleKeys<C>, Literal<RT>> &
      EmptyIfNone<Partial<Grab<C, TupleKeys<C>, Literal<OT>>>>,
    P
  >
}

export type EmptyIfNone<T> = string extends keyof T
  ? {}
  : [keyof T] extends [never] ? {} : T

export interface SQLSelectAndWhere<RT extends string, OT extends string, Cols, P = {}>
  extends SQLColumns<RT, OT, Cols, P>,
    SQLWhere<RT, OT, Cols, P> {}

export type NoDupTable<T extends Table, TableNames extends string> = {
  [tbl]: T[tblAsSym] extends TableNames ? never : string
}
export interface SQLJoin<
  RT extends string,
  OT extends string,
  Cols,
  P = {},
  TblNames extends string = Literal<RT> | Literal<OT>
> extends SQLColumns<RT, OT, Cols, P> {
  join<T extends Table & NoDupTable<T, TblNames>, LCol extends ColInfo<TblNames>>(
    table: T,
    cond: Condition<TblNames | T[tblAsSym]>
  ): SQLJoin<RT | T[tblAsSym], OT, Cols, P>

  leftJoin<T extends Table & NoDupTable<T, TblNames>, LCol extends ColInfo<TblNames>>(
    table: T,
    cond: Condition<TblNames | T[tblAsSym]>
  ): SQLJoin<RT, OT | T[tblAsSym], Cols, P>
}

export type ExecuteArgs<P, Cols> = {} extends P
  ? () => Promise<Cols[]>
  : (args: P) => Promise<Cols[]>

export interface SQLExecute<RT extends string, OT extends string, Cols, P = {}>
  extends SQLReady<Cols> {
  execute: ExecuteArgs<P, Cols>
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
  P = {},
  TblNames extends string = Literal<RT> | Literal<OT>
> extends SQLExecute<RT, OT, Cols, P> {
  where<CTbles extends TblNames, SP>(
    cond: Condition<CTbles, SP>
  ): SQLWhere<RT, OT, Cols, P & SP>

  whereSub<CTbles extends TblNames, SP>(
    cond: (subSelect: SQLFrom<RT, OT, {}>) => Condition<CTbles, SP>
  ): SQLWhere<RT, OT, Cols, P & SP>
}
