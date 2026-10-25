package com.orbit.planner.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import org.hibernate.annotations.DynamicUpdate;

import com.orbit.planner.ClockMath;

@Entity
@DynamicUpdate
@Table(name = "orbit_member_day", uniqueConstraints = @UniqueConstraint(name = "uk_member_day", columnNames = {"user_id", "week_number", "day_index"}))
public class DayEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "week_number", nullable = false)
    private int weekNumber;

    @Column(name = "day_index", nullable = false)
    private int dayIndex;

    @Column(length = 4000)
    private String theme = "";

    @Column(length = 8000)
    private String notes = "";

    private double elapsedSeconds;

    @Column(name = "kept_seconds", nullable = false)
    private double keptSeconds;

    @Column(name = "target_seconds", nullable = false)
    private double targetSeconds = ClockMath.TARGET_SECONDS;

    private boolean running;
    private Instant runningSince;
    private boolean completed;

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public int getWeekNumber() {
        return weekNumber;
    }

    public void setWeekNumber(int weekNumber) {
        this.weekNumber = weekNumber;
    }

    public int getDayIndex() {
        return dayIndex;
    }

    public void setDayIndex(int dayIndex) {
        this.dayIndex = dayIndex;
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

    public double getElapsedSeconds() {
        return elapsedSeconds;
    }

    public void setElapsedSeconds(double elapsedSeconds) {
        this.elapsedSeconds = elapsedSeconds;
    }

    public double getKeptSeconds() {
        return keptSeconds;
    }

    public void setKeptSeconds(double keptSeconds) {
        this.keptSeconds = Math.max(0, keptSeconds);
    }

    public double getTargetSeconds() {
        return targetSeconds > 0 ? targetSeconds : ClockMath.TARGET_SECONDS;
    }

    public void setTargetSeconds(double targetSeconds) {
        this.targetSeconds = targetSeconds;
    }

    public boolean isRunning() {
        return running;
    }

    public void setRunning(boolean running) {
        this.running = running;
    }

    public Instant getRunningSince() {
        return runningSince;
    }

    public void setRunningSince(Instant runningSince) {
        this.runningSince = runningSince;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }
}
