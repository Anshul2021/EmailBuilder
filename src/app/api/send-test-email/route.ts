import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { html } = body;

        if (!html) {
            return NextResponse.json({ error: "HTML content is required." }, { status: 400 });
        }

        const gmailPassword = process.env.GMAIL_APP_PASSWORD;
        if (!gmailPassword) {
            return NextResponse.json(
                { error: "GMAIL_APP_PASSWORD is not configured on the server. Please set it in your .env file." },
                { status: 500 }
            );
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "amazingfacts113@gmail.com",
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
            from: '"Email Builder Test" <amazingfacts113@gmail.com>',
            to: "organdy69@gmail.com",
            subject: "Test Email Draft - Email Builder",
            html: processedHtml,
            attachments: attachments,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("[Test Mail API] Email sent successfully:", info.messageId, `with ${attachments.length} attachments.`);

        return NextResponse.json({ success: true, messageId: info.messageId });
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error("[Test Mail API] Failed to send email:", errMsg);
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}
