import { Pool } from "pg"
import { init, param } from "../../../src/everything"
import { PgPlugin } from "../../../src/postgres"
import { Class } from "./tables"
import * as fs from "fs"
import * as path from "path"

const connectionString = "postgresql://localhost:5432/sqltest"

const pool = new Pool({
  connectionString,
})

const db = init(PgPlugin.init(pool))

describe("college select tests", () => {
  it("empty test", async () => {
    const query = db
      .select()
      .from(Class)
      .groupBy([Class.id, Class.courseId])
      .columns([Class.semesterId])
  })

  it("group by with test", async () => {
    const query = db
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
