package com.themazzy.cookingapp;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Cooking timers that ring with the phone locked or another app open. Android
 * wakes the app at the exact time (an alarm clock alarm, which also works in
 * battery saving) and TimerAlarmReceiver shows a notification that keeps
 * ringing until it is stopped.
 */
@CapacitorPlugin(name = "TimerAlarm", permissions = { @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications") })
public class TimerAlarmPlugin extends Plugin {

    @PluginMethod
    public void schedule(PluginCall call) {
        Integer id = call.getInt("id");
        Long at = call.getLong("at");
        if (id == null || at == null) {
            call.reject("id and at are needed");
            return;
        }
        Context context = getContext();
        Intent fire = new Intent(context, TimerAlarmReceiver.class)
            .setAction(TimerAlarmReceiver.FIRE)
            .putExtra("id", id)
            .putExtra("title", call.getString("title", "Timer done"))
            .putExtra("text", call.getString("text", ""))
            .putExtra("sound", call.getString("sound", "beep"))
            .putExtra("vibrate", call.getBoolean("vibrate", true));
        // A new time for the same timer replaces the old one, and stops it if it rings
        TimerAlarmReceiver.dismiss(context, id);
        PendingIntent pending = PendingIntent.getBroadcast(context, id, fire, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms()) {
            PendingIntent show = PendingIntent.getActivity(context, 0, new Intent(context, MainActivity.class), PendingIntent.FLAG_IMMUTABLE);
            alarms.setAlarmClock(new AlarmManager.AlarmClockInfo(at, show), pending);
        } else {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
        }
        call.resolve();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        Integer id = call.getInt("id");
        if (id == null) {
            call.reject("id is needed");
            return;
        }
        Context context = getContext();
        PendingIntent pending = PendingIntent.getBroadcast(
            context,
            id,
            new Intent(context, TimerAlarmReceiver.class).setAction(TimerAlarmReceiver.FIRE),
            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
        );
        if (pending != null) {
            ((AlarmManager) context.getSystemService(Context.ALARM_SERVICE)).cancel(pending);
            pending.cancel();
        }
        TimerAlarmReceiver.dismiss(context, id);
        call.resolve();
    }

    @Override
    @PluginMethod
    public void requestPermissions(PluginCall call) {
        // Before Android 13 notifications need no permission
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getPermissionState("notifications") == PermissionState.GRANTED) {
            resolvePermission(call);
            return;
        }
        requestPermissionForAlias("notifications", call, "permissionAnswered");
    }

    @PermissionCallback
    private void permissionAnswered(PluginCall call) {
        resolvePermission(call);
    }

    private void resolvePermission(PluginCall call) {
        NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        JSObject result = new JSObject();
        result.put("notifications", manager.areNotificationsEnabled() ? "granted" : "denied");
        call.resolve(result);
    }
}
