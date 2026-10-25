package com.orbit.planner.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "orbit_theme_plan", uniqueConstraints = @UniqueConstraint(name = "uk_theme_plan", columnNames = {"user_id", "theme_key"}))
public class ThemePlan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "theme_key", nullable = false, length = 500)
    private String themeKey;

    @Column(name = "theme_label", nullable = false, length = 500)
    private String themeLabel;

    @Column(name = "plan_text", columnDefinition = "text")
    private String planText = "";

    @Column(name = "logged_seconds", nullable = false)
    private double loggedSeconds;

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getThemeKey() {
        return themeKey;
    }

    public void setThemeKey(String themeKey) {
        this.themeKey = themeKey;
    }

    public String getThemeLabel() {
        return themeLabel;
    }

    public void setThemeLabel(String themeLabel) {
        this.themeLabel = themeLabel;
    }

    public String getPlanText() {
        return planText;
    }

    public void setPlanText(String planText) {
        this.planText = planText;
    }

    public double getLoggedSeconds() {
        return loggedSeconds;
    }

    public void setLoggedSeconds(double loggedSeconds) {
        this.loggedSeconds = Math.max(0, loggedSeconds);
    }
}
