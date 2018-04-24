import * as tsql from "../src/everything"
import { Class, Course, Semester, Student, StudentClass } from "./tables"
/* tslint:disable:no-shadowed-variable */

declare const db: tsql.SqlBuilder<{}, {}, never, never, {}, never>

async function test() {
  const test1 = db
    .select()
    .from(Class)
    .groupBy([Class.courseId])
    .columns([Class.semesterId])

  const test2 = db
    .with(
      "myWith",
      db
        .from(Class)
        .columns([Class.id, Class.courseId, Class.semesterId, Class.professorId])
    )
    .select(sq =>
      sq
        .from(sq.table.myWith)
        .groupBy([sq.table.myWith.id])
        .columns([sq.table.myWith.id, sq.table.myWith.courseId])
    )

  const test3 = db
    .select()
    .from(Class)
    .columns([Class.semesterId, Semester.year])

  const test4 = db
    .select()
    .from(Class)
    .columns([Class.semesterId, Class.courseId.as("semesterId")])

  const test5 = db
    .select()
    .from(Student)
    .columns([Student.firstName, Student.lastName])
    .where(Student.majorId.eq("wrong type"))

  const test6 = db
    .select()
    .from(Student)
    .columns([Student.firstName, Student.lastName])
    .where(Student.majorId.eq(tsql.param("myTest")))
    .execute()

  const test7 = db
    .select()
    .from(Student)
    .columns([Student.firstName, Student.lastName])
    .where(Student.majorId.eq(tsql.param("myTest")))
    .execute({ myTest: "wrong type" })

  declare const nonLiteralString: string

  const test8 = db
    .select()
    .from(Student)
    .columns([Student.firstName, Student.lastName])
    .where(Student.majorId.eq(tsql.param(nonLiteralString)))

  const test9 = db
    .select()
    .from(
      Student.leftJoin(
        Class.join(Course, Course.id.eq(Class.courseId)),
        Student.firstName.eq(Course.subjectId)
      )
    )
    .columns([Student.firstName, Student.lastName])

  const test10 = db
    .select()
    .from(Student)
    .columns([Student.firstName, Student.lastName])
    .where(Student.majorId.eq(tsql.param("myTest")))
    .execute({ wrongKey: 53 })

  const test11 = db
    .select()
    .from(Student)
    .columns([Student.firstName, Student.lastName])
    .where(Student.majorId.eq(tsql.param("myTest")))
    .execute({ myTest: null })

  {
    const test = await db
      .select()
      .from(
        Student.leftJoin(
          Class.join(Course, Course.id.eq(Class.courseId)),
          Student.majorId.eq(Course.subjectId)
        )
      )
      .columns([Class.id, Student["*"]])
      .execute()
  }

  {
    const test = await db
      .select()
      .from(
        Student.leftJoin(
          Class.join(Course, Course.id.eq(Class.courseId)),
          Student.majorId.eq(Course.subjectId)
        )
      )
      .columns([Class["*"], Student["*"]])
      .execute()
  }

  {
    const test = db
      .select()
      .from(Class)
      .groupBy([Class.courseId])
      .columns([Class["*"]])
  }

  {
    const test = db
      .select()
      .from(Class)
      .columns([Class.id, tsql.count()])
  }

  {
    const results: Array<{
      courses: {
        name: number
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
        tsql.sum(Course.creditHours),
        tsql.jsonAgg("courses", [Course["*"]]),
      ])
      .execute()
  }
  {
    const test = db
      .select()
      .from(Class)
      .groupBy([Class.id])
      .columns([tsql.jsonAgg("test", [Student.firstName])])
  }

  {
    const test = db
      .select()
      .from(Class)
      .groupBy([Class.id])
      .columns([Class.courseId.as("test"), tsql.jsonAgg("test", [Class.professorId])])
  }

  {
    const test = db
      .select()
      .from(Class)
      .groupBy([Class.id])
      .columns([
        Class.courseId,
        tsql.jsonAgg("test", [Class.professorId, Class.courseId.as("professorId")]),
      ])
  }

  {
    const test = db
      .select()
      .from(Class.join(StudentClass, StudentClass.classId.eq(Class.id)))
      .groupBy([Class.id])
      .columns([Class.courseId, tsql.jsonAgg("test", [Class["*"], StudentClass["*"]])])
  }

  {
    const test = db
      .select()
      .from(Class.join(StudentClass, StudentClass.classId.eq(Class.id)))
      .groupBy([Class.id])
      .columns([Class.courseId, tsql.jsonAgg("test", [Class["*"], StudentClass.id])])
  }

  {
    const test = db
      .select()
      .from(Class.join(StudentClass, StudentClass.classId.eq(Class.id)))
      .columns([Class.courseId, tsql.jsonAgg("test", [Class["*"]])])
  }

  {
    db.select().columns([Class.courseId, tsql.jsonAgg("test", [Class["*"]])])
  }

  {
    db.select().where(Student.majorId.eq(tsql.param("myTest")))
  }

  {
    db
      .select()
      .from(Class)
      .from(Student)
  }

  {
    db
      .select()
      .from(Class)
      .with()
  }

  {
    db.select().with()
  }

  {
    db
      .from(Class)
      .columns([Class["*"]])
      .groupBy([Class.id])
  }

  {
    db
      .from(Class)
      .columns([Class["*"]])
      .where(Class.id.isNotNull)
      .groupBy([Class.id])
  }
}
