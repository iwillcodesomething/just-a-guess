import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";
export const users = sqliteTable("users", {
 id:text("id").primaryKey(),name:text("name").notNull(),code:text("code").notNull().unique(),created:text("created").notNull(),preferences:text("preferences").notNull().default("{}"),onboarded:integer("onboarded").notNull().default(0),
});
export const questions=sqliteTable("questions",{
 id:text("id").primaryKey(),day:text("day").notNull(),position:integer("position").notNull(),category:text("category").notNull(),title:text("title").notNull(),context:text("context").notNull(),options:text("options").notNull(),closeAt:text("close_at").notNull(),resolveAt:text("resolve_at").notNull(),source:text("source").notNull(),sourceUrl:text("source_url").notNull(),rule:text("rule").notNull(),status:text("status").notNull().default("open"),outcome:integer("outcome"),evidence:text("evidence"),resolvedAt:text("resolved_at"),checkedAt:text("checked_at"),
});
export const predictions=sqliteTable("predictions",{
 userId:text("user_id").notNull(),questionId:text("question_id").notNull(),choice:integer("choice").notNull(),confidence:integer("confidence").notNull(),created:text("created").notNull(),updated:text("updated").notNull(),score:real("score"),seen:integer("seen").notNull().default(0),
},t=>[primaryKey({columns:[t.userId,t.questionId]})]);
export const practice=sqliteTable("practice",{
 userId:text("user_id").notNull(),id:text("id").notNull(),day:text("day").notNull(),choice:integer("choice").notNull(),confidence:integer("confidence").notNull(),score:real("score").notNull(),created:text("created").notNull(),
},t=>[primaryKey({columns:[t.userId,t.id,t.day]})]);
export const friends=sqliteTable("friends",{from:text("from_id").notNull(),to:text("to_id").notNull(),status:text("status").notNull().default("pending"),created:text("created").notNull()},t=>[primaryKey({columns:[t.from,t.to]})]);
export const settings=sqliteTable("app_settings",{key:text("key").primaryKey(),value:text("value").notNull()});
export const cache=sqliteTable("source_cache",{key:text("key").primaryKey(),value:text("value").notNull(),expires:integer("expires").notNull()});
