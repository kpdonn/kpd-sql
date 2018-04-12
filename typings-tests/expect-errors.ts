import { SqlBuilder, param } from "../src/everything"
import { Class, Semester, Student, Professor, Course } from "./tables"

declare const db: SqlBuilder<{}, {}, never, never, {}, never>

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
  .where(Student.majorId.eq(param("myTest")))
  .execute()

const test7 = db
  .select()
  .from(Student)
  .columns([Student.firstName, Student.lastName])
  .where(Student.majorId.eq(param("myTest")))
  .execute({ myTest: "wrong type" })

declare const nonLiteralString: string

const test8 = db
  .select()
  .from(Student)
  .columns([Student.firstName, Student.lastName])
  .where(Student.majorId.eq(param(nonLiteralString)))

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
  .where(Student.majorId.eq(param("myTest")))
  .execute({ wrongKey: 53 })
