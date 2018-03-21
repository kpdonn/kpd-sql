import * as t from "io-ts"
import { ty, tbl, col, tySym, tblSym, tblAs } from "./implementation"
import { SQLExecute, SQLReady } from "./kpdSql"

export declare const condTbls: unique symbol
export type condTblsSym = typeof condTbls

export type InCol<CN extends string = string, Type extends t.Any = t.Mixed> = Record<
  CN,
  { type: Type }
>

export type ColInfo<
  TN extends string = string,
  Type extends t.Any = t.Mixed,
  CN extends string = string
> = {
  [ty]: Type
  [tbl]: TN
  [col]: CN
}

export type OutCol<
  TN extends string = string,
  Type extends t.Any = t.Mixed,
  CN extends string = string,
  ThisCol extends ColInfo = ColInfo<TN, Type, CN>
> = ThisCol & { as: AsCol<Type, TN> } & Comparisons<ThisCol>

export type AsCol<Type extends t.Any, TN extends string> = <NN extends string>(
  newName: NN
) => OutCol<TN, Type, NN>

export type TransformInCol<TN extends string, C extends InCol> = {
  [K in keyof C]: OutCol<TN, C[K]["type"], K>
}

export type Table<
  TN extends string = string,
  C extends InCol = {},
  AsName extends string = TN
> = {
  [tbl]: TN
  [tblAs]: AsName
  as<NN extends string>(asName: NN): Table<TN, C, NN>
} & TransformInCol<AsName, C>

export function table<N extends string, C extends InCol>(arg: {
  name: N
  columns: C
}): Table<N, C> {
  const result: any = { [tbl]: arg.name }

  Object.keys(arg.columns).forEach(colName => {
    result[colName] = {
      [tbl]: arg.name,
      name: colName,
      ...arg.columns[colName]
    }
  })

  return result
}
export type Literal<T extends string> = string extends T ? never : T
export interface Condition<TblNames extends string> {
  [condTbls]: TblNames

  and<C extends Condition<any>>(cond: C): Condition<TblNames | C[condTblsSym]>
  or<C extends Condition<any>>(cond: C): Condition<TblNames | C[condTblsSym]>
}

export type Comparisons<Col1 extends ColInfo> = {
  not: Comparisons<Col1>

  eq<Col2 extends ColInfo<any, Col1[tySym]>>(
    col2: Col2 | t.TypeOf<Col1[tySym]>
  ): Condition<Col1[tblSym] | Literal<Col2[tblSym]>>

  isNull(): Condition<Col1[tblSym]>

  in(
    val: t.TypeOf<Col1[tySym]>[] | SQLReady<Record<string, t.TypeOf<Col1[tySym]>>>
  ): Condition<Col1[tblSym]>
}

const Book = table({
  name: "book",
  columns: {
    id: { type: t.number },
    title: { type: t.string },
    year: { type: t.number },
    pages: { type: t.number },
    authorId: { type: t.number }
  }
})
