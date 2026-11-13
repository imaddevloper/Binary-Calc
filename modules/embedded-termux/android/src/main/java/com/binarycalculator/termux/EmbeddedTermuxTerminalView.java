package com.binarycalculator.termux;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.graphics.Typeface;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Process;
import android.os.UserHandle;
import android.os.Vibrator;
import android.util.Log;
import android.view.KeyEvent;
import android.view.MotionEvent;

import com.termux.terminal.TerminalSession;
import com.termux.terminal.TerminalSessionClient;
import com.termux.view.TerminalView;
import com.termux.view.TerminalViewClient;

import java.io.File;
import java.nio.charset.StandardCharsets;

final class EmbeddedTermuxTerminalView extends TerminalView implements TerminalSessionClient, TerminalViewClient {
    private static final String TAG = "BinaryCalcTermux";
    private TerminalSession session;
    private boolean sessionStartRequested;
    private int fontSize = 14;

    EmbeddedTermuxTerminalView(Context context) {
        super(context, null);
        setFocusable(true);
        setFocusableInTouchMode(true);
        setTextSize(Math.round(fontSize * getResources().getDisplayMetrics().scaledDensity));
        setTypeface(Typeface.MONOSPACE);
        setTerminalViewClient(this);
        setBackgroundColor(0xFF0B0B0F);
        addOnLayoutChangeListener((view, left, top, right, bottom, oldLeft, oldTop, oldRight, oldBottom) -> {
            if (right > left && bottom > top) startSessionIfReady();
        });
    }

    void setFontSize(int size) {
        fontSize = Math.max(10, Math.min(24, size));
        setTextSize(Math.round(fontSize * getResources().getDisplayMetrics().scaledDensity));
    }

    void startSessionIfReady() {
        if (session != null || sessionStartRequested || getWidth() <= 0 || getHeight() <= 0) return;
        sessionStartRequested = true;
        if (!TermuxBootstrapInstaller.isInstalled(getContext())) {
            sessionStartRequested = false;
            Log.w(TAG, "Termux bootstrap is not installed yet.");
            return;
        }

        try {
            File files = TermuxBootstrapInstaller.getFilesRoot(getContext());
            File prefix = TermuxBootstrapInstaller.getPrefix(getContext());
            File home = new File(files, "home");
            File bash = new File(prefix, "bin/bash");
            String architecture = TermuxBootstrapInstaller.getSupportedArchitecture();
            String uid = String.valueOf(Process.myUid());
            String userId = String.valueOf(UserHandle.myUserId());
            String termuxExec = new File(prefix, "lib/libtermux-exec.so").getAbsolutePath();
            String[] env = new String[] {
                "HOME=" + home.getAbsolutePath(),
                "PREFIX=" + prefix.getAbsolutePath(),
                "PATH=" + new File(prefix, "bin").getAbsolutePath(),
                "TMPDIR=" + new File(prefix, "tmp").getAbsolutePath(),
                "LD_PRELOAD=" + termuxExec,
                "LANG=en_US.UTF-8",
                "TERM=xterm-256color",
                "COLORTERM=truecolor",
                "TERMUX_VERSION=0.118.0",
                "TERMUX_PACKAGE_MANAGER=apt",
                "TERMUX_PACKAGE_ARCH=" + architecture,
                "TERMUX_APP__PACKAGE_NAME=" + getContext().getPackageName(),
                "TERMUX_APP__VERSION_NAME=1.0.0",
                "TERMUX_APP__VERSION_CODE=1",
                "TERMUX_APP__UID=" + uid,
                "TERMUX_APP__USER_ID=" + userId,
                "TERMUX_APP__TARGET_SDK=" + getContext().getApplicationInfo().targetSdkVersion,
                "TERMUX_APP__PACKAGE_MANAGER=apt",
                "TERMUX_APP__PACKAGE_VARIANT=apt-android-7",
                "TERMUX_APP__FILES_DIR=" + files.getAbsolutePath(),
                "TERMUX__UID=" + uid,
                "TERMUX__USER_ID=" + userId,
                "TERMUX__ROOTFS=" + files.getAbsolutePath(),
                "TERMUX__HOME=" + home.getAbsolutePath(),
                "TERMUX__PREFIX=" + prefix.getAbsolutePath()
            };
            session = new TerminalSession(
                bash.getAbsolutePath(),
                home.getAbsolutePath(),
                new String[] { "bash", "-l" },
                env,
                2000,
                this
            );
            attachSession(session);
            requestFocus();
        } catch (Exception error) {
            sessionStartRequested = false;
            Log.e(TAG, "Could not start embedded Termux session.", error);
        }
    }

    void closeSession() {
        if (session != null) {
            session.finishIfRunning();
        }
        session = null;
        sessionStartRequested = false;
    }

    @Override
    protected void onDetachedFromWindow() {
        // A tab screen remains mounted during normal navigation. If Android destroys the
        // native view, stop the PTY instead of leaving an orphan shell process.
        super.onDetachedFromWindow();
    }

    @Override public void onTextChanged(TerminalSession changedSession) { post(this::onScreenUpdated); }
    @Override public void onTitleChanged(TerminalSession changedSession) { post(this::onScreenUpdated); }
    @Override public void onSessionFinished(TerminalSession finishedSession) {
        if (session == finishedSession) {
            session = null;
            sessionStartRequested = false;
            post(this::invalidate);
        }
    }

    @Override public void onCopyTextToClipboard(TerminalSession source, String text) {
        ClipboardManager clipboard = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard != null) clipboard.setPrimaryClip(ClipData.newPlainText("Terminal", text));
    }

    @Override public void onPasteTextFromClipboard(TerminalSession target) {
        ClipboardManager clipboard = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
        if (target == null || clipboard == null || !clipboard.hasPrimaryClip()) return;
        ClipData clip = clipboard.getPrimaryClip();
        if (clip == null || clip.getItemCount() == 0) return;
        CharSequence value = clip.getItemAt(0).coerceToText(getContext());
        if (value != null) {
            byte[] bytes = value.toString().getBytes(StandardCharsets.UTF_8);
            target.write(bytes, 0, bytes.length);
        }
    }

    @Override public void onBell(TerminalSession source) {
        Vibrator vibrator = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null && vibrator.hasVibrator()) {
            if (Build.VERSION.SDK_INT >= 26) vibrator.vibrate(VibrationEffect.createOneShot(35, VibrationEffect.DEFAULT_AMPLITUDE));
            else vibrator.vibrate(35);
        }
    }
    @Override public void onColorsChanged(TerminalSession source) { post(this::invalidate); }
    @Override public void onTerminalCursorStateChange(boolean state) { post(this::invalidate); }
    @Override public void setTerminalShellPid(TerminalSession source, int pid) {}
    @Override public Integer getTerminalCursorStyle() { return null; }

    @Override public void logError(String tag, String message) { Log.e(TAG, tag + ": " + message); }
    @Override public void logWarn(String tag, String message) { Log.w(TAG, tag + ": " + message); }
    @Override public void logInfo(String tag, String message) { Log.i(TAG, tag + ": " + message); }
    @Override public void logDebug(String tag, String message) { Log.d(TAG, tag + ": " + message); }
    @Override public void logVerbose(String tag, String message) { Log.v(TAG, tag + ": " + message); }
    @Override public void logStackTraceWithMessage(String tag, String message, Exception error) { Log.e(TAG, tag + ": " + message, error); }
    @Override public void logStackTrace(String tag, Exception error) { Log.e(TAG, tag, error); }

    @Override public float onScale(float scale) { return scale; }
    @Override public void onSingleTapUp(MotionEvent event) { requestFocus(); }
    @Override public boolean shouldBackButtonBeMappedToEscape() { return false; }
    @Override public boolean shouldEnforceCharBasedInput() { return true; }
    @Override public boolean shouldUseCtrlSpaceWorkaround() { return false; }
    @Override public boolean isTerminalViewSelected() { return true; }
    @Override public void copyModeChanged(boolean copyMode) {}
    @Override public boolean onKeyDown(int keyCode, KeyEvent event, TerminalSession currentSession) { return false; }
    @Override public boolean onKeyUp(int keyCode, KeyEvent event) { return false; }
    @Override public boolean onLongPress(MotionEvent event) { return false; }
    @Override public boolean readControlKey() { return false; }
    @Override public boolean readAltKey() { return false; }
    @Override public boolean readShiftKey() { return false; }
    @Override public boolean readFnKey() { return false; }
    @Override public boolean onCodePoint(int codePoint, boolean ctrlDown, TerminalSession currentSession) { return false; }
    @Override public void onEmulatorSet() {}
}
