import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TAG_MODEL = "gemma-4-31b-it";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normaliseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [...new Set(value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().toLowerCase().replace(/^#+/, "").replace(/\s+/g, "-"))
    .map((tag) => tag.replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, ""))
    .filter(Boolean)
    .slice(0, 4)
    .map((tag) => `#${tag}`),
  )];
}

function parseTags(modelText: string): string[] {
  const trimmed = modelText.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  const arrayMatch = candidate.match(/\[[\s\S]*\]/);

  if (!arrayMatch) return [];

  try {
    return normaliseTags(JSON.parse(arrayMatch[0]));
  } catch {
    return [];
  }
}

async function generateTags(item: { title: string; content: string | null; summary: string | null; source_url: string | null; url: string | null }) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured for tag generation.");

  const prompt = `Create 2 to 4 useful, concise tags for this personal inbox capture.
Use lowercase kebab-case words. Prefer concrete topics or intents. Do not repeat the same concept.

Title: ${item.title}
Content: ${item.content || ""}
Summary: ${item.summary || ""}
URL: ${item.source_url || item.url || ""}

Return ONLY a JSON array of strings, for example: ["#read-later", "#design", "#research"].`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${TAG_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemma tag generation failed with ${response.status}.`);
  }

  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.at(-1)?.text;
  const tags = typeof text === "string" ? parseTags(text) : [];

  if (!tags.length) throw new Error("Gemma did not return valid tags.");
  return tags;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization) return jsonResponse({ error: "Authentication is required." }, 401);

  try {
    const { inboxItemId } = await request.json();
    if (typeof inboxItemId !== "string" || !inboxItemId) {
      return jsonResponse({ error: "inboxItemId is required." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!supabaseUrl || !anonKey) throw new Error("Supabase configuration is missing.");

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return jsonResponse({ error: "Invalid session." }, 401);

    const { data: item, error: itemError } = await supabase
      .from("inbox_items")
      .select("id, user_id, title, content, summary, source_url, url, tags")
      .eq("id", inboxItemId)
      .eq("user_id", auth.user.id)
      .single();
    if (itemError || !item) return jsonResponse({ error: "Inbox item not found." }, 404);

    const generatedTags = await generateTags(item);
    const tags = [...new Set([...normaliseTags(item.tags), ...generatedTags])];
    const { error: updateError } = await supabase
      .from("inbox_items")
      .update({ tags })
      .eq("id", item.id)
      .eq("user_id", auth.user.id);
    if (updateError) throw updateError;

    return jsonResponse({ inboxItemId: item.id, tags, model: TAG_MODEL });
  } catch (error) {
    console.error("Inbox tag generation failed:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to tag inbox item." }, 500);
  }
});
