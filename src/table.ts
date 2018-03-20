import * as t from "io-ts"
import { ty, tbl, col, tySym } from "./implementation"

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

export type Table<TN extends string = string> = {
  [tbl]: TN
}

export type TableOut<TN extends string, C extends InCol> = Table<TN> & TransformInCol<TN, C>

export function table<N extends string, C extends InCol>(arg: {
  name: N
  columns: C
}): TableOut<N, C> {
  const result: any = { [tbl]: arg.name }

  Object.keys(arg.columns).forEach(colName => {
    result[colName] = { [tbl]: arg.name, name: colName, ...arg.columns[colName] }
  })

  return result
}

export interface Condition<Col1 extends ColInfo, Col2 extends ColInfo> {
  readonly __col1: Col1
  readonly __col2: Col2
}

export type Comparisons<Col1 extends ColInfo> = {
  eq: <Type2 extends Col1[tySym], Col2 extends ColInfo<any, Type2>>(
    col2: Col2
  ) => Condition<Col1, Col2>
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

const comp = Book.id.eq(Book.year)
