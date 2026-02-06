import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const HTTPSMS_KEY = process.env.HTTPSMS_API_KEY!;
const HTTPSMS_FROM = process.env.HTTPSMS_FROM_PHONE!;

export async function GET() {
  try {
    // Fetch message threads from httpSMS
    const threadsRes = await fetch(
      `https://api.httpsms.com/v1/message-threads?owner=${encodeURIComponent(HTTPSMS_FROM)}`,
      {
        headers: { "x-api-key": HTTPSMS_KEY },
      }
    );

    const threadsData = await threadsRes.json();
    const threads = threadsData.data || [];
    let newMessageCount = 0;

    for (const thread of threads) {
      const contact = thread.contact;
      if (!contact) continue;

      // Fetch recent messages for this thread
      const msgsRes = await fetch(
        `https://api.httpsms.com/v1/messages?owner=${encodeURIComponent(HTTPSMS_FROM)}&contact=${encodeURIComponent(contact)}&skip=0&limit=20`,
        {
          headers: { "x-api-key": HTTPSMS_KEY },
        }
      );

      const msgsData = await msgsRes.json();
      const messages = msgsData.data || [];

      if (messages.length === 0) continue;

      // Ensure conversation exists
      const { data: conv } = await supabase
        .from("conversations")
        .upsert(
          { phone: contact },
          { onConflict: "phone" }
        )
        .select("id")
        .single();

      if (!conv) continue;

      // Try to link contact
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("phone", contact)
        .single();

      if (existingContact) {
        await supabase
          .from("conversations")
          .update({ contact_id: existingContact.id })
          .eq("id", conv.id);
      }

      // Insert messages, skipping duplicates
      for (const msg of messages) {
        const httpsmsId = msg.id;
        const direction =
          msg.owner === HTTPSMS_FROM && msg.contact === contact
            ? "outbound"
            : "inbound";

        const { error: insertErr } = await supabase.from("messages").upsert(
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

        if (!insertErr) newMessageCount++;
      }

      // Update conversation's last message
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, created_at")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (lastMsg) {
        // Count unread (inbound messages since we don't track read status, use a simple count)
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("direction", "inbound");

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
  } catch (err) {
    console.error("[poll] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to poll messages" },
      { status: 500 }
    );
  }
}
