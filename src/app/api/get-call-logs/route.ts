import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("call_logs")
      .select("*")
      .order("start_time", { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify({ data }), { status: 200 });
  } catch (error) {
    console.error("❌ Fetch Error:", error);
    return new Response(JSON.stringify({ error: (error as any).message }), { status: 500 });
  }
}
