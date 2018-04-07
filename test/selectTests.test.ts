import { Pool, PoolClient } from "pg"
import { select, param, table, column, initializePool } from "../src/everything"
import { printSql } from "../src/postgres"

import * as t from "io-ts"

import * as fs from "fs"
import * as path from "path"

import * as sqlFormatter from "sql-formatter"

const connectionString = "postgresql://localhost:5432/sqltest"

const pool = new Pool({
  connectionString,
})

describe("Select query tests", () => {
  it("select pets seen dr Ortega", async () => {
    const query = select(printSql)
      .from(Pet)
      .join(Visit, Pet.id.eq(Visit.petId))
      .join(Vet, Vet.id.eq(Visit.vetId))
      .columns([Pet.id, Vet.firstName, Pet.birthDate, Pet.ownerId, Pet.typeId])
      .where(Vet.lastName.eq(param("vetLastName")))

    const sql = sqlFormatter.format(query.toSql())
    expect(sql).toMatchSnapshot()

    const results = await query.execute({ vetLastName: "Ortega" })

    expect(results).toHaveLength(2)

    expect(results).toMatchSnapshot()
  })
})

beforeAll(async () => {
  const initDb = fs.readFileSync(
    path.resolve(__dirname, "db", "postgres-init.sql"),
    "utf8"
  )

  await pool.query(initDb)

  initializePool(pool)
})

const Vet = table({
  name: "vet",
  columns: {
    id: column(t.number),
    firstName: column(t.string, "first_name"),
    lastName: column(t.string, "last_name"),
  },
})

const Specialty = table({
  name: "specialty",
  columns: {
    id: column(t.number),
    name: column(t.string),
  },
})

const VetSpecialty = table({
  name: "vet_specialty",
  columns: {
    vetId: column(t.number, "vet_id"),
    specialtyId: column(t.number, "specialty_id"),
  },
})

const Type = table({
  name: "type",
  columns: {
    id: column(t.number),
    name: column(t.string),
  },
})

const Owner = table({
  name: "owner",
  columns: {
    id: column(t.number),
    firstName: column(t.string, "first_name"),
    lastName: column(t.string, "last_name"),
    address: column(t.string),
    city: column(t.string),
    telephone: column(t.string),
  },
})

const Pet = table({
  name: "pet",
  columns: {
    id: column(t.number),
    name: column(t.string),
    birthDate: column(t.string, "birth_date"),
    typeId: column(t.number, "type_id"),
    ownerId: column(t.number, "owner_id"),
  },
})

const Visit = table({
  name: "visit",
  columns: {
    id: column(t.number),
    petId: column(t.number, "pet_id"),
    vetId: column(t.number, "vet_id"),
    visitDate: column(t.string, "visit_date"),
    description: column(t.string),
  },
})
