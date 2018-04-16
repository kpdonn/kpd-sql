import { all, count, SqlBuilder } from "../src/everything"
import { Class, Course, Student } from "./tables"

declare const db: SqlBuilder<{}, {}, never, never, {}, never>

async function tests() {
  const query = db
    .select()
    .from(Class)
    .groupBy([Class.id, Class.courseId])
    .columns([Class.semesterId])

  {
    const test9 = db
      .select()
      .from(
        Student.leftJoin(
          Class.join(Course, Course.id.eq(Class.courseId)),
          Student.majorId.eq(Course.subjectId)
        )
      )
  }

  {
    const test: Array<{
      id: number
      firstName: string
      lastName: string
      majorId: number | null
    }> = await db
      .select()
      .from(
        Student.leftJoin(
          Class.join(Course, Course.id.eq(Class.courseId)),
          Student.majorId.eq(Course.subjectId)
        )
      )
      .columns([Student["*"]])
      .execute()
  }

  {
    const test = db
      .select()
      .from(Class)
      .groupBy([Class.id])
      .columns([Class["*"]])
  }

  {
    const test = db
      .select()
      .from(Class)
      .columns([count()])
  }

  {
    const test = db
      .select()
      .from(Class)
      .groupBy([Class.id])
      .columns([Class.id, count()])
  }

  {
    const test: Array<{
      count: number
    }> = await db
      .select()
      .from(Student)
      .columns([count()])
      .execute()
  }
}
