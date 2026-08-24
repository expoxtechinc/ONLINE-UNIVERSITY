import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { accountCredentials, assessmentAttempts, certificates, courseAssets, courseModules, courses, enrollments, lessonCompletions, lessons, paymentEvents, type InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { hashSecret, normalizeUsername } from "./security";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getCredentialByUsername(username: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.select().from(accountCredentials).where(eq(accountCredentials.username, normalizeUsername(username))).limit(1);
  return result[0] ?? null;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updateCredentialProfile(userId: number, input: { legalName: string; country?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const legalName = input.legalName.trim();
  if (legalName.length < 2 || legalName.length > 255) throw new Error("Enter the full legal name to appear on credentials");
  await db.update(users).set({ legalName, country: input.country?.trim() || null }).where(eq(users.id, userId));
  return getUserById(userId);
}

export async function ensureBootstrapAdministrator() {
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const pin = process.env.BOOTSTRAP_ADMIN_PIN;
  if (!username || !password || !email) return null;
  const existing = await getCredentialByUsername(username);
  if (existing) return getUserById(existing.userId);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const passwordSecret = await hashSecret(password);
  const pinSecret = pin ? await hashSecret(pin) : null;
  const openId = `local:${normalizeUsername(username)}`;
  const result = await db.insert(users).values({ openId, name: "Akin Sokpah", email, loginMethod: "password", role: "admin", lastSignedIn: new Date() });
  const userId = Number(result[0].insertId);
  await db.insert(accountCredentials).values({ userId, username: normalizeUsername(username), passwordHash: passwordSecret.hash, passwordSalt: passwordSecret.salt, recoveryPinHash: pinSecret?.hash ?? null });
  return getUserById(userId);
}

export async function createLocalUser(input: { username: string; email: string; name: string; password: string; role?: "student" | "instructor" }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const username = normalizeUsername(input.username);
  const existing = await getCredentialByUsername(username);
  if (existing) throw new Error("Username is already in use");
  const secret = await hashSecret(input.password);
  const result = await db.insert(users).values({ openId: `local:${username}`, name: input.name, email: input.email.toLowerCase(), loginMethod: "password", role: input.role ?? "student", lastSignedIn: new Date() });
  const userId = Number(result[0].insertId);
  await db.insert(accountCredentials).values({ userId, username, passwordHash: secret.hash, passwordSalt: secret.salt });
  return getUserById(userId);
}

export async function listPublishedCourses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courses).where(eq(courses.status, "published"));
}

export async function listAuthorCourses(authorId: number, isAdmin: boolean) {
  const db = await getDb();
  if (!db) return [];
  return isAdmin ? db.select().from(courses) : db.select().from(courses).where(eq(courses.authorId, authorId));
}

export async function getCourseById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createCourse(input: Omit<typeof courses.$inferInsert, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(courses).values(input);
  return getCourseById(Number(result[0].insertId));
}

export async function updateCourse(id: number, input: Partial<typeof courses.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(courses).set(input).where(eq(courses.id, id));
  return getCourseById(id);
}

export async function archiveCourse(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const course = await getCourseById(id);
  if (!course) throw new Error("Course not found");
  await db.update(courses).set({ status: "archived" }).where(eq(courses.id, id));
  return getCourseById(id);
}

export async function listUsersForAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(id: number, role: "student" | "instructor" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const user = await getUserById(id);
  if (!user) throw new Error("User not found");
  if (user.role === "admin" && role !== "admin") {
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    if (admins.length <= 1) throw new Error("At least one administrator account must remain active");
  }
  await db.update(users).set({ role }).where(eq(users.id, id));
  return getUserById(id);
}

export async function createModule(input: typeof courseModules.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(courseModules).values(input);
  return Number(result[0].insertId);
}

export async function createLesson(input: typeof lessons.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(lessons).values(input);
  return Number(result[0].insertId);
}

export async function getModuleById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(courseModules).where(eq(courseModules.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getLessonById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ lesson: lessons, courseId: courseModules.courseId }).from(lessons).innerJoin(courseModules, eq(lessons.moduleId, courseModules.id)).where(eq(lessons.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getCourseLessons(courseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ lesson: lessons, modulePosition: courseModules.position }).from(lessons).innerJoin(courseModules, eq(lessons.moduleId, courseModules.id)).where(eq(courseModules.courseId, courseId));
}

export async function createCourseAsset(input: typeof courseAssets.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(courseAssets).values(input);
  return Number(result[0].insertId);
}

export async function getCourseAssetByStorageKey(storageKey: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(courseAssets).where(eq(courseAssets.storageKey, storageKey)).limit(1);
  return result[0] ?? null;
}

export async function getEnrollment(studentId: number, courseId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(enrollments).where(and(eq(enrollments.studentId, studentId), eq(enrollments.courseId, courseId))).limit(1);
  return result[0] ?? null;
}

async function updateEnrollmentProgress(studentId: number, courseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const courseLessonRows = await getCourseLessons(courseId);
  const completedRows = await db.select({ lessonId: lessonCompletions.lessonId }).from(lessonCompletions).where(eq(lessonCompletions.studentId, studentId));
  const courseLessonIds = new Set(courseLessonRows.map((item) => item.lesson.id));
  const completedLessons = completedRows.filter((item) => courseLessonIds.has(item.lessonId)).length;
  const progressPercent = courseLessonRows.length ? Math.round((completedLessons / courseLessonRows.length) * 100) : 0;
  await db.update(enrollments).set({ progressPercent }).where(and(eq(enrollments.studentId, studentId), eq(enrollments.courseId, courseId)));
  return { totalLessons: courseLessonRows.length, completedLessons, progressPercent };
}

export async function completeLessonForLearner(input: { studentId: number; lessonId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const lessonRecord = await getLessonById(input.lessonId);
  if (!lessonRecord) throw new Error("Lesson not found");
  if (lessonRecord.lesson.type === "final_exam") throw new Error("Final assessments must be submitted through the assessment flow");
  const enrollment = await getEnrollment(input.studentId, lessonRecord.courseId);
  if (!enrollment || !["active", "completed"].includes(enrollment.status)) throw new Error("An active course enrollment is required");
  await db.insert(lessonCompletions).values({ studentId: input.studentId, lessonId: input.lessonId, completedAt: new Date() }).onDuplicateKeyUpdate({ set: { completedAt: new Date() } });
  return updateEnrollmentProgress(input.studentId, lessonRecord.courseId);
}

export async function submitFinalAssessment(input: { studentId: number; lessonId: number; answers: Record<string, string> }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const lessonRecord = await getLessonById(input.lessonId);
  if (!lessonRecord || lessonRecord.lesson.type !== "final_exam") throw new Error("Final assessment not found");
  const enrollment = await getEnrollment(input.studentId, lessonRecord.courseId);
  if (!enrollment || enrollment.status !== "active") throw new Error("An active course enrollment is required");
  let questions: Array<{ id: string; answer: string }> = [];
  try {
    const parsed = JSON.parse(lessonRecord.lesson.assessmentJson || "{}");
    questions = Array.isArray(parsed.questions) ? parsed.questions.filter((question: unknown): question is { id: string; answer: string } => typeof (question as { id?: unknown })?.id === "string" && typeof (question as { answer?: unknown })?.answer === "string") : [];
  } catch { throw new Error("Final assessment configuration is invalid"); }
  if (!questions.length) throw new Error("Final assessment requires administrator-configured answer keys");
  const correct = questions.filter((question) => input.answers[question.id] === question.answer).length;
  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= 70;
  await db.insert(assessmentAttempts).values({ studentId: input.studentId, lessonId: input.lessonId, score, passed: passed ? "yes" : "no" });
  if (!passed) return { score, passed, certificate: null, progressPercent: enrollment.progressPercent };
  await db.insert(lessonCompletions).values({ studentId: input.studentId, lessonId: input.lessonId, completedAt: new Date() }).onDuplicateKeyUpdate({ set: { completedAt: new Date() } });
  const progress = await updateEnrollmentProgress(input.studentId, lessonRecord.courseId);
  let certificate = null;
  if (progress.progressPercent === 100) {
    await db.update(enrollments).set({ status: "completed", completedAt: new Date(), progressPercent: 100 }).where(and(eq(enrollments.studentId, input.studentId), eq(enrollments.courseId, lessonRecord.courseId)));
    certificate = await issueCertificate({ studentId: input.studentId, courseId: lessonRecord.courseId, finalScore: score });
  }
  return { score, passed, certificate, progressPercent: progress.progressPercent };
}

export async function createPendingEnrollment(studentId: number, courseId: number, amount: number, currency: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await getEnrollment(studentId, courseId);
  if (existing) return existing;
  const result = await db.insert(enrollments).values({ studentId, courseId, paidAmountCents: amount, currency, status: "pending_payment" });
  const created = await db.select().from(enrollments).where(eq(enrollments.id, Number(result[0].insertId))).limit(1);
  return created[0];
}

export async function attachStripeCheckout(enrollmentId: number, sessionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(enrollments).set({ stripeCheckoutSessionId: sessionId }).where(eq(enrollments.id, enrollmentId));
}

export async function completeEnrollmentPayment(input: { enrollmentId: number; sessionId: string; paymentIntentId?: string | null; eventId: string; payload: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const duplicate = await db.select().from(paymentEvents).where(eq(paymentEvents.stripeEventId, input.eventId)).limit(1);
  if (duplicate[0]) return;
  await db.insert(paymentEvents).values({ stripeEventId: input.eventId, enrollmentId: input.enrollmentId, eventType: "checkout.session.completed", payload: input.payload });
  await db.update(enrollments).set({ status: "active", stripeCheckoutSessionId: input.sessionId, stripePaymentIntentId: input.paymentIntentId ?? null, enrolledAt: new Date() }).where(eq(enrollments.id, input.enrollmentId));
}

export async function listCertificatesForAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ certificate: certificates, courseTitle: courses.title, learnerName: users.name, learnerEmail: users.email }).from(certificates).innerJoin(courses, eq(certificates.courseId, courses.id)).innerJoin(users, eq(certificates.studentId, users.id)).orderBy(desc(certificates.issuedAt));
}

export async function issueCertificate(input: { studentId: number; courseId: number; finalScore: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const course = await getCourseById(input.courseId);
  const student = await getUserById(input.studentId);
  if (!course || course.certificateEligible !== "yes") throw new Error("This course is not eligible for certificates");
  if (!student) throw new Error("Learner not found");
  const enrollment = await getEnrollment(input.studentId, input.courseId);
  if (!enrollment || !["active", "completed"].includes(enrollment.status)) throw new Error("Learner does not have an eligible enrollment");
  if (input.finalScore < 0 || input.finalScore > 100) throw new Error("Final score must be between 0 and 100");
  const existing = await db.select().from(certificates).where(and(eq(certificates.studentId, input.studentId), eq(certificates.courseId, input.courseId))).limit(1);
  if (existing[0]) return existing[0];
  const verificationCode = `OU-${randomUUID().replace(/-/g, "").slice(0, 18).toUpperCase()}`;
  const result = await db.insert(certificates).values({ studentId: input.studentId, courseId: input.courseId, finalScore: input.finalScore, verificationCode, issuedAt: new Date() });
  const created = await db.select().from(certificates).where(eq(certificates.id, Number(result[0].insertId))).limit(1);
  return created[0];
}

export async function revokeCertificate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(certificates).set({ revokedAt: new Date() }).where(eq(certificates.id, id));
}

export async function getCertificateByVerificationCode(verificationCode: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ certificate: certificates, courseTitle: courses.title, learnerName: users.name }).from(certificates).innerJoin(courses, eq(certificates.courseId, courses.id)).innerJoin(users, eq(certificates.studentId, users.id)).where(eq(certificates.verificationCode, verificationCode)).limit(1);
  return result[0] ?? null;
}

export async function getCertificateForLearner(studentId: number, verificationCode: string) {
  const record = await getCertificateByVerificationCode(verificationCode);
  return record?.certificate.studentId === studentId ? record : null;
}

export async function getLearnerTranscript(studentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const learner = await getUserById(studentId);
  if (!learner) throw new Error("Learner not found");
  const records = await db.select({ enrollment: enrollments, course: courses }).from(enrollments).innerJoin(courses, eq(enrollments.courseId, courses.id)).where(eq(enrollments.studentId, studentId));
  const entries = await Promise.all(records.map(async ({ enrollment, course }) => {
    const certificate = await db.select().from(certificates).where(and(eq(certificates.studentId, studentId), eq(certificates.courseId, course.id))).limit(1);
    return { course, enrollment, certificate: certificate[0] ?? null };
  }));
  return { learner, entries };
}
