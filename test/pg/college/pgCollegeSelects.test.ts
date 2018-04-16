import * as fs from "fs"
import * as path from "path"
import { Pool } from "pg"
import { init } from "../../../src/everything"
import { PgPlugin } from "../../../src/postgres"
import { Class } from "./tables"

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
