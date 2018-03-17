import * as t from "io-ts"

import { table, buildSql } from "../src/implementation"

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

const bookIdEqAuthor = Book.id.eq(Author.id)

const query = buildSql()
  .from(Book)
  .leftJoin(Author, Book.authorId, Author.id)
  .select([Book.id, Book.title, Author.name])
  .select([Author.age])
  .where(bookIdEqAuthor)
  .toSql()

console.log(query)
