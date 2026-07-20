import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';

// GET /api/webhooks/whatsapp — Webhook verification (Meta requires this)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// POST /api/webhooks/whatsapp — Incoming messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract message from Meta's webhook payload
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.[0]) {
      // Not a message event (could be status update) — acknowledge
      return NextResponse.json({ status: 'ok' });
    }

    const message = value.messages[0];
    const contact = value.contacts?.[0];

    // Send to Inngest for async processing
    await inngest.send({
      name: 'whatsapp/message.received',
      data: {
        from: message.from, // Phone number
        messageId: message.id,
        type: message.type, // text, interactive, image, etc.
        text: message.text?.body || '',
        interactive: message.interactive || null,
        contactName: contact?.profile?.name || '',
        timestamp: message.timestamp,
      },
    });

    // Always respond 200 quickly to Meta (they retry if not)
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json({ status: 'ok' }); // Still 200 to prevent retries
  }
}
