import * as fs from "fs"
import * as path from "path"
import { Pool } from "pg"
import { init, count } from "../../../src/everything"
import { PgPlugin } from "../../../src/postgres"
import { Class, Student } from "./tables"

const connectionString = "postgresql://localhost:5432/collegesqltest"

const pool = new Pool({
  connectionString,
})

const db = init(PgPlugin.init(pool))

describe("college select tests", () => {
  it("trivial group by test", async () => {
    const query = db
      .select()
      .from(Class)
      .groupBy([Class.id, Class.courseId])
      .columns([Class.semesterId])

    expect(query.toSql()).toMatchSnapshot()
    const results = await query.execute()
    expect(results).toMatchSnapshot()
  })

  it("number students", async () => {
    const query = db
      .select()
      .from(Student)
      .columns([count()])

    expect(query.toSql()).toMatchSnapshot()
    const results = await query.execute()
    expect(results).toMatchSnapshot()
  })
})

beforeAll(async () => {
  const initDb = fs.readFileSync(
    path.resolve(__dirname, "postgres-college-init.sql"),
    "utf8"
  )

  await pool.query(initDb)
})

afterAll(async () => {
  await pool.end()
})
