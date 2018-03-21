import * as t from "io-ts"

import { select, tuple } from "../src/implementation"
import { table } from "../src/table"
import { sqlReady } from "../src/kpdSql"

const Book = table({
  name: "book",
  columns: {
    id: { type: t.number },
    title: { type: t.string },
    year: { type: t.number },
    pages: { type: t.number },
    authorId: { type: t.number }
  }
})

const Author = table({
  name: "author",
  columns: {
    id: { type: t.number },
    name: { type: t.string },
    age: { type: t.number }
  }
})

const Other = table({
  name: "other",
  columns: {
    id: { type: t.number },
    otherName: { type: t.string },
    otherField: { type: t.number }
  }
})

const author23 = Author.id.eq(23)

const selectList = tuple([Book.id, Book.title])
const AuthorA = Author.as("a")
const query = select()
  .from(Book)
  .leftJoin(Author, Book.id.eq(Author.id))
  .columns([Book.id, Author.name])
  .where(author23)
  .whereSub(sub => Book.id.in(sub.from(Other).columns([Other.id])))
  .execute()
console.log(query)
