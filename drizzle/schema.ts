import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  legalName: varchar("legalName", { length: 255 }),
  country: varchar("country", { length: 120 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "student", "instructor", "admin"]).default("student").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const accountCredentials = mysqlTable("account_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  passwordSalt: varchar("passwordSalt", { length: 128 }).notNull(),
  recoveryPinHash: varchar("recoveryPinHash", { length: 255 }),
  passwordChangedAt: timestamp("passwordChangedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  slug: varchar("slug", { length: 160 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  level: mysqlEnum("level", ["beginner", "intermediate", "advanced"]).default("beginner").notNull(),
  durationMinutes: int("durationMinutes").default(0).notNull(),
  priceCents: int("priceCents").default(0).notNull(),
  currency: varchar("currency", { length: 3 }).default("usd").notNull(),
  thumbnailKey: varchar("thumbnailKey", { length: 512 }),
  thumbnailUrl: varchar("thumbnailUrl", { length: 1024 }),
  learningObjectives: text("learningObjectives"),
  requirements: text("requirements"),
  targetAudience: text("targetAudience"),
  certificateEligible: mysqlEnum("certificateEligible", ["yes", "no"]).default("yes").notNull(),
  status: mysqlEnum("status", ["draft", "review", "published", "archived"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("courses_slug_unique").on(table.slug), index("courses_author_idx").on(table.authorId), index("courses_status_idx").on(table.status)]);

export const courseModules = mysqlTable("course_modules", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  position: int("position").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("modules_course_idx").on(table.courseId)]);

export const lessons = mysqlTable("lessons", {
  id: int("id").autoincrement().primaryKey(),
  moduleId: int("moduleId").notNull(),
  type: mysqlEnum("type", ["video", "article", "flashcards", "quiz", "test", "final_exam"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  position: int("position").default(0).notNull(),
  richText: text("richText"),
  videoKey: varchar("videoKey", { length: 512 }),
  videoUrl: varchar("videoUrl", { length: 1024 }),
  videoDurationSeconds: int("videoDurationSeconds"),
  assessmentJson: text("assessmentJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("lessons_module_idx").on(table.moduleId)]);

export const courseAssets = mysqlTable("course_assets", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  contentType: varchar("contentType", { length: 128 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  kind: mysqlEnum("kind", ["video", "image", "document"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("assets_course_idx").on(table.courseId)]);

export const enrollments = mysqlTable("enrollments", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  courseId: int("courseId").notNull(),
  status: mysqlEnum("status", ["pending_payment", "active", "completed", "refunded", "cancelled"]).default("pending_payment").notNull(),
  progressPercent: int("progressPercent").default(0).notNull(),
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 255 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  paidAmountCents: int("paidAmountCents").default(0).notNull(),
  currency: varchar("currency", { length: 3 }).default("usd").notNull(),
  enrolledAt: timestamp("enrolledAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("enrollments_student_course_unique").on(table.studentId, table.courseId), index("enrollments_course_idx").on(table.courseId)]);

export const certificates = mysqlTable("certificates", {
  id: int("id").autoincrement().primaryKey(),
  verificationCode: varchar("verificationCode", { length: 64 }).notNull(),
  studentId: int("studentId").notNull(),
  courseId: int("courseId").notNull(),
  finalScore: int("finalScore").notNull(),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("certificates_verification_unique").on(table.verificationCode), uniqueIndex("certificates_student_course_unique").on(table.studentId, table.courseId)]);

export const assessmentAttempts = mysqlTable("assessment_attempts", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  lessonId: int("lessonId").notNull(),
  score: int("score").notNull(),
  passed: mysqlEnum("passed", ["yes", "no"]).notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
}, (table) => [index("assessment_attempts_student_lesson_idx").on(table.studentId, table.lessonId)]);

export const lessonCompletions = mysqlTable("lesson_completions", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  lessonId: int("lessonId").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("lesson_completions_student_lesson_unique").on(table.studentId, table.lessonId), index("lesson_completions_student_idx").on(table.studentId)]);

export const paymentEvents = mysqlTable("payment_events", {
  id: int("id").autoincrement().primaryKey(),
  stripeEventId: varchar("stripeEventId", { length: 255 }).notNull(),
  enrollmentId: int("enrollmentId"),
  eventType: varchar("eventType", { length: 128 }).notNull(),
  payload: text("payload").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("payment_events_stripe_event_unique").on(table.stripeEventId)]);

export type AccountCredential = typeof accountCredentials.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type CourseModule = typeof courseModules.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type Certificate = typeof certificates.$inferSelect;
export type AssessmentAttempt = typeof assessmentAttempts.$inferSelect;
export type LessonCompletion = typeof lessonCompletions.$inferSelect;
