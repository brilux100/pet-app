import { env } from "cloudflare:workers";

type PublicSupabaseEnv = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

export async function GET() {
  const runtime = env as unknown as PublicSupabaseEnv;
  const url = runtime.SUPABASE_URL?.trim();
  const anonKey = runtime.SUPABASE_ANON_KEY?.trim();

  return Response.json(
    url && anonKey
      ? { configured: true, url, anonKey }
      : { configured: false },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
