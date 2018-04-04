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
  TableWithColumns,
  Literal,
} from "./utils"
import { Column } from "./table"
import { Condition } from "./condition"

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
> = { [K in keyof T]: T[K][tblAsSym] extends Literal<TblName> ? T[K] : never }[keyof T]

export type ColsObj<
  T extends Record<string, Column>,
  TableNames extends string,
  Cols extends Column = ColumnsWithTableName<T, TableNames>
> = {
  [K in SafeInd<Cols, colAsSym>]: Cols extends { [colAs]: K }
    ? t.TypeOf<Cols[tySym]>
    : never
}

export type NoDupTable<T extends TableWithColumns, TableNames extends string> = {
  [tbl]: T[tblAsSym] extends TableNames ? never : string
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

export interface SqlBuilder<
  RT extends string = never,
  OT extends string = never,
  Cols = {},
  P = {},
  TblNames extends string = Literal<RT> | Literal<OT>
> {
  execute: ExecuteArgs<P, Cols>

  from<T extends TableWithColumns & NoDupTable<T, TblNames>>(
    table: T
  ): SqlBuilder<RT | T[tblAsSym], OT, Cols, P>

  columns<
    C extends {
      [K in keyof T]: T[K][colAsSym] extends (
        | (SafeInd<T[Exclude<keyof T, K>], colAsSym>)
        | keyof Cols)
        ? NoDuplicates<SafeInd<T[K], colAsSym>>
        : Column<TblNames>
    } & { "0": any },
    T extends ColumnsObj<C> = ColumnsObj<C>
  >(
    cols: C
  ): SqlBuilder<RT, OT, Cols & ColsObj<T, RT> & Partial<ColsObj<T, OT>>, P>

  join<T extends TableWithColumns & NoDupTable<T, TblNames>>(
    table: T,
    cond: Condition<TblNames | T[tblAsSym]>
  ): SqlBuilder<RT | T[tblAsSym], OT, Cols, P>

  leftJoin<T extends TableWithColumns & NoDupTable<T, TblNames>>(
    table: T,
    cond: Condition<TblNames | T[tblAsSym]>
  ): SqlBuilder<RT, OT | T[tblAsSym], Cols, P>

  where<CTbles extends TblNames, SP>(
    cond: Condition<CTbles, SP>
  ): SqlBuilder<RT, OT, Cols, P & SP>

  whereSub<CTbles extends TblNames, SP>(
    cond: (subSelect: SqlBuilder<RT, OT, {}>) => Condition<CTbles, SP>
  ): SqlBuilder<RT, OT, Cols, P & SP>

  toSql(): string
}
