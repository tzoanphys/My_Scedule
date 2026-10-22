package com.orbit.planner;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ClockMathTest {

    @Test
    void shortGapCountsTowardFourHours() {
        ClockMath.Result result = ClockMath.advance(10, true, 5_500, ClockMath.TARGET_SECONDS);
        assertEquals(15.5, result.elapsed(), 0.001);
        assertTrue(result.running());
        assertTrue(result.continueRun());
        assertFalse(result.completed());
    }

    @Test
    void timeWhileTheComputerIsOffDoesNotCount() {
        long eightHours = 8L * 60 * 60 * 1000;
        ClockMath.Result result = ClockMath.advance(100, true, eightHours, ClockMath.TARGET_SECONDS);
        assertEquals(100, result.elapsed(), 0.001);
        assertFalse(result.running());
        assertFalse(result.completed());
    }

    @Test
    void reachingFourHoursCompletesTheDay() {
        ClockMath.Result result = ClockMath.advance(14_395, true, 5_000, ClockMath.TARGET_SECONDS);
        assertEquals(ClockMath.TARGET_SECONDS, result.elapsed(), 0.001);
        assertTrue(result.completed());
        assertFalse(result.running());
    }

    @Test
    void gapAtTheLimitStillCounts() {
        ClockMath.Result result = ClockMath.advance(0, true, ClockMath.MAX_GAP_MILLIS, ClockMath.TARGET_SECONDS);
        assertEquals(30, result.elapsed(), 0.001);
        assertTrue(result.running());
    }

    @Test
    void oneMillisecondPastTheLimitPauses() {
        ClockMath.Result result = ClockMath.advance(50, true, ClockMath.MAX_GAP_MILLIS + 1, ClockMath.TARGET_SECONDS);
        assertEquals(50, result.elapsed(), 0.001);
        assertFalse(result.running());
        assertFalse(result.completed());
    }

    @Test
    void aShorterGoalCompletesAtThatGoal() {
        double threeHours = 3 * 60 * 60;
        ClockMath.Result result = ClockMath.advance(threeHours - 5, true, 5_000, threeHours);
        assertEquals(threeHours, result.elapsed(), 0.001);
        assertTrue(result.completed());
        assertFalse(result.running());
    }

    @Test
    void halfOfALongerGoalStaysOpen() {
        double sixHours = 6 * 60 * 60;
        ClockMath.Result result = ClockMath.advance(3 * 60 * 60, true, 1_000, sixHours);
        assertEquals(3 * 60 * 60 + 1, result.elapsed(), 0.001);
        assertFalse(result.completed());
        assertTrue(result.running());
    }
}
