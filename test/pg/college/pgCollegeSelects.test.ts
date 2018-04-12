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
      .groupBy([Class.courseId, Class.semesterId])
      .columns([Class.semesterId])
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
