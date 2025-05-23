import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const POST = async (req: NextRequest) => {
    // Log the incoming request
    console.log("Received request:", req);

    // Parse the request body
    const { email, subject, body } = await req.json();
    console.log("Request body:", { email, subject, body });

    // Validate required fields
    if (!email || !subject || !body) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Set up the transporter for nodemailer
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const gmailUser = process.env.GMAIL_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;

    // Check for required environment variables
    if (!smtpHost || !smtpPort || !gmailUser || !smtpPassword) {
        return NextResponse.json({ error: 'Missing required environment variables' }, { status: 500 });
    }

    // Create the transporter
    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: smtpPort === '465', // true for 465, false for other ports
        auth: {
            user: gmailUser,
            pass: smtpPassword,
        },
    });

    // Set up email data with HTML content
    const mailOptions = {
        from: `Sary Network International LTD <${gmailUser}>`,
        to: email,
        subject: subject,
        html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: Arial, sans-serif; }
                    .content { padding: 20px; }
                    .sender { font-weight: bold; margin-bottom: 10px; }
                </style>
            </head>
            <body>
                <div class="letterhead">
                    <img src="https://res.cloudinary.com/dylmsnibf/image/upload/v1741288792/06893dd3-1aa1-4b91-bcb2-7b4614bc15df.png" alt="Letterhead" style="width: 100%; max-width: 600px;">
                </div>
                <div class="content">
                    <p>${body}</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} SARY NETWORKS INTERNATIONAL LTD. All rights reserved.</p>
                </div>
            </body>
            </html>
        `,
    };

    // Send the email
    try {
        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully!");
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error sending email:", error);
        return NextResponse.json({ error: 'Error sending email' }, { status: 500 });
    }
};
