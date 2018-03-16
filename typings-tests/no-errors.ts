import { table, buildSql } from "../src/kpdSql"
import * as t from "io-ts"

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

const query = buildSql()
  .from(Book)
  .join(Author, Book.authorId, Author.id)
  .select([Book.id, Book.title, Author.name])
  .execute()
