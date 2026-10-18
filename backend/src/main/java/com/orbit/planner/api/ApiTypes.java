package com.orbit.planner.api;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class ApiTypes {
    private ApiTypes() {
    }

    public record WeekUpdate(LocalDate startDate, LocalDate endDate, String program) {
    }

    public record DayUpdate(String theme, String notes) {
    }

    public record DetailCreate(String text) {
    }

    public record DetailUpdate(String text, Boolean done) {
    }

    public record ElapsedRequest(Double elapsedSeconds) {
    }

    public record AuthRequest(String username, String password) {
    }

    public record DetailView(long id, String text, boolean done, int sortOrder) {
    }

    public record DayView(
            int weekNumber,
            int dayIndex,
            String dayName,
            LocalDate date,
            String weekProgram,
            String theme,
            String notes,
            double targetSeconds,
            double elapsedSeconds,
            boolean running,
            Instant runningSince,
            boolean completed,
            Instant serverNow,
            List<DetailView> details
    ) {
    }

    public record BoardDay(
            int weekNumber,
            int dayIndex,
            String dayName,
            LocalDate date,
            String theme,
            double targetSeconds,
            double elapsedSeconds,
            boolean running,
            Instant runningSince,
            boolean completed,
            int detailCount
    ) {
    }

    public record WeekView(
            int number,
            LocalDate startDate,
            LocalDate endDate,
            String program,
            List<BoardDay> days
    ) {
    }

    public record BoardView(Instant serverNow, List<WeekView> weeks) {
    }

    public record AchievementView(
            int weekNumber,
            int dayIndex,
            String dayName,
            LocalDate date,
            String theme,
            Instant finishedAt
    ) {
    }

    public record HistoryDetailView(String text, boolean done) {
    }

    public record HistoryDayView(
            int dayIndex,
            String dayName,
            LocalDate date,
            String theme,
            String notes,
            boolean completed,
            List<HistoryDetailView> details
    ) {
    }

    public record HistoryWeekView(
            int weekNumber,
            LocalDate startDate,
            LocalDate endDate,
            String program,
            List<HistoryDayView> days
    ) {
    }
}
