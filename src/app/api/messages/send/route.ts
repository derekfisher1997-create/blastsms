import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const HTTPSMS_KEY = process.env.HTTPSMS_API_KEY!.trim();
const HTTPSMS_FROM = process.env.HTTPSMS_FROM_PHONE!.trim();

export async function POST(request: Request) {
  try {
    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: "phone and message are required" },
        { status: 400 }
      );
    }

    const cleanPhone = phone.replace(/[\s\-()]/g, "");

    // Send via httpSMS
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

    if (!data.data?.id) {
      return NextResponse.json({
        success: false,
        error: data.message || JSON.stringify(data),
      });
    }

    // Ensure conversation exists
    const { data: conv } = await supabase
      .from("conversations")
      .upsert({ phone: cleanPhone }, { onConflict: "phone" })
      .select("id")
      .single();

    if (conv) {
      // Store outbound message
      await supabase.from("messages").insert({
        conversation_id: conv.id,
        httpsms_id: data.data.id,
        direction: "outbound",
        content: message,
        status: data.data.status || "sent",
      });

      // Update conversation
      await supabase
        .from("conversations")
        .update({
          last_message: message,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conv.id);
    }

    return NextResponse.json({
      success: true,
      textId: data.data.id,
      status: data.data.status,
    });
  } catch (err) {
    console.error("[messages/send] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to send message" },
      { status: 500 }
    );
  }
}
