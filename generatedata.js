var faker = require("faker")

// const num = 12
// for (let i = 0; i < num; i++) {
//   const subject = Math.floor(i / Math.ceil(num / 3)) + 1
//   console.log(
//     `('${faker.fake(
//       "{{company.catchPhraseAdjective}} {{company.bsNoun}}"
//     )}', ${subject}, ${faker.random.number(4) + 1}),`
//   )
// }

// const num = 12
// for (let i = 1; i <= num; i++) {
//   for (let sem = 1; sem <= 3; sem++) {
//     const numClasses = faker.random.number(1) + 1
//     for (let cn = 0; cn < numClasses; cn++) {
//       const subject = Math.floor(i / Math.ceil(num / 3))
//       const prof = subject * 3 + faker.random.number(2) + 1
//       console.log(`(${i}, ${sem}, ${prof}),`)
//     }
//   }
// }

// const num = 12
// for (let i = 0; i < num; i++) {
//   const subject = Math.floor(i / Math.ceil(num / 3)) + 1
//   console.log(`(${faker.fake("'{{name.firstName}}', '{{name.lastName}}'")}, ${subject}),`)
// }

const classStrings = []
let allAssignments = []
const studentClasses = []
let studentAssignments = []

const num = 12
for (let i = 1; i <= num; i++) {
  const studentsAvailable = []
  for (let s = 1; s <= 20; s++) {
    studentsAvailable.push(s)
  }
  for (let sem = 1; sem <= 2; sem++) {
    const numClasses = faker.random.number(1) + 1
    for (let cn = 0; cn < numClasses; cn++) {
      const subject = Math.floor(i / Math.ceil(num / 3))
      const prof = subject * 3 + faker.random.number(2) + 1
      classStrings.push(`(${i}, ${sem}, ${prof})`)
      const assignments = getAssignments(classStrings.length)

      const numStudents = faker.random.number(3) + 2
      faker.helpers.shuffle(studentsAvailable)
      for (let sn = 0; sn < numStudents; sn++) {
        const sid = studentsAvailable.pop()
        studentClasses.push({ classId: classStrings.length, studentId: sid })
        const sassigns = assignments.map((it, ind) => ({
          studentId: sid,
          assignmentId: allAssignments.length + ind + 1,
          points: faker.random.number(it.points),
        }))
        studentAssignments = [...studentAssignments, ...sassigns]
      }
      allAssignments = [...allAssignments, ...assignments]
    }
  }
}

console.log(
  `INSERT INTO class (course_id, semester_id, professor_id) VALUES ${classStrings.join(
    ",\n"
  )};`
)

console.log(
  `INSERT INTO assignment (class_id, type_id, points_possible) VALUES ${allAssignments
    .map(it => `(${it.classId}, ${it.typeId}, ${it.points})`)
    .join(",\n")};`
)

console.log(
  `INSERT INTO student_class (class_id, student_id) VALUES ${studentClasses
    .map(it => `(${it.classId}, ${it.studentId})`)
    .join(",\n")};`
)

console.log(
  `INSERT INTO student_assignment (assignment_id, student_id, points) VALUES ${studentAssignments
    .map(it => `(${it.assignmentId}, ${it.studentId}, ${it.points})`)
    .join(",\n")};`
)

function getAssignments(classId) {
  const num = faker.random.number(4) + 1

  const result = []

  for (let i = 0; i < num; i++) {
    const typeId = faker.random.number(4) + 1
    const points = (faker.random.number(19) + 1) * 5
    result.push({ classId, typeId, points })
  }
  return result
}
