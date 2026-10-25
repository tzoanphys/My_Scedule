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

    public static Result advance(double elapsedSeconds, boolean running, long gapMillis, double targetSeconds) {
        double target = targetSeconds > 0 ? targetSeconds : TARGET_SECONDS;
        if (!running) {
            return new Result(elapsedSeconds, false, elapsedSeconds >= target, false);
        }
        if (gapMillis <= 0) {
            return new Result(elapsedSeconds, true, false, false);
        }
        if (gapMillis > MAX_GAP_MILLIS) {
            return new Result(elapsedSeconds, false, elapsedSeconds >= target, false);
        }
        double next = elapsedSeconds + (gapMillis / 1000.0);
        if (next >= target) {
            return new Result(target, false, true, false);
        }
        return new Result(next, true, false, true);
    }

    /**
     * Time that counts for a theme: the current run, never past the goal chosen
     * for that run, plus minutes already kept on the same day.
     */
    public static double credited(double elapsedSeconds, double keptSeconds, double targetSeconds) {
        double target = targetSeconds > 0 ? targetSeconds : TARGET_SECONDS;
        double elapsed = Math.min(Math.max(0, elapsedSeconds), target);
        return elapsed + Math.max(0, keptSeconds);
    }
}
