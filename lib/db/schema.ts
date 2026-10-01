import { sqliteTable, text, integer, real, primaryKey, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), name: text("name").notNull().unique(), password: text("password").notNull(),
  gender: text("gender", { enum: ["MALE", "FEMALE", "OTHER"] }).notNull(), faceShape: text("face_shape"), bodyType: text("body_type"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const wardrobeItems = sqliteTable("wardrobe_items", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  imageKey: text("image_key").notNull(), category: text("category").notNull(), subcategory: text("subcategory").notNull(),
  colors: text("colors").notNull().default("[]"), fabric: text("fabric"), seasons: text("seasons").notNull().default("[]"),
  formality: integer("formality").notNull().default(5), isTraditional: integer("is_traditional", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const outfitRounds = sqliteTable("outfit_rounds", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  occasion: text("occasion").notNull(), colorMode: text("color_mode"), preferredColors: text("preferred_colors").notNull().default("[]"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const outfits = sqliteTable("outfits", {
  id: text("id").primaryKey(), roundId: text("round_id").notNull().references(() => outfitRounds.id, { onDelete: "cascade" }),
  explanation: text("explanation").notNull(), score: real("score").notNull().default(0),
});
export const outfitItems = sqliteTable("outfit_items", {
  outfitId: text("outfit_id").notNull().references(() => outfits.id, { onDelete: "cascade" }),
  wardrobeItemId: text("wardrobe_item_id").notNull().references(() => wardrobeItems.id, { onDelete: "cascade" }),
  slot: text("slot").notNull(),
}, t => [primaryKey({ columns: [t.outfitId, t.wardrobeItemId] })]);
export const feedback = sqliteTable("feedback", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  outfitId: text("outfit_id").notNull().references(() => outfits.id, { onDelete: "cascade" }), liked: integer("liked", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, t => [uniqueIndex("feedback_user_outfit").on(t.userId, t.outfitId)]);
export const preferenceWeights = sqliteTable("preference_weights", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), value: text("value").notNull(), weight: real("weight").notNull().default(0),
}, t => [uniqueIndex("weight_user_kind_value").on(t.userId, t.kind, t.value)]);

export const usersRelations = relations(users, ({ many }) => ({ items: many(wardrobeItems), rounds: many(outfitRounds), feedback: many(feedback), weights: many(preferenceWeights) }));
export const wardrobeRelations = relations(wardrobeItems, ({ one, many }) => ({ user: one(users, { fields: [wardrobeItems.userId], references: [users.id] }), outfits: many(outfitItems) }));
export const roundsRelations = relations(outfitRounds, ({ one, many }) => ({ user: one(users, { fields: [outfitRounds.userId], references: [users.id] }), outfits: many(outfits) }));
export const outfitsRelations = relations(outfits, ({ one, many }) => ({ round: one(outfitRounds, { fields: [outfits.roundId], references: [outfitRounds.id] }), items: many(outfitItems), feedback: many(feedback) }));
export const outfitItemsRelations = relations(outfitItems, ({ one }) => ({ outfit: one(outfits, { fields: [outfitItems.outfitId], references: [outfits.id] }), wardrobeItem: one(wardrobeItems, { fields: [outfitItems.wardrobeItemId], references: [wardrobeItems.id] }) }));
