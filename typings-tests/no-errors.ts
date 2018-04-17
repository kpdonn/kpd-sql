import { count, jsonAgg, SqlBuilder, sum } from "../src/everything"
import { Class, Course, Student, StudentClass } from "./tables"

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

  {
    const results: Array<{
      id: number
      firstName: string
      lastName: string
      majorId: number | null
      semesterId: number
      sum: number
      courses: {
        id: number
        name: string
        subjectId: number
        creditHours: number
      }
    }> = await db
      .select()
      .from(
        Student.join(StudentClass, Student.id.eq(StudentClass.studentId))
          .join(Class, Class.id.eq(StudentClass.classId))
          .join(Course, Course.id.eq(Class.courseId))
      )
      .groupBy([Student.id, Class.semesterId])
      .columns([
        Student["*"],
        Class.semesterId,
        sum(Course.creditHours),
        jsonAgg("courses", [Course["*"]]),
      ])
      .execute()
  }
}
