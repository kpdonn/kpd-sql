import * as t from "io-ts"
import { ty, tbl, col, tySym, tblSym, tblAs, colAs } from "./implementation"
import { SQLExecute, SQLReady } from "./kpdSql"

export declare const condTbls: unique symbol
export type condTblsSym = typeof condTbls

export type InCol = { type: t.Any; dbName?: string }

export interface ColInfo<
  TN extends string = string,
  Type extends t.Any = t.Mixed,
  CN extends string = string,
  CAS extends string = string
> extends Comparisons<TN, Type> {
  [ty]: Type
  [tbl]: TN
  [col]: CN
  [colAs]: CAS
  as: AsCol<TN, Type, CN>
  toSql(): string
}

export interface AsCol<TN extends string, Type extends t.Any, CN extends string> {
  <NN extends string>(newName: NN): ColInfo<TN, Type, CN, NN>
}

export type LiteralOr<
  T extends undefined | string,
  D extends string
> = T extends undefined ? D : string extends T ? D : T

export type TransformInCol<TN extends string, C extends Record<string, InCol>> = {
  [K in keyof C]: ColInfo<TN, C[K]["type"], LiteralOr<C[K]["dbName"], K>, K>
}

export type Table<
  TN extends string = string,
  C extends Record<string, InCol> = {},
  AsName extends string = TN
> = {
  [tbl]: TN
  [tblAs]: string extends AsName ? TN : AsName
  as<NN extends string>(asName: NN): Table<TN, C, NN>
  toSql(): string
} & TransformInCol<string extends AsName ? TN : AsName, C>

export function table<
  N extends string,
  C extends {
    [K in keyof C]: { [P in keyof C[K]]: P extends keyof InCol ? C[K][P] : never } & InCol
  },
  AN extends string
>({
  name,
  columns,
  asName = name,
}: {
  name: N
  columns: C
  asName?: AN
}): Table<N, C, AN> {
  const result: any = {
    [tbl]: name,
    [tblAs]: asName,
    as<NN extends string>(newName: NN): Table<N, C, NN> {
      return table({
        name,
        columns,
        asName: newName,
      })
    },
    toSql(): string {
      return `${name} ${asName}`
    },
  }

  Object.keys(columns).forEach(colName => {
    result[colName] = new ColInfoImpl(
      (columns as any)[colName].dbName || colName,
      (columns as any)[colName].type,
      asName,
      colName
    )
  })

  return result
}

export class ColInfoImpl {
  [tbl]: string;
  [col]: string;
  [colAs]: string;

  [ty]: t.Any

  constructor(
    colName: string,
    type: t.Any,
    tblName: string,
    colAsName: string = colName
  ) {
    this[tbl] = tblName
    this[col] = colName
    this[ty] = type
    this[colAs] = colAsName
  }

  toSql(): string {
    return `${this[tbl]}.${this[col]} as "${this[colAs]}"`
  }

  as<NN extends string>(newName: NN): ColInfoImpl {
    return new ColInfoImpl(this[col], this[ty], this[tbl], newName)
  }

  eq(col2: ColInfo | any): any {
    return new ConditionImpl(this as any, "=", col2)
  }
}

export class ConditionImpl {
  left: string
  op: string
  right: string

  constructor(col1: ColInfo, op: string, col2: ColInfo | string | number | boolean) {
    this.left = `${col1[tbl]}.${col1[col]}`
    this.op = op
    if (typeof col2 === "string") {
      this.right = `'${col2}'`
    } else if (typeof col2 === "number" || typeof col2 === "boolean") {
      this.right = `${col2}`
    } else {
      this.right = `${col2[tbl]}.${col2[col]}`
    }
  }

  toSql(): string {
    return `${this.left} ${this.op} ${this.right}`
  }
}

export type Literal<T extends string> = string extends T ? never : T
export interface Condition<TblNames extends string, P = {}> {
  [condTbls]: TblNames

  and<SP, C extends Condition<any, SP>>(
    cond: C
  ): Condition<TblNames | C[condTblsSym], P & SP>
  or<SP, C extends Condition<any, SP>>(
    cond: C
  ): Condition<TblNames | C[condTblsSym], P & SP>

  toSql(): string
}

export type SqlParamName<N extends string> = {
  sqlParam: N
}

export type SqlParam<N extends string, T> = string extends N ? {} : Record<N, T>

export function param<N extends string>(param: N): SqlParamName<N> {
  return { sqlParam: param }
}

export type Comparisons<Col1Tbl extends string, Col1Type extends t.Any> = {
  not: Comparisons<Col1Tbl, Col1Type>

  eq<Col2 extends ColInfo<any, Col1Type>, SPN extends string>(
    col2: Col2 | t.TypeOf<Col1Type> | SqlParamName<SPN>
  ): Condition<Col1Tbl | Literal<Col2[tblSym]>, SqlParam<SPN, t.TypeOf<Col1Type>>>

  isNull(): Condition<Col1Tbl>

  in(
    val: t.TypeOf<Col1Type>[] | SQLReady<Record<string, t.TypeOf<Col1Type>>>
  ): Condition<Col1Tbl>
}

const Book = table({
  name: "book",
  columns: {
    id: { type: t.number },
    title: { type: t.string },
    year: { type: t.number },
    pages: { type: t.number },
    authorId: { type: t.number },
  },
})

export function column<T extends t.Any>(type: T, dbName?: string) {
  return { type, dbName }
}
