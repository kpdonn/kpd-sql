import { table, column } from "../../../src/everything"
import * as t from "io-ts"

export const Subject = table({
  name: "subject",
  columns: {
    id: column(t.number, "id", true),
    name: column(t.string),
  },
})

export const Student = table({
  name: "student",
  columns: {
    id: column(t.number, "id", true),
    firstName: column(t.string, "first_name"),
    lastName: column(t.string, "last_name"),
    majorId: column(t.union([t.number, t.null]), "major_id"),
  },
})

export const Professor = table({
  name: "professor",
  columns: {
    id: column(t.number, "id", true),
    firstName: column(t.string, "first_name"),
    lastName: column(t.string, "last_name"),
    departmentId: column(t.number, "department_id"),
  },
})

export const Course = table({
  name: "course",
  columns: {
    id: column(t.number, "id", true),
    name: column(t.string),
    subjectId: column(t.number, "subject_id"),
    creditHours: column(t.number, "credit_hours"),
  },
})

export const Semester = table({
  name: "semester",
  columns: {
    id: column(t.number, "id", true),
    year: column(t.number),
  },
})

export const Class = table({
  name: "class",
  columns: {
    id: column(t.number, "id", true),
    courseId: column(t.number, "course_id"),
    semesterId: column(t.number, "semester_id"),
    professorId: column(t.number, "professor_id"),
  },
})

export const AssignmentType = table({
  name: "assignment_type",
  columns: {
    id: column(t.number, "id", true),
    name: column(t.string),
  },
})

export const Assignment = table({
  name: "assignment",
  columns: {
    id: column(t.number, "id", true),
    typeId: column(t.number, "type_id"),
    classId: column(t.number, "class_id"),
    pointsPossible: column(t.number, "points_possible"),
  },
})

export const StudentClass = table({
  name: "student_class",
  columns: {
    id: column(t.number, "id", true),
    studentId: column(t.number, "student_id"),
    classId: column(t.number, "class_id"),
  },
})

export const StudentAssignment = table({
  name: "student_assignment",
  columns: {
    id: column(t.number, "id", true),
    studentId: column(t.number, "student_id"),
    assignmentId: column(t.number, "assignment_id"),
    points: column(t.number, "points"),
  },
})
