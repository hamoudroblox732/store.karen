
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL")!;
const OWNER_PASSWORD = Deno.env.get("OWNER_LOGIN_PASSWORD")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  try {
    const { username, password } = await req.json();

    if (
      typeof username !== "string" ||
      username.toLowerCase() !== "ahmad_roblox2222" ||
      typeof password !== "string" ||
      !password
    ) {
      return respond({ error: "بيانات الدخول غير صحيحة." }, 401);
    }

    if (!OWNER_EMAIL || !OWNER_PASSWORD || !ANON_KEY || !SERVICE_KEY) {
      return respond({ error: "إعدادات الخادم غير مكتملة." }, 500);
    }

    if (password !== OWNER_PASSWORD) {
      return respond({ error: "كلمة المرور غير صحيحة." }, 401);
    }

    const authClient = createClient(URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data, error } = await authClient.auth.signInWithPassword({
      email: OWNER_EMAIL,
      password: OWNER_PASSWORD
    });

    if (error || !data.user || !data.session) {
      return respond({ error: "تعذر تسجيل الدخول بحساب الأونر." }, 401);
    }

    const adminClient = createClient(URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: admin, error: adminError } = await adminClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (adminError || !admin) {
      return respond({ error: "الحساب غير مصرح له بالإدارة." }, 403);
    }

    return respond({
      session: data.session,
      user: { id: data.user.id, email: data.user.email }
    });
  } catch {
    return respond({ error: "حدث خطأ أثناء تسجيل الدخول." }, 500);
  }
});
