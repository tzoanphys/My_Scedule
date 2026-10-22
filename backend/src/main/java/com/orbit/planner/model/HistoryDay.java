package com.orbit.planner.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;

@Entity
@Table(name = "orbit_history_day", uniqueConstraints = @UniqueConstraint(name = "uk_history_day", columnNames = {"history_week_id", "day_index"}))
public class HistoryDay {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "history_week_id", nullable = false)
    private Long historyWeekId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "day_index", nullable = false)
    private int dayIndex;

    @Column(name = "day_name", nullable = false, length = 20)
    private String dayName = "";

    @Column(name = "day_date")
    private LocalDate date;

    @Column(length = 4000)
    private String theme = "";

    @Column(length = 8000)
    private String notes = "";

    private boolean completed;

    @Column(name = "elapsed_seconds", nullable = false)
    private double elapsedSeconds;

    @Column(name = "details_snapshot", columnDefinition = "text")
    private String detailsSnapshot = "";

    public Long getId() {
        return id;
    }

    public Long getHistoryWeekId() {
        return historyWeekId;
    }

    public void setHistoryWeekId(Long historyWeekId) {
        this.historyWeekId = historyWeekId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public int getDayIndex() {
        return dayIndex;
    }

    public void setDayIndex(int dayIndex) {
        this.dayIndex = dayIndex;
    }

    public String getDayName() {
        return dayName;
    }

    public void setDayName(String dayName) {
        this.dayName = dayName;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getTheme() {
        return theme;
    }

    public void setTheme(String theme) {
        this.theme = theme;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }

    public double getElapsedSeconds() {
        return elapsedSeconds;
    }

    public void setElapsedSeconds(double elapsedSeconds) {
        this.elapsedSeconds = elapsedSeconds;
    }

    public String getDetailsSnapshot() {
        return detailsSnapshot;
    }

    public void setDetailsSnapshot(String detailsSnapshot) {
        this.detailsSnapshot = detailsSnapshot;
    }
}
