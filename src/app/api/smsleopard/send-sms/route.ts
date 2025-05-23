import { NextRequest, NextResponse } from "next/server";
import dotenv from "dotenv";

dotenv.config();

export async function POST(req: NextRequest) {
  try {
    // Manually logging the raw request body
    const rawBody = await req.text(); 
    console.log("📝 Raw request body:", rawBody);

    let data;
    try {
      data = JSON.parse(rawBody);
      console.log("📥 Parsed request body:", data);
    } catch (jsonError) {
      console.error("❌ Error parsing request body:", jsonError);
      return NextResponse.json({ error: "Invalid JSON format." }, { status: 400 });
    }

    if (!data.to || !data.message) {
      console.warn("⚠️ Missing required fields:", data);
      return NextResponse.json({ error: "Missing recipient or message." }, { status: 400 });
    }

    const apiKey = process.env.SMS_LEOPARD_API_KEY;
    const apiSecret = process.env.SMS_LEOPARD_API_SECRET;
    const apiUrl = process.env.SMS_LEOPARD_API_URL || "https://api.smsleopard.com/v1/sms/send";
    const sender = process.env.SMS_LEOPARD_SENDER || "SARY";

    if (!apiKey || !apiSecret) {
      console.error("❌ Missing API credentials.");
      return NextResponse.json({ error: "Missing API credentials." }, { status: 500 });
    }

    const requestBody = {
      source: sender,
      message: data.message,
      destination: [{ number: data.to }],
      status_url: "",
      status_secret: ""
    };

    console.log("📤 Sending SMS with payload:", JSON.stringify(requestBody, null, 2));

    const authHeader = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    console.log("📩 SMS API Response:", JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error("❌ SMS API Error:", result);
      return NextResponse.json({ error: result.message || "Failed to send SMS", details: result }, { status: response.status });
    }

    console.log("✅ SMS successfully sent:", result);
    return NextResponse.json({ success: true, result }, { status: 200 });

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return NextResponse.json({ error: "Failed to send SMS." }, { status: 500 });
  }
}
