import { SqlBuilder } from "../src/everything"
declare const db: SqlBuilder<{}, {}, never, never, {}, never>

// to reproduce bug, type out the line below(uncommented of course) and try to have it autocomplete after the period at the end.
// note that actually typing the line from scratch seems to be important to reproducing the bug.
// I can't reproduce it by simply uncommenting that line and trying to autocomplete, and I can't reproduce by copy pasting it.

// db.with("a", db.
