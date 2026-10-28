package com.themazzy.cookingapp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;

/**
 * Rings a finished cooking timer as a notification, and stops it from the notification's Stop button.
 * Also shows the countdown of a running timer, which the ringing notification replaces (same id).
 */
public class TimerAlarmReceiver extends BroadcastReceiver {

    static final String FIRE = "com.themazzy.cookingapp.TIMER_FIRE";
    static final String STOP = "com.themazzy.cookingapp.TIMER_STOP";
    static final String ACT = "com.themazzy.cookingapp.TIMER_ACT";
    private static final String RUNNING = "timer_running";
    private static final long[] BUZZ = { 0, 500, 300, 500, 300, 500 };

    @Override
    public void onReceive(Context context, Intent intent) {
        int id = intent.getIntExtra("id", 0);
        if (STOP.equals(intent.getAction())) {
            dismiss(context, id);
            return;
        }
        if (ACT.equals(intent.getAction())) {
            TimerAlarmPlugin.fromNotification(id, intent.getStringExtra("do"));
            return;
        }
        if (!FIRE.equals(intent.getAction())) return;

        String sound = intent.getStringExtra("sound");
        boolean vibrate = intent.getBooleanExtra("vibrate", true);
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        String channel = channel(context, manager, sound == null ? "beep" : sound, vibrate);

        PendingIntent open = PendingIntent.getActivity(
            context,
            id,
            new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        PendingIntent stop = PendingIntent.getBroadcast(
            context,
            id,
            new Intent(context, TimerAlarmReceiver.class).setAction(STOP).putExtra("id", id),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Notification notification = new Notification.Builder(context, channel)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(intent.getStringExtra("title"))
            .setContentText(intent.getStringExtra("text"))
            .setCategory(Notification.CATEGORY_ALARM)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setContentIntent(open)
            .setDeleteIntent(stop)
            .setAutoCancel(true)
            .addAction(new Notification.Action.Builder(null, "Stop", stop).build())
            .build();
        // Keeps playing the sound (and buzzing) until the notification is stopped or swiped away
        notification.flags |= Notification.FLAG_INSISTENT;
        manager.notify(id, notification);
    }

    /**
     * The ongoing notification of a running timer, counting down to `endsAt` (ms), or of a
     * paused one with `left` ms to go. Its buttons are heard by cooking mode.
     */
    static void countdown(Context context, int id, String label, String text, long endsAt, long left) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager.getNotificationChannel(RUNNING) == null) {
            NotificationChannel channel = new NotificationChannel(RUNNING, "Running cooking timers", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Counts down cooking timers while they run");
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.setSound(null, null);
            channel.enableVibration(false);
            manager.createNotificationChannel(channel);
        }
        boolean paused = endsAt <= 0;
        PendingIntent open = PendingIntent.getActivity(
            context,
            id,
            new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Notification.Builder builder = new Notification.Builder(context, RUNNING)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(label)
            .setCategory(Notification.CATEGORY_STOPWATCH)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setContentIntent(open)
            .setOnlyAlertOnce(true)
            .setLocalOnly(true);
        if (paused) {
            long seconds = Math.max(0, Math.round(left / 1000.0));
            String clock = seconds >= 3600
                ? String.format(java.util.Locale.ROOT, "%d:%02d:%02d", seconds / 3600, (seconds % 3600) / 60, seconds % 60)
                : String.format(java.util.Locale.ROOT, "%d:%02d", seconds / 60, seconds % 60);
            builder
                .setContentText("Paused, " + clock + " left" + (text.isEmpty() ? "" : " · " + text))
                .setShowWhen(false)
                .setOngoing(false)
                .addAction(action(context, id, "resume", "Resume"));
        } else {
            builder
                .setContentText(text)
                .setWhen(endsAt)
                .setShowWhen(true)
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .setOngoing(true)
                .addAction(action(context, id, "pause", "Pause"))
                .addAction(action(context, id, "more", "+1 min"));
        }
        manager.notify(id, builder.build());
    }

    private static Notification.Action action(Context context, int id, String what, String title) {
        // Each button of each timer needs its own request code, or Android merges them
        int code = id * 4 + ("pause".equals(what) ? 1 : "more".equals(what) ? 2 : 3);
        PendingIntent pending = PendingIntent.getBroadcast(
            context,
            code,
            new Intent(context, TimerAlarmReceiver.class).setAction(ACT).putExtra("id", id).putExtra("do", what),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        return new Notification.Action.Builder(null, title, pending).build();
    }

    static void dismiss(Context context, int id) {
        ((NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(id);
    }

    /** A channel for each sound and vibration choice, since Android fixes them when a channel is made. */
    private static String channel(Context context, NotificationManager manager, String sound, boolean vibrate) {
        String id = "timer_" + sound + (vibrate ? "_buzz" : "");
        if (manager.getNotificationChannel(id) != null) return id;
        NotificationChannel channel = new NotificationChannel(id, "Cooking timers (" + sound + (vibrate ? ", vibrate" : "") + ")", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Rings when a cooking timer is done");
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        channel.setBypassDnd(true);
        int raw = context.getResources().getIdentifier("alarm_" + sound, "raw", context.getPackageName());
        if (raw != 0) {
            Uri uri = Uri.parse("android.resource://" + context.getPackageName() + "/" + raw);
            // Played on the alarm volume, so it rings even when the phone is on silent
            channel.setSound(uri, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        } else {
            channel.setSound(null, null);
        }
        channel.enableVibration(vibrate);
        channel.setVibrationPattern(vibrate ? BUZZ : null);
        manager.createNotificationChannel(channel);
        return id;
    }
}
