import * as t from "io-ts"
import { tn, cn, typeSym } from "./implementation"

export type TypeSym = typeof typeSym

export type InCol<CN extends string = string, Type extends t.Any = t.Mixed> = Record<
  CN,
  { type: Type }
>

export type ColInfo<
  Type extends t.Any = t.Mixed,
  CN extends string = string,
  TN extends string = string
> = {
  [typeSym]: Type
  [tn]: TN
  [cn]: CN
}

export type OutCol<
  Type extends t.Any = t.Mixed,
  CN extends string = string,
  TN extends string = string,
  ThisCol extends ColInfo = ColInfo<Type, CN, TN>
> = ThisCol & { as: AsCol<Type, TN> } & Comparisons<ThisCol>

export type AsCol<Type extends t.Any, TN extends string> = <NN extends string>(
  newName: NN
) => OutCol<Type, NN, TN>

export type TransformInCol<TN extends string, C extends InCol> = {
  [K in keyof C]: OutCol<C[K]["type"], K, TN>
}

export type TableOut<TN extends string, C extends InCol> = {
  [tn]: TN
} & TransformInCol<TN, C>

declare function table<N extends string, C extends InCol>(arg: {
  name: N
  columns: C
}): TableOut<N, C>

export interface Condition<Col1 extends ColInfo, Col2 extends ColInfo> {
  readonly __col1: Col1
  readonly __col2: Col2
}

export type Comparisons<Col1 extends ColInfo> = {
  eq: <Type2 extends Col1[TypeSym], Col2 extends ColInfo<Type2>>(
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
