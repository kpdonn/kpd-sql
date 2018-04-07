import { table, column } from "../../../src/everything"
import * as t from "io-ts"

export const Vet = table({
  name: "vet",
  columns: {
    id: column(t.number),
    firstName: column(t.string, "first_name"),
    lastName: column(t.string, "last_name"),
  },
})

export const Specialty = table({
  name: "specialty",
  columns: {
    id: column(t.number),
    name: column(t.string),
  },
})

export const VetSpecialty = table({
  name: "vet_specialty",
  columns: {
    vetId: column(t.number, "vet_id"),
    specialtyId: column(t.number, "specialty_id"),
  },
})

export const Type = table({
  name: "type",
  columns: {
    id: column(t.number),
    name: column(t.string),
  },
})

export const Owner = table({
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

export const Pet = table({
  name: "pet",
  columns: {
    id: column(t.number),
    name: column(t.string),
    birthDate: column(t.string, "birth_date"),
    typeId: column(t.number, "type_id"),
    ownerId: column(t.number, "owner_id"),
  },
})

export const Visit = table({
  name: "visit",
  columns: {
    id: column(t.number),
    petId: column(t.number, "pet_id"),
    vetId: column(t.number, "vet_id"),
    visitDate: column(t.string, "visit_date"),
    description: column(t.string),
  },
})
