import { Pool } from "pg"
import { init, param } from "../../../src/everything"
import { PgPlugin } from "../../../src/postgres"

import * as fs from "fs"
import * as path from "path"
import { Visit, Pet, Vet, Owner } from "./tables"

const connectionString = "postgresql://localhost:5432/sqltest"

const pool = new Pool({
  connectionString,
})

const db = init(PgPlugin.init(pool))

describe("Select query tests", () => {
  it("select pets seen dr Ortega", async () => {
    const query = db
      .select()
      .from(Pet)
      .join(Visit, Pet.id.eq(Visit.petId))
      .join(Vet, Vet.id.eq(Visit.vetId))
      .columns([Pet.id, Pet.name, Pet.birthDate, Pet.ownerId, Pet.typeId])
      .where(Vet.lastName.eq(param("vetLastName")))

    expect(query.toSql()).toMatchSnapshot()
    const results = await query.execute({ vetLastName: "Ortega" })
    expect(results).toHaveLength(2)
    expect(results).toMatchSnapshot()
  })

  it("select with subquery pets live in madison", async () => {
    const query = db
      .select()
      .from(Pet)
      .columns([Pet.id, Pet.name, Pet.birthDate, Pet.ownerId, Pet.typeId])
      .where(sq => {
        return Pet.ownerId.in(
          sq
            .from(Owner)
            .columns([Owner.id])
            .where(Owner.city.eq(param("ownerCity")))
        )
      })

    expect(query.toSql()).toMatchSnapshot()
    const results = await query.execute({ ownerCity: "Madison" })
    expect(results).toHaveLength(4)
    expect(results).toMatchSnapshot()
  })

  it("select pets hardcoded live in madison or McFarland", async () => {
    const query = db
      .select()
      .from(Pet)
      .columns([Pet.id, Pet.name, Pet.birthDate, Pet.ownerId, Pet.typeId])
      .where(sq => {
        return Pet.ownerId.in(
          sq
            .from(Owner)
            .columns([Owner.id])
            .where(Owner.city.in(["Madison", "McFarland"]))
        )
      })

    expect(query.toSql()).toMatchSnapshot()
    const results = await query.execute()
    expect(results).toHaveLength(6)
    expect(results).toMatchSnapshot()
  })
})

beforeAll(async () => {
  const initDb = fs.readFileSync(
    path.resolve(__dirname, "postgres-petclinic-init.sql"),
    "utf8"
  )

  await pool.query(initDb)
})

afterAll(async () => {
  await pool.end()
})
