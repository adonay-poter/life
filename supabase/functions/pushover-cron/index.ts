import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async () => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    const pushoverUserKey = Deno.env.get("PUSHOVER_USER_KEY") || "";
    const pushoverApiToken = Deno.env.get("PUSHOVER_API_TOKEN") || "";
    const dashboardUrl = Deno.env.get("DASHBOARD_URL") || "https://hulu-dashboard.vercel.app";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    if (!pushoverUserKey || !pushoverApiToken) {
      throw new Error("Missing Pushover credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const today = new Date().toISOString().split('T')[0];

    // 1. Check for overdue tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, name')
      .neq('status', 'done')
      .lt('due_date', today)
      .or(`last_notified_at.is.null,last_notified_at.lt.${today}T00:00:00Z`);

    // 2. Check for due flashcards
    const { data: flashcards, error: cardsError } = await supabase
      .from('flashcards')
      .select('id')
      .lte('next_review_date', today)
      .or(`last_notified_at.is.null,last_notified_at.lt.${today}T00:00:00Z`);
      
    // 3. Check for unsorted inbox items
    const { data: inbox, error: inboxError } = await supabase
      .from('inbox_items')
      .select('id')
      .eq('status', 'unsorted')
      .or(`last_notified_at.is.null,last_notified_at.lt.${today}T00:00:00Z`);

    if (tasksError) console.error("Tasks error:", tasksError);
    if (cardsError) console.error("Cards error:", cardsError);
    if (inboxError) console.error("Inbox error:", inboxError);
    if (tasksError || cardsError || inboxError) {
      throw new Error(`DB Error: ${tasksError?.message || cardsError?.message || inboxError?.message}`);
    }

    const overdueCount = tasks?.length || 0;
    const cardsCount = flashcards?.length || 0;
    const inboxCount = inbox?.length || 0;

    const messages = [];
    if (overdueCount > 0) messages.push(`${overdueCount} Overdue Task(s)`);
    if (cardsCount > 0) messages.push(`${cardsCount} Flashcard(s) Due`);
    if (inboxCount > 10) messages.push(`Inbox Overflow: ${inboxCount} items`);

    if (messages.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "Nothing due" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    const summary = messages.join(", ");
    
    // Send to Pushover
    const form = new FormData();
    form.append("token", pushoverApiToken);
    form.append("user", pushoverUserKey);
    form.append("title", "Hulu Dashboard Alerts");
    form.append("message", summary);
    form.append("url", dashboardUrl);
    form.append("url_title", "Open Dashboard");

    const response = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error("Pushover API error: " + err);
    }

    // Update last_notified_at for the alerted items
    const now = new Date().toISOString();
    
    if (tasks && tasks.length > 0) {
      const taskIds = tasks.map(t => t.id);
      await supabase.from('tasks').update({ last_notified_at: now }).in('id', taskIds);
    }
    
    if (flashcards && flashcards.length > 0) {
      const cardIds = flashcards.map(c => c.id);
      await supabase.from('flashcards').update({ last_notified_at: now }).in('id', cardIds);
    }
    
    if (inbox && inbox.length > 10) {
      // Only update if it actually triggered the alert (count > 10)
      const inboxIds = inbox.map(i => i.id);
      await supabase.from('inbox_items').update({ last_notified_at: now }).in('id', inboxIds);
    }

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
