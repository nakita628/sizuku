// Creates sqlite/dev.db with the tables of sqlite/schema.ts and a few rows, so the studio has
// data to show. `--if-missing` leaves an existing database alone; without it the file is rebuilt.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const file = path.join(import.meta.dirname, "dev.db");
if (process.argv.includes("--if-missing") && fs.existsSync(file)) process.exit(0);
fs.rmSync(file, { force: true });

const db = new DatabaseSync(file);
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    published INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX posts_author_idx ON posts(author_id);
  CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    body TEXT NOT NULL
  );
  CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE post_tags (
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
  );

  INSERT INTO users (email, name, is_admin) VALUES
    ('ada@example.com', 'Ada Lovelace', 1),
    ('linus@example.com', 'Linus Torvalds', 0),
    ('grace@example.com', 'Grace Hopper', 0),
    ('yukihiro@example.com', 'まつもと ゆきひろ', 0);
  INSERT INTO posts (author_id, title, body, published) VALUES
    (1, 'Notes on the Analytical Engine', 'The engine weaves algebraic patterns.', 1),
    (2, 'Hello from Helsinki', 'Just a hobby, won''t be big.', 1),
    (3, 'Nanoseconds', 'A foot of wire is a nanosecond.', 0),
    (4, 'たのしいプログラミング', 'プログラマの幸せを考える。', 1);
  INSERT INTO comments (post_id, author_id, body) VALUES
    (1, 3, 'Beautiful.'),
    (2, 1, 'Famous last words.'),
    (4, 2, 'いいね！');
  INSERT INTO tags (name) VALUES ('history'), ('os'), ('hardware'), ('ruby');
  INSERT INTO post_tags (post_id, tag_id) VALUES (1, 1), (2, 2), (3, 3), (3, 1), (4, 4);
`);
db.close();
console.log(`💧 Seeded ${path.relative(process.cwd(), file)}`);
