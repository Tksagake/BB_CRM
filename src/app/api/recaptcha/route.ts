import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!token) {
      return NextResponse.json({ success: false, error: "No reCAPTCHA token provided." }, { status: 400 });
    }

    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();

    if (data.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, errors: data["error-codes"] });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Server error during reCAPTCHA verification." }, { status: 500 });
  }
}