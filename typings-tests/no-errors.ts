import { SqlBuilder } from "../src/everything"
import { Class, Student, Course } from "./tables"

declare const db: SqlBuilder<{}, {}, never, never, {}, never>

const query = db
  .select()
  .from(Class)
  .groupBy([Class.id, Class.courseId])
  .columns([Class.semesterId])

const test9 = db
  .select()
  .from(
    Student.leftJoin(
      Class.join(Course, Course.id.eq(Class.courseId)),
      Student.majorId.eq(Course.subjectId)
    )
  )
