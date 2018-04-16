import * as fs from "fs"
import * as path from "path"
import { Pool } from "pg"
import { init, param } from "../../../src/everything"
import { PgPlugin } from "../../../src/postgres"
import { Owner, Pet, Specialty, Type, Vet, VetSpecialty, Visit } from "./tables"

const connectionString = "postgresql://localhost:5432/sqltest"

const pool = new Pool({
  connectionString,
})

const db = init(PgPlugin.init(pool))

describe("Select query tests", () => {
  it("select pets seen dr Ortega", async () => {
    const query = db
      .select()
      .from(Pet.join(Visit, Pet.id.eq(Visit.petId)).join(Vet, Vet.id.eq(Visit.vetId)))
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

  it("select non cat pets with optional visit", async () => {
    const query = db
      .select()
      .from(
        Pet.join(Type, Type.id.eq(Pet.typeId)).leftJoin(Visit, Pet.id.eq(Visit.petId))
      )
      .columns([
        Pet.id,
        Type.name.as("type"),
        Pet.name,
        Pet.birthDate,
        Pet.ownerId,
        Pet.typeId,
        Visit.visitDate,
        Visit.vetId,
      ])
      .where(Type.name.not.eq("cat"))

    expect(query.toSql()).toMatchSnapshot()
    const results = await query.execute()
    expect(results).toHaveLength(9)
    expect(results).toMatchSnapshot()
  })

  it("select vets with no specialty", async () => {
    const query = db
      .select()
      .from(
        Vet.leftJoin(VetSpecialty, VetSpecialty.vetId.eq(Vet.id)).leftJoin(
          Specialty,
          Specialty.id.eq(VetSpecialty.specialtyId)
        )
      )

      .columns([Vet.id, Vet.firstName, Vet.lastName, Specialty.name])
      .where(VetSpecialty.specialtyId.isNull)

    expect(query.toSql()).toMatchSnapshot()
    const results = await query.execute()
    expect(results).toHaveLength(2)
    expect(results).toMatchSnapshot()
  })

  it("select vets with their specialties", async () => {
    const query = db
      .select()
      .from(
        Vet.leftJoin(VetSpecialty, VetSpecialty.vetId.eq(Vet.id)).leftJoin(
          Specialty,
          Specialty.id.eq(VetSpecialty.specialtyId)
        )
      )

      .columns([Vet.id, Vet.firstName, Vet.lastName, Specialty.name])
      .where(VetSpecialty.specialtyId.isNotNull)

    expect(query.toSql()).toMatchSnapshot()
    const results = await query.execute()
    expect(results).toHaveLength(5)
    expect(results).toMatchSnapshot()
  })

  it("with clause query", async () => {
    const query = db
      .with(
        "myWith",
        db
          .from(
            Vet.leftJoin(VetSpecialty, VetSpecialty.vetId.eq(Vet.id)).leftJoin(
              Specialty,
              Specialty.id.eq(VetSpecialty.specialtyId)
            )
          )
          .columns([Vet.id, Vet.firstName, Vet.lastName, Specialty.name])
          .where(VetSpecialty.specialtyId.isNotNull)
      )
      .select(sq =>
        sq
          .from(sq.table.myWith.join(Visit, Visit.vetId.eq(sq.table.myWith.id)))
          .columns([sq.table.myWith.id, sq.table.myWith.lastName, Visit.petId])
      )

    expect(query.toSql()).toMatchSnapshot()
    const results = await query.execute()
    expect(results).toHaveLength(3)
    expect(results).toMatchSnapshot()
  })

  it("with clause cats had visit with surgeon", async () => {
    const query = db
      .with(
        "myWith",
        db
          .from(
            Vet.leftJoin(VetSpecialty, VetSpecialty.vetId.eq(Vet.id)).leftJoin(
              Specialty,
              Specialty.id.eq(VetSpecialty.specialtyId)
            )
          )
          .columns([Vet.id, Vet.firstName, Vet.lastName, Specialty.name])
          .where(Specialty.name.eq(param("specialty")))
      )
      .select(sq =>
        sq
          .from(
            sq.table.myWith.leftJoin(
              Visit.join(Pet.join(Type, Pet.typeId.eq(Type.id)), Visit.petId.eq(Pet.id)),
              Visit.vetId.eq(sq.table.myWith.id)
            )
          )
          .columns([sq.table.myWith.id, sq.table.myWith.lastName, Visit.petId, Pet.name])
          .where(sq.table.myWith.lastName.not.eq("FakeLastName").and(Type.name.eq("cat")))
      )

    expect(query.toSql()).toMatchSnapshot()
    const results = await query.execute({ specialty: "surgery" })
    expect(results).toHaveLength(2)
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
