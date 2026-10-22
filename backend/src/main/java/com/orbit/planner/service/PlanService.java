package com.orbit.planner.service;

import com.orbit.planner.api.ApiTypes.PlanCheckpointView;
import com.orbit.planner.api.ApiTypes.PlanThemeView;
import com.orbit.planner.model.DayEntry;
import com.orbit.planner.model.HistoryDay;
import com.orbit.planner.model.HistoryWeek;
import com.orbit.planner.model.PlanCheckpoint;
import com.orbit.planner.model.PlannerUser;
import com.orbit.planner.model.ThemePlan;
import com.orbit.planner.model.WeekEntry;
import com.orbit.planner.repo.DayRepository;
import com.orbit.planner.repo.HistoryDayRepository;
import com.orbit.planner.repo.HistoryWeekRepository;
import com.orbit.planner.repo.PlanCheckpointRepository;
import com.orbit.planner.repo.ThemePlanRepository;
import com.orbit.planner.repo.WeekRepository;
import com.orbit.planner.web.CurrentAccount;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class PlanService {
    private static final String[] NAMES = {
            "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
    };

    private static final double ARCHIVED_DAY_SECONDS = 4 * 60 * 60;

    private final ThemePlanRepository plans;
    private final PlanCheckpointRepository checkpoints;
    private final DayRepository days;
    private final HistoryDayRepository historyDays;
    private final HistoryWeekRepository historyWeeks;
    private final WeekRepository weeks;
    private final CurrentAccount accounts;

    public PlanService(ThemePlanRepository plans, PlanCheckpointRepository checkpoints, DayRepository days,
                       HistoryDayRepository historyDays, HistoryWeekRepository historyWeeks, WeekRepository weeks,
                       CurrentAccount accounts) {
        this.plans = plans;
        this.checkpoints = checkpoints;
        this.days = days;
        this.historyDays = historyDays;
        this.historyWeeks = historyWeeks;
        this.weeks = weeks;
        this.accounts = accounts;
    }

    public List<PlanThemeView> list() {
        PlannerUser user = accounts.require();
        return views(user.getId());
    }

    public PlanThemeView addTheme(String theme) {
        PlannerUser user = accounts.require();
        String label = label(theme);
        String key = key(label);
        ThemePlan plan = plans.findByUserIdAndThemeKey(user.getId(), key).orElseGet(() -> {
            ThemePlan created = new ThemePlan();
            created.setUserId(user.getId());
            created.setThemeKey(key);
            created.setThemeLabel(label);
            created.setPlanText("");
            return plans.save(created);
        });
        return view(user.getId(), plan);
    }

    public PlanThemeView save(String theme, String planText) {
        PlannerUser user = accounts.require();
        String label = label(theme);
        ThemePlan plan = ensure(user.getId(), label);
        plan.setPlanText(limit(planText, 8000));
        plans.save(plan);
        return view(user.getId(), plan);
    }

    public PlanThemeView addCheckpoint(String theme, String text, String date) {
        PlannerUser user = accounts.require();
        String written = clean(text);
        if (written.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Write an aim first.");
        }
        if (written.length() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That aim is too long.");
        }
        ThemePlan plan = ensure(user.getId(), label(theme));
        PlanCheckpoint checkpoint = new PlanCheckpoint();
        checkpoint.setPlanId(plan.getId());
        checkpoint.setUserId(user.getId());
        checkpoint.setText(written);
        checkpoint.setDone(false);
        checkpoint.setAimOn(aimDate(date));
        checkpoint.setSortOrder(checkpoints.maxSortOrder(plan.getId(), user.getId()) + 1);
        checkpoints.save(checkpoint);
        return view(user.getId(), plan);
    }

    public PlanThemeView updateCheckpoint(long id, String text, Boolean done, String date) {
        PlannerUser user = accounts.require();
        PlanCheckpoint checkpoint = checkpoints.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "That aim is gone."));
        if (text != null) {
            String written = clean(text);
            if (written.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "An aim needs a few words.");
            }
            if (written.length() > 500) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That aim is too long.");
            }
            checkpoint.setText(written);
        }
        if (done != null) {
            checkpoint.setDone(done);
        }
        checkpoint.setAimOn(aimDate(date));
        checkpoints.save(checkpoint);
        ThemePlan plan = plans.findByIdAndUserId(checkpoint.getPlanId(), user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "That plan is gone."));
        return view(user.getId(), plan);
    }

    public PlanThemeView deleteCheckpoint(long id) {
        PlannerUser user = accounts.require();
        PlanCheckpoint checkpoint = checkpoints.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "That checkpoint is gone."));
        ThemePlan plan = plans.findByIdAndUserId(checkpoint.getPlanId(), user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "That plan is gone."));
        checkpoints.delete(checkpoint);
        return view(user.getId(), plan);
    }

    private ThemePlan ensure(Long userId, String label) {
        String key = key(label);
        if (!known(userId).containsKey(key) && plans.findByUserIdAndThemeKey(userId, key).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "That theme is not in your diary.");
        }
        return plans.findByUserIdAndThemeKey(userId, key).orElseGet(() -> {
            ThemePlan created = new ThemePlan();
            created.setUserId(userId);
            created.setThemeKey(key);
            created.setThemeLabel(label);
            created.setPlanText("");
            return plans.save(created);
        });
    }

    private List<PlanThemeView> views(Long userId) {
        Map<String, String> names = known(userId);
        Map<String, List<String>> where = places(userId);
        Map<String, Double> studied = studied(userId);
        for (ThemePlan plan : plans.findByUserId(userId)) {
            names.putIfAbsent(plan.getThemeKey(), plan.getThemeLabel());
        }
        List<String> keys = new ArrayList<>(names.keySet());
        keys.sort(Comparator.comparing(key -> names.get(key), String.CASE_INSENSITIVE_ORDER));
        List<PlanThemeView> result = new ArrayList<>();
        for (String key : keys) {
            ThemePlan plan = plans.findByUserIdAndThemeKey(userId, key).orElse(null);
            result.add(view(userId, names.get(key), plan, where, studied));
        }
        return result;
    }

    private PlanThemeView view(Long userId, ThemePlan plan) {
        return view(userId, plan.getThemeLabel(), plan, places(userId), studied(userId));
    }

    private PlanThemeView view(Long userId, String label, ThemePlan plan, Map<String, List<String>> where, Map<String, Double> studied) {
        List<PlanCheckpointView> items = new ArrayList<>();
        if (plan != null && plan.getId() != null) {
            for (PlanCheckpoint checkpoint : checkpoints.findByPlanIdAndUserIdOrderBySortOrderAscIdAsc(plan.getId(), userId)) {
                items.add(new PlanCheckpointView(
                        checkpoint.getId(),
                        checkpoint.getText(),
                        checkpoint.isDone(),
                        checkpoint.getSortOrder(),
                        checkpoint.getAimOn()));
            }
            items.sort(Comparator
                    .comparing((PlanCheckpointView item) -> item.date() == null)
                    .thenComparing(PlanCheckpointView::date, Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparingInt(PlanCheckpointView::sortOrder)
                    .thenComparingLong(PlanCheckpointView::id));
        }
        int done = 0;
        for (PlanCheckpointView item : items) {
            if (item.done()) {
                done++;
            }
        }
        String text = plan == null || plan.getPlanText() == null ? "" : plan.getPlanText();
        double seconds = studied.getOrDefault(key(label), 0.0);
        return new PlanThemeView(label, text, done, items.size() - done, seconds, where.getOrDefault(key(label), List.of()), items);
    }

    private Map<String, String> known(Long userId) {
        Map<String, String> names = new LinkedHashMap<>();
        for (DayEntry day : days.findByUserIdOrderByWeekNumberAscDayIndexAsc(userId)) {
            remember(names, day.getTheme());
        }
        for (HistoryDay day : historyDays.findByUserId(userId)) {
            remember(names, day.getTheme());
        }
        return names;
    }

    private Map<String, Double> studied(Long userId) {
        Map<String, Double> totals = new LinkedHashMap<>();
        for (DayEntry day : days.findByUserIdOrderByWeekNumberAscDayIndexAsc(userId)) {
            addStudied(totals, day.getTheme(), day.getElapsedSeconds());
        }
        HashSet<LocalDate> currentStarts = new HashSet<>();
        for (WeekEntry week : weeks.findByUserId(userId)) {
            if (week.getStartDate() != null) {
                currentStarts.add(week.getStartDate());
            }
        }
        Map<Long, LocalDate> archivedStarts = new HashMap<>();
        for (HistoryWeek week : historyWeeks.findByUserIdOrderByStartDateAsc(userId)) {
            archivedStarts.put(week.getId(), week.getStartDate());
        }
        for (HistoryDay day : historyDays.findByUserId(userId)) {
            LocalDate start = archivedStarts.get(day.getHistoryWeekId());
            if (start != null && currentStarts.contains(start)) {
                continue;
            }
            double seconds = day.getElapsedSeconds();
            if (seconds <= 0 && day.isCompleted()) {
                seconds = ARCHIVED_DAY_SECONDS;
            }
            addStudied(totals, day.getTheme(), seconds);
        }
        return totals;
    }

    private void addStudied(Map<String, Double> totals, String theme, double seconds) {
        String label = clean(theme);
        if (!label.isEmpty() && seconds > 0) {
            totals.merge(key(label), seconds, Double::sum);
        }
    }

    private Map<String, List<String>> places(Long userId) {
        Map<String, List<String>> found = new LinkedHashMap<>();
        for (DayEntry day : days.findByUserIdOrderByWeekNumberAscDayIndexAsc(userId)) {
            String label = clean(day.getTheme());
            if (label.isEmpty() || day.getDayIndex() < 0 || day.getDayIndex() >= NAMES.length) {
                continue;
            }
            found.computeIfAbsent(key(label), ignored -> new ArrayList<>())
                    .add("Week " + day.getWeekNumber() + " · " + NAMES[day.getDayIndex()]);
        }
        return found;
    }

    private void remember(Map<String, String> names, String raw) {
        String label = clean(raw);
        if (!label.isEmpty()) {
            names.putIfAbsent(key(label), label);
        }
    }

    private LocalDate aimDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(raw.trim());
        } catch (DateTimeParseException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a real date.");
        }
    }

    private String label(String raw) {
        String label = clean(raw);
        if (label.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a theme first.");
        }
        if (label.length() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That theme name is too long for a plan.");
        }
        return label;
    }

    private String clean(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim().replaceAll("\\s+", " ");
    }

    private String key(String label) {
        return label.toLowerCase(Locale.ROOT);
    }

    private String limit(String raw, int max) {
        String text = raw == null ? "" : raw;
        if (text.length() > max) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That plan is too long.");
        }
        return text;
    }
}
