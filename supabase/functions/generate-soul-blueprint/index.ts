import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WINDOW_DAYS = 14;
const MEANINGFUL_EVENT_TYPES = new Set([
  "task_created",
  "task_completed",
  "task_updated",
  "project_created",
  "project_updated",
  "inbox_item_created",
  "inbox_item_processed",
  "inbox_item_updated",
  "knowledge_note_created",
  "knowledge_note_updated",
  "flashcard_reviewed",
  "journal_entry_created",
  "habit_checked",
  "review_completed",
]);

type RecordMap = Record<string, unknown>;

type ActivityEvent = {
  id: string;
  user_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  metadata: RecordMap;
  created_at: string;
};

type SnapshotRow = {
  id: string;
  user_id: string;
  version: number;
  content_markdown: string;
  content_json: RecordMap;
  core_markdown: string | null;
  projects_markdown: string | null;
  learning_markdown: string | null;
  journal_markdown: string | null;
  review_markdown: string | null;
  token_estimate: number | null;
  source_hash: string | null;
  last_event_id: string | null;
  window_start: string | null;
  window_end: string | null;
  generated_at: string;
  created_at: string;
};

type BlueprintPayload = {
  content_json: RecordMap;
  core_markdown: string;
  projects_markdown: string;
  learning_markdown: string;
  journal_markdown: string;
  review_markdown: string;
  content_markdown: string;
  token_estimate: number;
};

type StructuredSource = {
  generatedAt: string;
  windowLabel: string;
  recentEvents: Array<RecordMap>;
  currentFocus: string[];
  activeProjects: Array<RecordMap>;
  openLoops: string[];
  learningThemes: string[];
  journalPatterns: string[];
  reviewSignals: string[];
  tomorrowInherits: string[];
  aiInstructions: string[];
  counts: RecordMap;
};

function jsonResponse(body: RecordMap, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getWindowStartIso() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - WINDOW_DAYS);
  return date.toISOString();
}

function formatDateTime(dateIso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(dateIso));
}

function estimateTokens(value: string) {
  return Math.ceil(value.length / 4);
}

function truncate(value: string | null | undefined, max = 140) {
  if (!value) return "";
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function sha256(value: string) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getLatestSnapshot(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase
    .from("soul_blueprint_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as SnapshotRow | null) || null;
}

async function getRecentEvents(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  snapshot: SnapshotRow | null
) {
  let query = supabase
    .from("activity_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(250);

  if (snapshot?.generated_at) {
    query = query.gt("created_at", snapshot.generated_at);
  } else {
    query = query.gte("created_at", getWindowStartIso());
  }

  const { data, error } = await query;

  if (error) throw error;

  return ((data || []) as ActivityEvent[]).filter((event) => MEANINGFUL_EVENT_TYPES.has(event.event_type));
}

async function getChangedUsers(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("activity_events")
    .select("user_id, created_at")
    .gte("created_at", getWindowStartIso())
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  return Array.from(new Set((data || []).map((item) => item.user_id).filter(Boolean)));
}

async function aggregateUserData(supabase: ReturnType<typeof createClient>, userId: string, snapshot: SnapshotRow | null, events: ActivityEvent[]) {
  const windowStartIso = snapshot?.window_start || getWindowStartIso();
  const todayIso = new Date().toISOString();

  const [
    projectsRes,
    tasksRes,
    inboxRes,
    knowledgeRes,
    journalRes,
    digestRes,
    reviewQueueRes,
    coursesRes,
    modulesRes,
    lessonsRes,
    flashcardsRes,
    habitsRes,
    habitRecordsRes,
    dailyLogsRes,
  ] = await Promise.all([
    supabase.from("projects").select("*"),
    supabase.from("tasks").select("*"),
    supabase.from("inbox_items").select("*"),
    supabase.from("knowledge_items").select("*").eq("user_id", userId),
    supabase.from("journal_entries").select("*"),
    supabase.from("daily_digests").select("*").eq("user_id", userId).gte("date", windowStartIso.slice(0, 10)),
    supabase.from("review_entries").select("*").eq("user_id", userId).gte("review_date", windowStartIso.slice(0, 10)),
    supabase.from("review_queue_items").select("*").eq("user_id", userId).neq("status", "archived"),
    supabase.from("courses").select("*"),
    supabase.from("course_modules").select("*"),
    supabase.from("lessons").select("*"),
    supabase.from("flashcards").select("*"),
    supabase.from("habits").select("*"),
    supabase.from("habit_records").select("*").gte("date", windowStartIso.slice(0, 10)),
    supabase.from("daily_logs").select("*").gte("date", windowStartIso.slice(0, 10)),
  ]);

  const results = [
    projectsRes,
    tasksRes,
    inboxRes,
    knowledgeRes,
    journalRes,
    digestRes,
    reviewQueueRes,
    coursesRes,
    modulesRes,
    lessonsRes,
    flashcardsRes,
    habitsRes,
    habitRecordsRes,
    dailyLogsRes,
  ];

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw failed.error;
  }

  const projects = (projectsRes.data || []) as Array<RecordMap>;
  const tasks = (tasksRes.data || []) as Array<RecordMap>;
  const inboxItems = (inboxRes.data || []) as Array<RecordMap>;
  const knowledgeItems = (knowledgeRes.data || []) as Array<RecordMap>;
  const journalEntries = ((journalRes.data || []) as Array<RecordMap>).filter((entry) => {
    const date = String(entry.date || "");
    return date >= windowStartIso.slice(0, 10);
  });
  const dailyDigests = (digestRes.data || []) as Array<RecordMap>;
  const reviewQueueItems = (reviewQueueRes.data || []) as Array<RecordMap>;
  const courses = (coursesRes.data || []) as Array<RecordMap>;
  const modules = (modulesRes.data || []) as Array<RecordMap>;
  const lessons = (lessonsRes.data || []) as Array<RecordMap>;
  const flashcards = (flashcardsRes.data || []) as Array<RecordMap>;
  const habits = (habitsRes.data || []) as Array<RecordMap>;
  const habitRecords = (habitRecordsRes.data || []) as Array<RecordMap>;
  const dailyLogs = (dailyLogsRes.data || []) as Array<RecordMap>;

  const activeProjects = projects
    .filter((project) => !project.is_archived && project.status !== "completed" && project.status !== "cancelled")
    .map((project) => {
      const projectTasks = tasks.filter((task) => task.project_id === project.id);
      const openTasks = projectTasks.filter((task) => task.status !== "done");
      const nextTask = openTasks.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 } as Record<string, number>;
        const dueA = a.due_date ? new Date(String(a.due_date)).getTime() : Number.MAX_SAFE_INTEGER;
        const dueB = b.due_date ? new Date(String(b.due_date)).getTime() : Number.MAX_SAFE_INTEGER;
        const priorityDelta = (priorityOrder[String(a.priority)] ?? 9) - (priorityOrder[String(b.priority)] ?? 9);
        return priorityDelta !== 0 ? priorityDelta : dueA - dueB;
      })[0];

      const relatedInbox = inboxItems.filter((item) => item.project_id === project.id).slice(0, 2);
      const relatedKnowledge = knowledgeItems.filter((item) => item.created_from_inbox_item_id && relatedInbox.some((inbox) => inbox.id === item.created_from_inbox_item_id)).slice(0, 2);

      return {
        ...project,
        open_task_count: openTasks.length,
        next_action: nextTask?.name || "Define a next action",
        risk:
          openTasks.length === 0
            ? "No active next action"
            : openTasks.some((task) => task.status === "blocked")
              ? "Blocked work is present"
              : !nextTask?.due_date
                ? "Next action is unscheduled"
                : "Execution path exists",
        related_captures: relatedInbox.map((item) => item.title).filter(Boolean),
        related_knowledge: relatedKnowledge.map((item) => item.title).filter(Boolean),
      };
    })
    .sort((a, b) => {
      const deadlineA = a.deadline ? new Date(String(a.deadline)).getTime() : Number.MAX_SAFE_INTEGER;
      const deadlineB = b.deadline ? new Date(String(b.deadline)).getTime() : Number.MAX_SAFE_INTEGER;
      return (b.open_task_count as number) - (a.open_task_count as number) || deadlineA - deadlineB;
    })
    .slice(0, 5);

  const unprocessedInbox = inboxItems.filter((item) => item.status === "unprocessed" || item.status === "unsorted");
  const staleTasks = tasks.filter((task) => task.status !== "done" && task.due_date && new Date(String(task.due_date)).getTime() < Date.now());
  const noNextActionProjects = activeProjects.filter((project) => Number(project.open_task_count) === 0);
  const openQuestions = dailyDigests.flatMap((digest) => Array.isArray(digest.open_questions) ? digest.open_questions : []);
  const returningSnoozes = inboxItems.filter((item) => item.status === "snoozed" && item.snoozed_until && String(item.snoozed_until) <= todayIso.slice(0, 10));

  const knowledgeTopics = knowledgeItems
    .map((item) => String(item.topic || item.type || "").trim())
    .filter(Boolean);
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const learningThemes = uniqueStrings([
    ...knowledgeTopics,
    ...modules.map((module) => String(module.title || "")).filter(Boolean),
    ...courses.map((course) => String(course.title || "")).filter(Boolean),
  ]).slice(0, 5);

  const journalPatterns = uniqueStrings([
    ...journalEntries.flatMap((entry) => Array.isArray(entry.morning_intentions) ? entry.morning_intentions.map((item) => truncate(String(item), 90)) : []),
    ...journalEntries.flatMap((entry) => Array.isArray(entry.evening_reflections_learned) ? entry.evening_reflections_learned.map((item) => truncate(String(item), 90)) : []),
    ...journalEntries.flatMap((entry) => Array.isArray(entry.evening_reflections_better) ? entry.evening_reflections_better.map((item) => `Friction: ${truncate(String(item), 90)}`) : []),
  ]).slice(0, 8);

  const reviewSignals = uniqueStrings([
    ...reviewQueueItems.slice(0, 6).map((item) => `${item.reason}${item.suggested_action ? ` -> ${item.suggested_action}` : ""}`),
    ...noNextActionProjects.slice(0, 3).map((project) => `${project.name}: define a next action or archive it.`),
    ...staleTasks.slice(0, 3).map((task) => `${task.name}: overdue and still open.`),
  ]).slice(0, 10);

  const currentFocus = uniqueStrings([
    ...activeProjects.slice(0, 3).map((project) => `${project.name}: ${project.next_action}`),
    ...tasks
      .filter((task) => task.status !== "done" && (task.priority === "high" || task.status === "in_progress"))
      .slice(0, 3)
      .map((task) => `${task.name} (${task.status})`),
  ]).slice(0, 5);

  const tomorrowInherits = uniqueStrings([
    tasks.find((task) => task.status !== "done")?.name ? `First task: ${tasks.find((task) => task.status !== "done")?.name}` : "",
    learningThemes[0] ? `Review learning theme: ${learningThemes[0]}` : "",
    unprocessedInbox[0]?.title ? `Close loop: ${truncate(String(unprocessedInbox[0].title), 90)}` : "",
    openQuestions[0] ? `Revisit question: ${truncate(String(openQuestions[0]), 90)}` : "",
  ]).slice(0, 4);

  const source: StructuredSource = {
    generatedAt: todayIso,
    windowLabel: `Last ${WINDOW_DAYS} days`,
    recentEvents: events.slice(-20).map((event) => ({
      event_type: event.event_type,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      created_at: event.created_at,
      metadata: event.metadata,
    })),
    currentFocus,
    activeProjects: activeProjects.map((project) => ({
      name: project.name,
      status: project.status,
      next_action: project.next_action,
      risk: project.risk,
      related_captures: project.related_captures,
      related_knowledge: project.related_knowledge,
    })),
    openLoops: uniqueStrings([
      ...unprocessedInbox.slice(0, 4).map((item) => `Inbox: ${truncate(String(item.title), 90)}`),
      ...staleTasks.slice(0, 4).map((task) => `Task: ${task.name} is overdue.`),
      ...noNextActionProjects.slice(0, 3).map((project) => `Project: ${project.name} has no next action.`),
      ...openQuestions.slice(0, 3).map((question) => `Open question: ${truncate(String(question), 90)}`),
      ...returningSnoozes.slice(0, 2).map((item) => `Snoozed item returning: ${truncate(String(item.title), 90)}`),
    ]).slice(0, 10),
    learningThemes: learningThemes.map((theme) => {
      const relatedNotes = knowledgeItems.filter((item) => String(item.topic || item.type || "") === theme).slice(0, 2);
      const relatedModule = modules.find((module) => String(module.title || "") === theme);
      const courseTitle = relatedModule ? String(courseMap.get(relatedModule.course_id)?.title || "") : "";
      return [theme, relatedNotes[0]?.title ? `Insight: ${truncate(String(relatedNotes[0].title), 90)}` : "", courseTitle ? `Course: ${courseTitle}` : ""]
        .filter(Boolean)
        .join(" | ");
    }),
    journalPatterns,
    reviewSignals,
    tomorrowInherits,
    aiInstructions: [
      "Prioritize the current focus before broader idea generation.",
      "Avoid overwhelming the user with too many simultaneous actions.",
      "Surface captured ideas that are at risk of being lost.",
      "Turn learning into concrete tasks when appropriate.",
      "Use calm, direct language and distinguish facts from interpretations.",
    ],
    counts: {
      active_projects: activeProjects.length,
      open_tasks: tasks.filter((task) => task.status !== "done").length,
      unprocessed_inbox: unprocessedInbox.length,
      recent_knowledge_items: knowledgeItems.length,
      recent_journal_entries: journalEntries.length,
      review_queue_items: reviewQueueItems.length,
      due_flashcards: flashcards.filter((card) => card.next_review_date && String(card.next_review_date) <= todayIso).length,
      habits: habits.length,
      habit_records_in_window: habitRecords.length,
      daily_logs_in_window: dailyLogs.length,
      lessons_incomplete: lessons.filter((lesson) => !lesson.completed).length,
    },
  };

  return { source, windowStartIso, todayIso };
}

function buildFallbackBlueprint(source: StructuredSource): BlueprintPayload {
  const header = [
    "# Soul Blueprint Core",
    "",
    `Generated: ${formatDateTime(source.generatedAt)}`,
    `Window: ${source.windowLabel}`,
    "Mode: Current Operating Snapshot",
    "",
    "## Current Focus",
    ...source.currentFocus.map((item) => `- ${item}`),
    "",
    "## Active Projects",
    ...source.activeProjects.map((project) => [
      `- ${project.name}`,
      `  Status: ${project.status || "unknown"}`,
      `  Next action: ${project.next_action || "Clarify next action"}`,
      `  Risk: ${project.risk || "Needs review"}`,
      project.related_captures?.length ? `  Related captures: ${project.related_captures.join(", ")}` : "",
      project.related_knowledge?.length ? `  Related knowledge: ${project.related_knowledge.join(", ")}` : "",
    ].filter(Boolean).join("\n")),
    "",
    "## Open Loops",
    ...source.openLoops.map((item) => `- ${item}`),
    "",
    "## Learning Themes",
    ...source.learningThemes.map((item) => `- ${item}`),
    "",
    "## Journal Patterns",
    ...source.journalPatterns.map((item) => `- ${item}`),
    "",
    "## Review Signals",
    ...source.reviewSignals.map((item) => `- ${item}`),
    "",
    "## Tomorrow / Next Session Inherits",
    ...source.tomorrowInherits.map((item) => `- ${item}`),
    "",
    "## AI Context Instructions",
    "When assisting the user:",
    ...source.aiInstructions.map((item) => `- ${item}`),
  ].join("\n");

  const projectsMarkdown = [
    "# Soul Blueprint Projects",
    "",
    `Generated: ${formatDateTime(source.generatedAt)}`,
    "",
    ...source.activeProjects.map((project) => [
      `## ${project.name}`,
      `- Status: ${project.status || "unknown"}`,
      `- Next action: ${project.next_action || "Clarify next action"}`,
      `- Risk: ${project.risk || "Needs review"}`,
      project.related_captures?.length ? `- Related captures: ${project.related_captures.join(", ")}` : "",
      project.related_knowledge?.length ? `- Related knowledge: ${project.related_knowledge.join(", ")}` : "",
    ].filter(Boolean).join("\n")),
  ].join("\n");

  const learningMarkdown = [
    "# Soul Blueprint Learning",
    "",
    `Generated: ${formatDateTime(source.generatedAt)}`,
    "",
    "## Active Learning Themes",
    ...source.learningThemes.map((item) => `- ${item}`),
  ].join("\n");

  const journalMarkdown = [
    "# Soul Blueprint Journal",
    "",
    `Generated: ${formatDateTime(source.generatedAt)}`,
    "",
    "## Recurring Patterns",
    ...source.journalPatterns.map((item) => `- ${item}`),
  ].join("\n");

  const reviewMarkdown = [
    "# Soul Blueprint Review",
    "",
    `Generated: ${formatDateTime(source.generatedAt)}`,
    "",
    "## Review Signals",
    ...source.reviewSignals.map((item) => `- ${item}`),
    "",
    "## Open Loops",
    ...source.openLoops.map((item) => `- ${item}`),
  ].join("\n");

  const contentMarkdown = [
    header,
    "",
    "---",
    "",
    projectsMarkdown,
    "",
    "---",
    "",
    learningMarkdown,
    "",
    "---",
    "",
    journalMarkdown,
    "",
    "---",
    "",
    reviewMarkdown,
  ].join("\n");

  return {
    content_json: source as unknown as RecordMap,
    core_markdown: header,
    projects_markdown: projectsMarkdown,
    learning_markdown: learningMarkdown,
    journal_markdown: journalMarkdown,
    review_markdown: reviewMarkdown,
    content_markdown: contentMarkdown,
    token_estimate: estimateTokens(contentMarkdown),
  };
}

async function generateWithGemini(source: StructuredSource): Promise<BlueprintPayload | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;

  const prompt = `You are generating a Soul Blueprint for a personal life operating system.
This blueprint is AI context, not the source of truth.
Use only the structured source below. Do not invent facts. Distinguish facts from interpretations.
Keep the output compact, calm, direct, medium-sized, and privacy-preserving.
Do not dump raw journal text or any secrets. Summarize patterns only.

Return strict JSON with keys:
- core_markdown
- projects_markdown
- learning_markdown
- journal_markdown
- review_markdown
- content_json

Each markdown field should already include its own title.
Core should follow this structure:
# Soul Blueprint Core
Generated
Window
Mode
## Current Focus
## Active Projects
## Open Loops
## Learning Themes
## Journal Patterns
## Review Signals
## Tomorrow / Next Session Inherits
## AI Context Instructions

Structured source:
${JSON.stringify(source)}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!response.ok) {
    console.warn("Soul Blueprint Gemini request failed:", await response.text());
    return null;
  }

  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) return null;

  try {
    const parsed = JSON.parse(text.trim());
    const coreMarkdown = String(parsed.core_markdown || "").trim();
    const projectsMarkdown = String(parsed.projects_markdown || "").trim();
    const learningMarkdown = String(parsed.learning_markdown || "").trim();
    const journalMarkdown = String(parsed.journal_markdown || "").trim();
    const reviewMarkdown = String(parsed.review_markdown || "").trim();

    if (!coreMarkdown || !projectsMarkdown || !learningMarkdown || !journalMarkdown || !reviewMarkdown) {
      return null;
    }

    const contentMarkdown = [
      coreMarkdown,
      "",
      "---",
      "",
      projectsMarkdown,
      "",
      "---",
      "",
      learningMarkdown,
      "",
      "---",
      "",
      journalMarkdown,
      "",
      "---",
      "",
      reviewMarkdown,
    ].join("\n");

    return {
      content_json: typeof parsed.content_json === "object" && parsed.content_json ? parsed.content_json : source as unknown as RecordMap,
      core_markdown: coreMarkdown,
      projects_markdown: projectsMarkdown,
      learning_markdown: learningMarkdown,
      journal_markdown: journalMarkdown,
      review_markdown: reviewMarkdown,
      content_markdown: contentMarkdown,
      token_estimate: estimateTokens(contentMarkdown),
    };
  } catch (error) {
    console.warn("Failed to parse Soul Blueprint Gemini response:", error);
    return null;
  }
}

async function generateForUser(supabase: ReturnType<typeof createClient>, userId: string) {
  const latestSnapshot = await getLatestSnapshot(supabase, userId);
  const recentEvents = await getRecentEvents(supabase, userId, latestSnapshot);

  if (latestSnapshot && recentEvents.length === 0) {
    return {
      status: "unchanged",
      reason: "No meaningful activity events since the latest snapshot.",
      snapshot: latestSnapshot,
      tokenEstimate: latestSnapshot.token_estimate,
      generatedAt: latestSnapshot.generated_at,
    };
  }

  const { source, windowStartIso, todayIso } = await aggregateUserData(supabase, userId, latestSnapshot, recentEvents);
  const sourceHash = await sha256(JSON.stringify(source));

  if (latestSnapshot?.source_hash && latestSnapshot.source_hash === sourceHash) {
    return {
      status: "unchanged",
      reason: "Relevant activity changed, but the compact blueprint source hash did not.",
      snapshot: latestSnapshot,
      tokenEstimate: latestSnapshot.token_estimate,
      generatedAt: latestSnapshot.generated_at,
    };
  }

  const generated = (await generateWithGemini(source)) || buildFallbackBlueprint(source);
  const lastEvent = recentEvents[recentEvents.length - 1] || null;

  const insertPayload = {
    user_id: userId,
    version: 1,
    content_markdown: generated.content_markdown,
    content_json: generated.content_json,
    core_markdown: generated.core_markdown,
    projects_markdown: generated.projects_markdown,
    learning_markdown: generated.learning_markdown,
    journal_markdown: generated.journal_markdown,
    review_markdown: generated.review_markdown,
    token_estimate: generated.token_estimate,
    source_hash: sourceHash,
    last_event_id: lastEvent?.id || null,
    window_start: windowStartIso,
    window_end: todayIso,
    generated_at: todayIso,
  };

  const { data, error } = await supabase
    .from("soul_blueprint_snapshots")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) throw error;

  return {
    status: "updated",
    reason: "Snapshot regenerated from recent activity.",
    snapshot: data,
    tokenEstimate: generated.token_estimate,
    generatedAt: todayIso,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase service role configuration.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await request.json().catch(() => ({}));
    const mode = body.mode === "scheduled" ? "scheduled" : "manual";

    if (mode === "scheduled") {
      const cronSecret = Deno.env.get("SOUL_BLUEPRINT_CRON_SECRET");
      if (!cronSecret || request.headers.get("x-cron-secret") !== cronSecret) {
        return jsonResponse({ error: "Unauthorized cron invocation." }, 401);
      }

      const changedUsers = await getChangedUsers(supabase);
      const results = [];

      for (const userId of changedUsers) {
        results.push(await generateForUser(supabase, userId));
      }

      return jsonResponse({
        status: "ok",
        mode,
        checkedUsers: changedUsers.length,
        updatedUsers: results.filter((result) => result.status === "updated").length,
      });
    }

    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return jsonResponse({ error: "Missing bearer token." }, 401);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse({ error: "Authentication failed." }, 401);
    }

    const result = await generateForUser(supabase, user.id);

    return jsonResponse(result);
  } catch (error) {
    console.error("generate-soul-blueprint error", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error." },
      500
    );
  }
});
