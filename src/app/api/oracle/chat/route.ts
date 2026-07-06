import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Simple keyword-based context section selector
function selectBlueprintSections(query: string): string[] {
  const q = query.toLowerCase();
  const sections: string[] = ['core'];
  let matched = false;

  if (
    q.includes('project') ||
    q.includes('task') ||
    q.includes('deadline') ||
    q.includes('execution') ||
    q.includes('planning') ||
    q.includes('work') ||
    q.includes('focus')
  ) {
    sections.push('projects');
    matched = true;
  }
  if (
    q.includes('learning') ||
    q.includes('note') ||
    q.includes('academy') ||
    q.includes('flashcard') ||
    q.includes('course') ||
    q.includes('research') ||
    q.includes('knowledge')
  ) {
    sections.push('learning');
    matched = true;
  }
  if (
    q.includes('energy') ||
    q.includes('mood') ||
    q.includes('reflection') ||
    q.includes('pattern') ||
    q.includes('habit') ||
    q.includes('personal review')
  ) {
    sections.push('journal');
    matched = true;
  }
  if (
    q.includes('review') ||
    q.includes('weekly planning') ||
    q.includes('open loop') ||
    q.includes('stale') ||
    q.includes('overdue') ||
    q.includes('priorit')
  ) {
    sections.push('review');
    matched = true;
  }

  // Fallback: If no section matches, include "review" in addition to "core"
  if (!matched) {
    sections.push('review');
  }

  return sections;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Authorization header is missing' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { message, conversationId } = await request.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 1. Fetch latest Soul Blueprint
    const { data: snapshot, error: snapshotError } = await supabase
      .from('soul_blueprint_snapshots')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snapshotError) {
      console.error('Error loading latest Soul Blueprint:', snapshotError);
      return NextResponse.json({ error: 'Failed to retrieve context layer' }, { status: 500 });
    }

    if (!snapshot) {
      return NextResponse.json(
        { error: 'No operating context has been generated yet. Generate your Oracle context first.' },
        { status: 400 }
      );
    }

    // 2. Dynamically select blueprint sections based on user query
    const selectedSections = selectBlueprintSections(message);

    // 3. Setup conversation session
    let activeConversationId = conversationId;
    let isNewConversation = false;

    if (!activeConversationId) {
      isNewConversation = true;
      const { data: newConv, error: newConvError } = await supabase
        .from('oracle_conversations')
        .insert({
          user_id: user.id,
          title: 'Oracle Chat',
        })
        .select('id')
        .single();

      if (newConvError || !newConv) {
        console.error('Failed to create new conversation:', newConvError);
        return NextResponse.json({ error: 'Failed to initialize chat session' }, { status: 500 });
      }
      activeConversationId = newConv.id;
    }

    // 4. Save user message to Supabase
    const { data: savedUserMsg, error: saveUserError } = await supabase
      .from('oracle_messages')
      .insert({
        conversation_id: activeConversationId,
        user_id: user.id,
        role: 'user',
        content: message,
      })
      .select('id')
      .single();

    if (saveUserError || !savedUserMsg) {
      console.error('Failed to save user message:', saveUserError);
      return NextResponse.json({ error: 'Failed to record user message' }, { status: 500 });
    }

    // 5. Load recent history (last 15 messages)
    let historyMessages: any[] = [];
    if (!isNewConversation) {
      const { data: fetchedHistory, error: historyError } = await supabase
        .from('oracle_messages')
        .select('role, content')
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true })
        .limit(15);

      if (historyError) {
        console.error('Error fetching chat history:', historyError);
      } else {
        // Exclude the message we just saved so we don't send it twice
        historyMessages = (fetchedHistory || []).filter(
          (msg) => !(msg.role === 'user' && msg.content === message)
        );
      }
    }

    // 6. Construct prompt and context
    let contextContent = `Soul Blueprint context snapshot:\n\n`;
    if (selectedSections.includes('core')) {
      contextContent += `### Core Context\n${snapshot.core_markdown || ''}\n\n`;
    }
    if (selectedSections.includes('projects') && snapshot.projects_markdown) {
      contextContent += `### Projects & Tasks\n${snapshot.projects_markdown}\n\n`;
    }
    if (selectedSections.includes('learning') && snapshot.learning_markdown) {
      contextContent += `### Learning & Academy\n${snapshot.learning_markdown}\n\n`;
    }
    if (selectedSections.includes('journal') && snapshot.journal_markdown) {
      contextContent += `### Journal & Habits\n${snapshot.journal_markdown}\n\n`;
    }
    if (selectedSections.includes('review') && snapshot.review_markdown) {
      contextContent += `### Open Loops & Review Signals\n${snapshot.review_markdown}\n\n`;
    }

    const systemPrompt = `You are Oracle, a calm and practical AI assistant inside LifeOS. You help the user reason about their current focus, projects, tasks, captures, learning, journal patterns, review signals, and next actions. Use the provided Soul Blueprint context as orientation. Do not invent facts. If you are unsure, say so. Prefer concrete next steps. Avoid overwhelming the user. Keep responses concise unless the user asks for depth. Make sure to format your answers in clean Markdown.

${contextContent}`;

    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const deepseekModel = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

    if (!deepseekKey) {
      console.error('DEEPSEEK_API_KEY environment variable is missing.');
      return NextResponse.json({ error: 'Server configuration error: DeepSeek API is not configured.' }, { status: 500 });
    }

    // Build message array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...historyMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    // 7. Invoke DeepSeek API
    let assistantMessage = '';
    try {
      const apiResponse = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deepseekKey}`,
        },
        body: JSON.stringify({
          model: deepseekModel,
          messages,
          temperature: 0.15,
        }),
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`DeepSeek API error: ${apiResponse.status} - ${errorText}`);
      }

      const responseData = await apiResponse.json();
      assistantMessage = responseData.choices?.[0]?.message?.content || '';
    } catch (err: any) {
      console.error('Failed to communicate with DeepSeek:', err);
      return NextResponse.json({ error: 'Failed to generate response from Oracle AI: ' + err.message }, { status: 502 });
    }

    if (!assistantMessage) {
      return NextResponse.json({ error: 'Empty response received from Oracle AI.' }, { status: 502 });
    }

    // 8. Save assistant response to Supabase
    const { data: savedAssistantMsg, error: saveAssistantError } = await supabase
      .from('oracle_messages')
      .insert({
        conversation_id: activeConversationId,
        user_id: user.id,
        role: 'assistant',
        content: assistantMessage,
      })
      .select('id')
      .single();

    if (saveAssistantError || !savedAssistantMsg) {
      console.error('Failed to save assistant response:', saveAssistantError);
    }

    // 9. Auto-title conversation on first message
    if (isNewConversation) {
      const generatedTitle = message.length > 35 ? message.substring(0, 32) + '...' : message;
      const { error: titleError } = await supabase
        .from('oracle_conversations')
        .update({ title: generatedTitle })
        .eq('id', activeConversationId);

      if (titleError) {
        console.error('Failed to auto-title conversation:', titleError);
      }
    }

    return NextResponse.json({
      content: assistantMessage,
      conversationId: activeConversationId,
      messageId: savedAssistantMsg?.id,
      modelUsed: deepseekModel,
      sectionsUsed: selectedSections,
      tokenEstimate: snapshot.token_estimate,
    });
  } catch (err: any) {
    console.error('Oracle Chat API Exception:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
