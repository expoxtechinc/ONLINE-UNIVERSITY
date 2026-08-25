import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") || "").trim().toUpperCase();
  if (!code || code.length > 80) return Response.json({ valid: false, error: "A valid certificate code is required." }, { status: 400, headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: credential, error } = await supabase
    .from("certificates")
    .select("verification_code,issued_at,final_score,profiles!inner(legal_name,display_name),courses!inner(title)")
    .eq("verification_code", code)
    .is("revoked_at", null)
    .maybeSingle();
  if (error || !credential) return Response.json({ valid: false }, { status: 404, headers: corsHeaders });
  const profile = credential.profiles as { legal_name: string | null; display_name: string | null };
  const course = credential.courses as { title: string };
  const data = { valid: true, verification_code: credential.verification_code, learner_name: profile.legal_name || profile.display_name, course_title: course.title, issued_at: credential.issued_at, final_score: credential.final_score };
  if (request.headers.get("accept")?.includes("text/html")) {
    const safe = (value: unknown) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]!));
    return new Response(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Certificate verified | Online University</title><style>body{margin:0;background:#f8f6f1;color:#102a43;font-family:Arial,sans-serif}.card{max-width:620px;margin:8vh auto;padding:42px;background:#fff;border:1px solid #d8e2eb;border-radius:22px}.mark{color:#9a6f1e;font-size:12px;font-weight:bold;letter-spacing:2px}.valid{color:#177648;font-weight:bold}.name{font-size:30px;font-weight:800;margin:18px 0 4px}.course{font-size:20px;font-weight:bold;color:#183b65}.meta{margin-top:25px;padding-top:18px;border-top:1px solid #e3eaf0;color:#4a5e73;font-size:14px}</style></head><body><main class="card"><div class="mark">ONLINE UNIVERSITY</div><h1 class="valid">Certificate verified</h1><p>This credential is active in the Online University global academic registry.</p><div class="name">${safe(data.learner_name)}</div><div class="course">${safe(data.course_title)}</div><div class="meta">Certificate ID: ${safe(data.verification_code)}<br>Issued: ${safe(new Date(data.issued_at).toLocaleDateString())}<br>Final score: ${safe(data.final_score)}%</div></main></body></html>`, { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" } });
  }
  return Response.json(data, { headers: { ...corsHeaders, "Cache-Control": "public, max-age=300" } });
});
