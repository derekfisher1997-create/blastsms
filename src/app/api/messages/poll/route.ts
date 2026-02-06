import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const httpsmsKey = process.env.HTTPSMS_API_KEY;
    const httpsmsFrom = process.env.HTTPSMS_FROM_PHONE;

    if (!supabaseUrl || !supabaseKey || !httpsmsKey || !httpsmsFrom) {
      return NextResponse.json({
        success: false,
        error: "Missing env vars",
        missing: {
          supabaseUrl: !supabaseUrl,
          supabaseKey: !supabaseKey,
          httpsmsKey: !httpsmsKey,
          httpsmsFrom: !httpsmsFrom,
        },
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch message threads from httpSMS
    const threadsRes = await fetch(
      `https://api.httpsms.com/v1/message-threads?owner=${encodeURIComponent(httpsmsFrom)}`,
      { headers: { "x-api-key": httpsmsKey } }
    );

    const threadsData = await threadsRes.json();
    const threads = Array.isArray(threadsData.data) ? threadsData.data : [];
    let newMessageCount = 0;

    for (const thread of threads) {
      const contact = thread.contact;
      if (!contact) continue;

      // Fetch recent messages for this thread
      const msgsRes = await fetch(
        `https://api.httpsms.com/v1/messages?owner=${encodeURIComponent(httpsmsFrom)}&contact=${encodeURIComponent(contact)}&skip=0&limit=20`,
        { headers: { "x-api-key": httpsmsKey } }
      );

      const msgsData = await msgsRes.json();
      const messages = Array.isArray(msgsData.data) ? msgsData.data : [];

      if (messages.length === 0) continue;

      // Ensure conversation exists
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .upsert({ phone: contact }, { onConflict: "phone" })
        .select("id")
        .single();

      if (convErr || !conv) {
        console.error("[poll] Conv upsert error:", convErr);
        continue;
      }

      // Try to link contact
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("phone", contact)
        .maybeSingle();

      if (existingContact) {
        await supabase
          .from("conversations")
          .update({ contact_id: existingContact.id })
          .eq("id", conv.id);
      }

      // Insert messages, skipping duplicates
      for (const msg of messages) {
        const httpsmsId = msg.id;
        // httpSMS: if "from" matches our phone, it's outbound
        const direction = msg.from === httpsmsFrom ? "outbound" : "inbound";

        await supabase.from("messages").upsert(
          {
            httpsms_id: httpsmsId,
            conversation_id: conv.id,
            direction,
            content: msg.content || "",
            status: msg.status || "sent",
            created_at: msg.created_at || new Date().toISOString(),
          },
          { onConflict: "httpsms_id", ignoreDuplicates: true }
        );

        newMessageCount++;
      }

      // Update conversation's last message
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, created_at")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastMsg) {
        await supabase
          .from("conversations")
          .update({
            last_message: lastMsg.content,
            last_message_at: lastMsg.created_at,
          })
          .eq("id", conv.id);
      }
    }

    return NextResponse.json({ success: true, newMessages: newMessageCount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[poll] Error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
