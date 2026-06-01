import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getClientIp, getTestEmailUsage, incrementTestEmailUsage } from "@/lib/rateLimiter";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const ip = getClientIp(req);
        const usage = await getTestEmailUsage(ip);
        return NextResponse.json({ usage });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { html, to } = body;

        if (!html) {
            return NextResponse.json({ error: "HTML content is required." }, { status: 400 });
        }

        if (!to) {
            return NextResponse.json({ error: "Recipient email (to) is required." }, { status: 400 });
        }

        // Check if test email is enabled globally
        const enableTestEmail = process.env.ENABLE_TEST_EMAIL;
        if (enableTestEmail !== undefined && enableTestEmail !== "true") {
            return NextResponse.json(
                { error: "Test email sending is temporarily disabled by the administrator." },
                { status: 403 }
            );
        }

        // Apply rate limits based on IP
        const ip = getClientIp(req);
        const usage = await getTestEmailUsage(ip);
        if (usage.remaining <= 0) {
            return NextResponse.json(
                { 
                    error: `Weekly rate limit reached. You can only send ${usage.limit} test emails per week. You have already sent ${usage.used} emails.`,
                    limit: usage.limit,
                    used: usage.used,
                    remaining: usage.remaining
                },
                { status: 429 }
            );
        }

        const gmailPassword = process.env.GMAIL_APP_PASSWORD;
        if (!gmailPassword) {
            return NextResponse.json(
                { error: "GMAIL_APP_PASSWORD is not configured on the server. Please set it in your .env file." },
                { status: 500 }
            );
        }

        const sender = process.env.TEST_EMAIL_SENDER;
        if (!sender) {
            return NextResponse.json(
                { error: "TEST_EMAIL_SENDER is not configured on the server. Please set it in your .env file." },
                { status: 500 }
            );
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: sender,
                pass: gmailPassword,
            },
        });

        // Parse HTML to extract base64 images and attach them as inline attachments (CIDs)
        const attachments: any[] = [];
        let cidIndex = 0;
        
        // Match all src="data:image/ext;base64,..." or similar
        const base64Regex = /src=["']data:image\/([a-zA-Z+.-]+);base64,([^"']+)["']/gi;
        const processedHtml = html.replace(base64Regex, (match: string, ext: string, content: string) => {
            const cid = `image_attachment_${cidIndex++}`;
            attachments.push({
                content: Buffer.from(content, 'base64'),
                cid: cid,
                contentType: `image/${ext === "svg+xml" ? "png" : ext}`,
                contentDisposition: "inline"
            });
            return `src="cid:${cid}"`;
        });

        const mailOptions = {
            from: `"Email Builder Test" <${sender}>`,
            to: to,
            subject: "Test Email Draft - Email Builder",
            html: processedHtml,
            attachments: attachments,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("[Test Mail API] Email sent successfully:", info.messageId, `with ${attachments.length} attachments.`);

        // Increment weekly usage upon successful delivery
        await incrementTestEmailUsage(ip);

        // Fetch updated usage for client state updating if needed
        const updatedUsage = await getTestEmailUsage(ip);

        return NextResponse.json({ 
            success: true, 
            messageId: info.messageId,
            usage: updatedUsage
        });
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error("[Test Mail API] Failed to send email:", errMsg);
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}
