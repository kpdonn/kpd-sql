import { Literal, tblAsSym, ColType, tySym, SqlParam, SqlParamName } from "./utils"
import { Column } from "./table"

export const condTbls: unique symbol = Symbol("conditionTables")
export type cts = typeof condTbls
export const cp: unique symbol = Symbol("conditionParams")
export type cps = typeof cp

export type ConditionType = EqCondition | AndCondition | OrCondition

export abstract class Condition<CT extends string = string, P = {}> {
  readonly [condTbls]: CT;
  readonly [cp]: P
  abstract readonly kind: Literal<ConditionType["kind"]>

  and<C extends Condition>(cond: C): Condition<CT | C[cts], P & C[cps]> {
    return new AndCondition(this, cond)
  }
  or<C extends Condition>(cond: C): Condition<CT | C[cts], P & C[cps]> {
    return new OrCondition(this, cond)
  }
}

export class AndCondition<CT extends string = string, P = {}> extends Condition<CT, P> {
  readonly kind = "and"
  constructor(readonly left: Condition, readonly right: Condition) {
    super()
  }
}

export class OrCondition<CT extends string = string, P = {}> extends Condition<CT, P> {
  readonly kind = "or"

  constructor(readonly left: Condition, readonly right: Condition) {
    super()
  }
}

export class EqCondition<
  Col1 extends Column = Column,
  Col2 extends Column<string, Col1[tySym]> = never,
  SPN extends string = never
> extends Condition<
  Col1[tblAsSym] | Literal<Col2[tblAsSym]>,
  SqlParam<SPN, ColType<Col1>>
> {
  readonly kind = "eq"

  constructor(
    readonly left: Col1,
    readonly right: Col2 | ColType<Col1> | SqlParamName<SPN>
  ) {
    super()
  }
}
