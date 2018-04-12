import { SqlBuilder } from "../src/everything"
import { Class } from "./tables"

declare const db: SqlBuilder<{}, {}, never, never, {}, never>

const query = db
  .select()
  .from(Class)
  .groupBy([Class.id, Class.courseId])
  .columns([Class.semesterId])
