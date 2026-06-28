import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import webpush from 'web-push';


const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
const email = process.env.WEB_PUSH_EMAIL || 'mailto:admin@example.com';

let isConfigured = false;
if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(email, publicKey, privateKey);
    isConfigured = true;
    console.info('[Web Push] VAPID details configured successfully.');
  } catch (error) {
    console.error('[Web Push] Failed to configure VAPID details:', error);
  }
} else {
  console.warn('[Web Push] VAPID keys are missing in environment variables. Web push notifications are disabled.');
}

// GET: Check configuration and return public VAPID key
export async function GET() {
  return NextResponse.json({
    enabled: isConfigured,
    publicKey: isConfigured ? publicKey : null,
  });
}

// POST: Subscribe a user device and set notification preferences
export async function POST(req: NextRequest) {
  if (!isConfigured) {
    return NextResponse.json({ success: false, error: 'Web Push is not configured on this server.' }, { status: 503 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { subscription, preferences } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ success: false, error: 'Invalid subscription payload.' }, { status: 400 });
    }

    const p256dh = subscription.keys?.p256dh || '';
    const authKey = subscription.keys?.auth || '';

    // Upsert subscription tied to the user
    const savedSub = await db.pushSubscription.upsert({
      where: {
        endpoint: subscription.endpoint,
      },
      update: {
        userId,
        p256dh,
        auth: authKey,
        notifyEpisodeRelease: preferences?.notifyEpisodeRelease ?? true,
        notifyAnnouncements: preferences?.notifyAnnouncements ?? true,
        notifyReplies: preferences?.notifyReplies ?? true,
        lastSeenAt: new Date(),
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh,
        auth: authKey,
        notifyEpisodeRelease: preferences?.notifyEpisodeRelease ?? true,
        notifyAnnouncements: preferences?.notifyAnnouncements ?? true,
        notifyReplies: preferences?.notifyReplies ?? true,
      },
    });

    return NextResponse.json({ success: true, subscription: savedSub });
  } catch (error: any) {
    console.error('[Web Push] Subscription error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to save subscription.' }, { status: 500 });
  }
}

// DELETE: Unsubscribe / remove a subscription endpoint
export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();

    if (!endpoint) {
      return NextResponse.json({ success: false, error: 'Endpoint is required.' }, { status: 400 });
    }

    await db.pushSubscription.deleteMany({
      where: {
        endpoint,
      },
    });

    return NextResponse.json({ success: true, message: 'Unsubscribed successfully.' });
  } catch (error: any) {
    console.error('[Web Push] Unsubscription error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to remove subscription.' }, { status: 500 });
  }
}

// PUT: Trigger a test push notification to active subscriptions of the authenticated user
export async function PUT() {
  if (!isConfigured) {
    return NextResponse.json({ success: false, error: 'Web Push is not configured on this server.' }, { status: 503 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const subscriptions = await db.pushSubscription.findMany({
      where: {
        userId,
      },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({ success: false, error: 'No active device subscriptions found for this account.' }, { status: 404 });
    }

    const payload = {
      title: 'AnimeWorld RJ Alert',
      body: 'Your device is successfully subscribed to episode releases and updates! ðŸš€',
      icon: '/logo.png',
      url: '/settings',
    };

    let successCount = 0;
    let failedCount = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify(payload)
        );

        // Update last seen timestamp
        await db.pushSubscription.update({
          where: { id: sub.id },
          data: { lastSeenAt: new Date() },
        });
        
        successCount++;
      } catch (err: any) {
        // Dead subscription cleanup (404/410 Gone)
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.info(`[Web Push] Pruning inactive/expired subscription endpoint: ${sub.endpoint}`);
          await db.pushSubscription.delete({
            where: {
              id: sub.id,
            },
          });
        } else {
          console.error(`[Web Push] Notification dispatch failed for sub ${sub.id}:`, err);
        }
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      attempts: subscriptions.length,
      successes: successCount,
      failures: failedCount,
    });
  } catch (error: any) {
    console.error('[Web Push] Test alert error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to dispatch test notification.' }, { status: 500 });
  }
}
