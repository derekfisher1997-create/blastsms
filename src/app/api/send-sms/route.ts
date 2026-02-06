import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const HTTPSMS_KEY = process.env.HTTPSMS_API_KEY!;
const HTTPSMS_FROM = process.env.HTTPSMS_FROM_PHONE!;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: "phone and message are required" },
        { status: 400 }
      );
    }

    // Clean phone number: strip spaces, dashes, parens — keep + and digits
    const cleanPhone = phone.replace(/[\s\-()]/g, "");

    console.log(`[send-sms] Sending to ${cleanPhone}: "${message}"`);

    const res = await fetch("https://api.httpsms.com/v1/messages/send", {
      method: "POST",
      headers: {
        "x-api-key": HTTPSMS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: HTTPSMS_FROM,
        to: cleanPhone,
        content: message,
      }),
    });

    const data = await res.json();
    console.log("[send-sms] httpSMS response:", JSON.stringify(data, null, 2));

    if (data.data?.id) {
      // Bridge: also write to Supabase for inbox visibility
      try {
        // Upsert conversation
        const { data: conv } = await supabase
          .from("conversations")
          .upsert({ phone: cleanPhone }, { onConflict: "phone" })
          .select("id")
          .single();

        if (conv) {
          // Try to link contact
          const { data: contact } = await supabase
            .from("contacts")
            .select("id")
            .eq("phone", cleanPhone)
            .single();

          if (contact) {
            await supabase
              .from("conversations")
              .update({ contact_id: contact.id })
              .eq("id", conv.id);
          }

          // Insert outbound message
          await supabase.from("messages").upsert(
            {
              httpsms_id: data.data.id,
              conversation_id: conv.id,
              direction: "outbound",
              content: message,
              status: data.data.status || "sent",
            },
            { onConflict: "httpsms_id", ignoreDuplicates: true }
          );

          // Update last message
          await supabase
            .from("conversations")
            .update({
              last_message: message,
              last_message_at: new Date().toISOString(),
            })
            .eq("id", conv.id);
        }
      } catch (sbErr) {
        // Don't fail the SMS send if Supabase write fails
        console.error("[send-sms] Supabase bridge error:", sbErr);
      }

      return NextResponse.json({
        success: true,
        textId: data.data.id,
        status: data.data.status,
        quotaRemaining: undefined,
      });
    }

    // httpSMS error
    return NextResponse.json({
      success: false,
      error: data.message || JSON.stringify(data),
    });
  } catch (err) {
    console.error("[send-sms] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to send SMS" },
      { status: 500 }
    );
  }
}
