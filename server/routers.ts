import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";

const authorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user || !["admin", "instructor"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Instructor or administrator access is required." });
  return next({ ctx });
});

const courseInput = z.object({ title: z.string().min(3).max(255), slug: z.string().min(3).max(160).regex(/^[a-z0-9-]+$/), description: z.string().min(30).max(10000), category: z.string().min(2).max(120), level: z.enum(["beginner", "intermediate", "advanced"]), durationMinutes: z.number().int().min(0).max(100000), priceCents: z.number().int().min(0).max(100000000), currency: z.string().length(3).transform((value) => value.toLowerCase()), learningObjectives: z.string().max(10000).optional(), requirements: z.string().max(10000).optional(), targetAudience: z.string().max(10000).optional(), certificateEligible: z.enum(["yes", "no"]).default("yes"), status: z.enum(["draft", "review", "published", "archived"]).default("draft") });

function sanitizeRichText(value: string) {
  return value.replace(/<\/?(script|style)[^>]*>/gi, "").replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "").replace(/javascript:/gi, "");
}

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  catalog: router({
    list: publicProcedure.query(() => db.listPublishedCourses()),
    course: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const course = await db.getCourseById(input.id);
      return course?.status === "published" ? course : null;
    }),
    certificate: publicProcedure.input(z.object({ verificationCode: z.string().min(6).max(64) })).query(({ input }) => db.getCertificateByVerificationCode(input.verificationCode.toUpperCase())),
  }),
  author: router({
    courses: authorProcedure.query(({ ctx }) => db.listAuthorCourses(ctx.user.id, ctx.user.role === "admin")),
    createCourse: authorProcedure.input(courseInput).mutation(({ ctx, input }) => db.createCourse({ ...input, authorId: ctx.user.id })),
    updateCourse: authorProcedure.input(z.object({ id: z.number().int().positive(), patch: courseInput.partial() })).mutation(async ({ ctx, input }) => {
      const course = await db.getCourseById(input.id);
      if (!course || (ctx.user.role !== "admin" && course.authorId !== ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN", message: "Course ownership is required." });
      return db.updateCourse(input.id, input.patch);
    }),
    createModule: authorProcedure.input(z.object({ courseId: z.number().int().positive(), title: z.string().min(2).max(255), description: z.string().max(10000).optional(), position: z.number().int().min(0) })).mutation(async ({ ctx, input }) => {
      const course = await db.getCourseById(input.courseId);
      if (!course || (ctx.user.role !== "admin" && course.authorId !== ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });
      return db.createModule(input);
    }),
    createLesson: authorProcedure.input(z.object({ moduleId: z.number().int().positive(), type: z.enum(["video", "article", "flashcards", "quiz", "test", "final_exam"]), title: z.string().min(2).max(255), description: z.string().max(10000).optional(), position: z.number().int().min(0), richText: z.string().max(100000).optional(), videoKey: z.string().max(512).optional(), videoUrl: z.string().max(1024).url().optional(), videoDurationSeconds: z.number().int().min(0).optional(), assessmentJson: z.string().max(100000).optional() })).mutation(async ({ ctx, input }) => {
      const module = await db.getModuleById(input.moduleId);
      const course = module ? await db.getCourseById(module.courseId) : null;
      if (!course || (ctx.user.role !== "admin" && course.authorId !== ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });
      return db.createLesson({ ...input, richText: input.richText ? sanitizeRichText(input.richText) : undefined });
    }),
  }),
  administration: router({
    bootstrap: adminProcedure.mutation(() => db.ensureBootstrapAdministrator()),
    users: adminProcedure.query(() => db.listUsersForAdmin()),
    courses: adminProcedure.query(() => db.listAuthorCourses(0, true)),
    certificates: adminProcedure.query(() => db.listCertificatesForAdmin()),
    setUserRole: adminProcedure.input(z.object({ id: z.number().int().positive(), role: z.enum(["student", "instructor", "admin"]) })).mutation(({ input }) => db.updateUserRole(input.id, input.role)),
    archiveCourse: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => db.archiveCourse(input.id)),
    issueCertificate: adminProcedure.input(z.object({ studentId: z.number().int().positive(), courseId: z.number().int().positive(), finalScore: z.number().int().min(0).max(100) })).mutation(({ input }) => db.issueCertificate(input)),
    revokeCertificate: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => db.revokeCertificate(input.id)),
  }),
});

export type AppRouter = typeof appRouter;
