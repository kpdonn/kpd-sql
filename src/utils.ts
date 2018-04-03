import * as t from "io-ts"
import { Table, Column, Condition } from "./table"

export const tbl: unique symbol = Symbol("tableName")
export const tblAs: unique symbol = Symbol("tableAs")
export const col: unique symbol = Symbol("columnName")
export const colAs: unique symbol = Symbol("columnAs")
export const ty: unique symbol = Symbol("typeSymbol")
export const condTbls: unique symbol = Symbol("condTbls")

export type tblSym = typeof tbl
export type colSym = typeof col
export type colAsSym = typeof colAs
export type tySym = typeof ty
export type tblAsSym = typeof tblAs
export type condTblsSym = typeof condTbls

export type Literal<T extends string> = string extends T ? never : T

export type SqlParamName<N extends string> = Record<"sqlParam", N>
export type SqlParam<N extends string, T> = string extends N ? {} : Record<N, T>

export declare const sqlReady: unique symbol
export interface SQLReady<Cols> {
  [sqlReady]: Cols
}

export type Comparisons<Col1Tbl extends string, Col1Type extends t.Any> = {
  not: Comparisons<Col1Tbl, Col1Type>

  eq<Col2 extends Column<any, Col1Type>, SPN extends string>(
    col2: Col2 | t.TypeOf<Col1Type> | SqlParamName<SPN>
  ): Condition<Col1Tbl | Literal<Col2[tblAsSym]>, SqlParam<SPN, t.TypeOf<Col1Type>>>

  isNull(): Condition<Col1Tbl>

  in(
    val: t.TypeOf<Col1Type>[] | SQLReady<Record<string, t.TypeOf<Col1Type>>>
  ): Condition<Col1Tbl>
}

export type InCol = { type: t.Any; dbName?: string }

export type LiteralOr<
  T extends undefined | string,
  D extends string
> = T extends undefined ? D : string extends T ? D : T

export type TransformInCol<TN extends string, C extends Record<string, InCol>> = {
  readonly [K in keyof C]: Column<TN, C[K]["type"], LiteralOr<C[K]["dbName"], K>, K>
}

export type TableWithColumns<
  TN extends string = string,
  C extends Record<string, InCol> = Record<string, InCol>,
  AsName extends string = TN
> = Table<TN, C, AsName> & TransformInCol<AsName, C>
