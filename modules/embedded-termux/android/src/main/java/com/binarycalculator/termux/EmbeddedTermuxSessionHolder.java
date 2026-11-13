package com.binarycalculator.termux;

import com.termux.terminal.TerminalSession;
import java.nio.charset.StandardCharsets;

final class EmbeddedTermuxSessionHolder {
    private static volatile TerminalSession activeSession;

    private EmbeddedTermuxSessionHolder() {}

    static void set(TerminalSession session) {
        activeSession = session;
    }

    static void clear(TerminalSession session) {
        if (activeSession == session) activeSession = null;
    }

    static void sendText(String text) {
        TerminalSession session = activeSession;
        if (session == null) throw new IllegalStateException("No active Termux terminal session.");
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
        session.write(bytes, 0, bytes.length);
    }
}
