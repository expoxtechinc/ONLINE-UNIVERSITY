import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

type Question = { id: string; answer: string | string[]; points?: number };
type Assessment = { pass_score?: number; questions?: Question[] };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  const token = request.headers.get("Authorization");
  if (!token) return Response.json({ error: "Authentication required" }, { status: 401, headers: corsHeaders });
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: token } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401, headers: corsHeaders });
  const { lesson_id, answers } = await request.json().catch(() => ({}));
  if (typeof lesson_id !== "string" || !answers || typeof answers !== "object") return Response.json({ error: "lesson_id and answers are required" }, { status: 400, headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: lesson, error: lessonError } = await admin.from("lessons").select("id,kind,assessment,module_id,course_modules!inner(course_id,courses!inner(id,certificate_eligible))").eq("id", lesson_id).single();
  if (lessonError || !lesson || !["quiz", "test", "final_exam"].includes(lesson.kind)) return Response.json({ error: "Assessment lesson not found" }, { status: 404, headers: corsHeaders });
  const courseId = (lesson.course_modules as { course_id: string }).course_id;
  const { data: enrollment } = await admin.from("enrollments").select("id,status").eq("user_id", user.id).eq("course_id", courseId).in("status", ["active", "completed"]).maybeSingle();
  if (!enrollment) return Response.json({ error: "Active enrollment required" }, { status: 403, headers: corsHeaders });
  const { count: recentAttempts } = await admin.from("assessment_attempts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("lesson_id", lesson_id).gte("submitted_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  if ((recentAttempts || 0) >= 5) {
    await admin.from("audit_events").insert({ actor_id: user.id, action: "assessment.attempt_blocked", subject_type: "lesson", subject_id: lesson_id, metadata: { reason: "rolling_daily_attempt_limit" } });
    return Response.json({ error: "Daily attempt limit reached. Please review the lesson and try again tomorrow." }, { status: 429, headers: corsHeaders });
  }
  const assessment = (lesson.assessment || {}) as Assessment;
  const questions = assessment.questions || [];
  if (!questions.length) return Response.json({ error: "Assessment is not configured" }, { status: 422, headers: corsHeaders });
  const scoreParts = questions.map((question) => {
    const expected = Array.isArray(question.answer) ? question.answer.map(String).sort().join("|") : String(question.answer);
    const receivedRaw = (answers as Record<string, unknown>)[question.id];
    const received = Array.isArray(receivedRaw) ? receivedRaw.map(String).sort().join("|") : String(receivedRaw ?? "");
    return { earned: expected === received ? (question.points ?? 1) : 0, available: question.points ?? 1 };
  });
  const score = Math.round((scoreParts.reduce((sum, value) => sum + value.earned, 0) / scoreParts.reduce((sum, value) => sum + value.available, 0)) * 10000) / 100;
  const passed = score >= (assessment.pass_score ?? 70);
  await admin.from("assessment_attempts").insert({ user_id: user.id, lesson_id, score, passed, answers, integrity_metadata: { grading: "server", submitted_via: "supabase_edge_function", question_count: questions.length } });
  await admin.from("audit_events").insert({ actor_id: user.id, action: "assessment.submitted", subject_type: "lesson", subject_id: lesson_id, metadata: { score, passed, question_count: questions.length } });
  if (passed) await admin.from("lesson_completions").upsert({ user_id: user.id, lesson_id }, { onConflict: "user_id,lesson_id" });
  let certificate: { verification_code: string } | null = null;
  if (passed && lesson.kind === "final_exam") {
    const { data: requiredLessons } = await admin.from("lessons").select("id,course_modules!inner(course_id)").eq("course_modules.course_id", courseId).eq("is_required", true);
    const requiredIds = (requiredLessons || []).map((item) => item.id);
    const { count } = await admin.from("lesson_completions").select("lesson_id", { count: "exact", head: true }).eq("user_id", user.id).in("lesson_id", requiredIds);
    const progress = requiredIds.length ? Math.round(((count || 0) / requiredIds.length) * 100) : 0;
    if (progress === 100) {
      await admin.from("enrollments").update({ status: "completed", progress_percent: 100, completed_at: new Date().toISOString() }).eq("id", enrollment.id);
      const verificationCode = `OU-${crypto.randomUUID().replaceAll("-", "").slice(0, 18).toUpperCase()}`;
      const { data } = await admin.from("certificates").upsert({ user_id: user.id, course_id: courseId, verification_code: verificationCode, final_score: score }, { onConflict: "user_id,course_id" }).select("verification_code").single();
      certificate = data;
    } else await admin.from("enrollments").update({ progress_percent: progress }).eq("id", enrollment.id);
  }
  return Response.json({ score, passed, certificate_verification_code: certificate?.verification_code ?? null }, { headers: corsHeaders });
});
