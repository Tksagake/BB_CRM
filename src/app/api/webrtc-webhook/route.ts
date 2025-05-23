// app/api/webrtc-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic'; // Ensure the route is dynamic

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    // Extract data from query parameters
    const callData = {
      type: searchParams.get('type'),
      CallSid: searchParams.get('CallSid'),
      SourceNumber: searchParams.get('SourceNumber'),
      DestinationNumber: searchParams.get('DestinationNumber'),
      Status: searchParams.get('Status'),
      StartTime: searchParams.get('StartTime'),
      DialWhomNumber: searchParams.get('DialWhomNumber'),
      Direction: searchParams.get('Direction'),
      receiver_name: searchParams.get('receiver_name'),
      EndTime: searchParams.get('EndTime'),
      CallDuration: searchParams.get('CallDuration'),
      CallRecordingUrl: searchParams.get('CallRecordingUrl'),
      coins: searchParams.get('coins'),
      call_group: searchParams.get('call_group')
    };

    // Ensure required data is present
    if (!callData.CallSid || !callData.StartTime) {
      return NextResponse.json(
        { error: "Missing CallSid or StartTime" },
        { status: 400 }
      );
    }

    // Format data for insertion
    const formattedData = {
      // Agent info (caller)
      agent_number: callData.SourceNumber,
      agent_name: callData.receiver_name, // If available

      // Receiver info (callee)
      receiver_number: callData.DialWhomNumber,
      receiver_name: callData.receiver_name, // Same field may apply

      // Call metadata
      direction: callData.Direction, // "inbound" or "outbound"
      source_number: callData.SourceNumber || null,
      destination_number: callData.DestinationNumber || null,
      dial_whom_number: callData.DialWhomNumber || null,
      call_duration: callData.CallDuration ? Number(callData.CallDuration) : null, // Convert to integer
      status: callData.Status || null,
      start_time: callData.StartTime ? new Date(callData.StartTime).toISOString() : null, // Convert to timestamp
      end_time: callData.EndTime ? new Date(callData.EndTime).toISOString() : null, // Convert to timestamp
      call_sid: callData.CallSid || null,
      call_group: callData.call_group || null,
      call_recording_url: callData.CallRecordingUrl || null, // Ensure this exists in DB
      coins: callData.coins ? Number(callData.coins) : 0 // Convert to integer
    };

    // Insert into Supabase
    const { error } = await supabase
      .from('call_logs')
      .upsert([formattedData], { onConflict: 'call_sid' });

    if (error) throw error;

    // Respond with success
    console.log("📞 Call logged successfully:", callData.CallSid);
    return NextResponse.json(
      { success: true, call_id: callData.CallSid },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}