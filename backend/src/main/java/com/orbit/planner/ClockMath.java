package com.orbit.planner;

/**
 * Four-hour project day. Time counts only while the app is actually running.
 * A gap longer than {@link #MAX_GAP_MILLIS} means the computer slept or was off,
 * so that stretch is not added and the countdown pauses.
 */
public final class ClockMath {
    public static final double TARGET_SECONDS = 4 * 60 * 60;
    public static final long MAX_GAP_MILLIS = 30_000;

    private ClockMath() {
    }

    public record Result(double elapsed, boolean running, boolean completed, boolean continueRun) {
    }

    public static Result advance(double elapsedSeconds, boolean running, long gapMillis) {
        if (!running) {
            return new Result(elapsedSeconds, false, elapsedSeconds >= TARGET_SECONDS, false);
        }
        if (gapMillis <= 0) {
            return new Result(elapsedSeconds, true, false, false);
        }
        if (gapMillis > MAX_GAP_MILLIS) {
            return new Result(elapsedSeconds, false, elapsedSeconds >= TARGET_SECONDS, false);
        }
        double next = elapsedSeconds + (gapMillis / 1000.0);
        if (next >= TARGET_SECONDS) {
            return new Result(TARGET_SECONDS, false, true, false);
        }
        return new Result(next, true, false, true);
    }
}
