package com.orbit.planner.service;

import com.orbit.planner.ClockMath;
import com.orbit.planner.api.ApiTypes.AchievementView;
import com.orbit.planner.api.ApiTypes.BoardDay;
import com.orbit.planner.api.ApiTypes.BoardView;
import com.orbit.planner.api.ApiTypes.DayView;
import com.orbit.planner.api.ApiTypes.DetailView;
import com.orbit.planner.api.ApiTypes.HistoryDayView;
import com.orbit.planner.api.ApiTypes.HistoryDetailView;
import com.orbit.planner.api.ApiTypes.HistoryWeekView;
import com.orbit.planner.api.ApiTypes.WeekView;
import com.orbit.planner.model.Achievement;
import com.orbit.planner.model.DayDetail;
import com.orbit.planner.model.DayEntry;
import com.orbit.planner.model.HistoryDay;
import com.orbit.planner.model.HistoryWeek;
import com.orbit.planner.model.WeekEntry;
import com.orbit.planner.repo.AchievementRepository;
import com.orbit.planner.repo.DayRepository;
import com.orbit.planner.repo.DetailRepository;
import com.orbit.planner.repo.HistoryDayRepository;
import com.orbit.planner.repo.HistoryWeekRepository;
import com.orbit.planner.repo.WeekRepository;
import com.orbit.planner.model.PlannerUser;
import com.orbit.planner.web.CurrentAccount;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class PlannerService {
    private static final Logger log = LoggerFactory.getLogger(PlannerService.class);
    private static final LocalDate ORBIT_START = LocalDate.of(2026, 10, 19);
    private static final String[] NAMES = {
            "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
    };

    private final WeekRepository weeks;
    private final DayRepository days;
    private final DetailRepository details;
    private final HistoryWeekRepository historyWeeks;
    private final HistoryDayRepository historyDays;
    private final AchievementRepository achievements;
    private final CurrentAccount accounts;
    private final ZoneId zone;

    public PlannerService(WeekRepository weeks, DayRepository days, DetailRepository details,
                          HistoryWeekRepository historyWeeks, HistoryDayRepository historyDays,
                          AchievementRepository achievements, CurrentAccount accounts,
                          @Value("${orbit.zone:Europe/Paris}") String zoneId) {
        this.weeks = weeks;
        this.days = days;
        this.details = details;
        this.historyWeeks = historyWeeks;
        this.historyDays = historyDays;
        this.achievements = achievements;
        this.accounts = accounts;
        ZoneId resolved;
        try {
            resolved = ZoneId.of(zoneId);
        } catch (Exception ex) {
            resolved = ZoneId.systemDefault();
        }
        this.zone = resolved;
    }

    public synchronized void ensureDiary(PlannerUser user) {
        if (weeks.countByUserIdIsNull() > 0 && weeks.countByUserIdIsNotNull() == 0) {
            weeks.claim(user.getId());
            days.claim(user.getId());
            details.claim(user.getId());
        }
        LocalDate monday = ORBIT_START;
        for (int weekNumber = 1; weekNumber <= 4; weekNumber++) {
            if (weeks.findByUserIdAndWeekNumber(user.getId(), weekNumber).isEmpty()) {
                WeekEntry week = new WeekEntry();
                week.setUserId(user.getId());
                week.setWeekNumber(weekNumber);
                LocalDate start = monday.plusWeeks(weekNumber - 1L);
                week.setStartDate(start);
                week.setEndDate(start.plusDays(6));
                week.setProgram("");
                weeks.save(week);
            }
            for (int dayIndex = 0; dayIndex < 7; dayIndex++) {
                if (days.findByUserIdAndWeekNumberAndDayIndex(user.getId(), weekNumber, dayIndex).isEmpty()) {
                    DayEntry day = new DayEntry();
                    day.setUserId(user.getId());
                    day.setWeekNumber(weekNumber);
                    day.setDayIndex(dayIndex);
                    day.setTheme("");
                    day.setNotes("");
                    days.save(day);
                }
            }
        }
        alignToOrbitStart(user.getId());
    }

    private void alignToOrbitStart(Long userId) {
        WeekEntry first = weeks.findByUserIdAndWeekNumber(userId, 1).orElse(null);
        if (first == null || first.getStartDate() == null || !first.getStartDate().isBefore(ORBIT_START)) {
            return;
        }
        long shift = ChronoUnit.DAYS.between(first.getStartDate(), ORBIT_START);
        for (int weekNumber = 1; weekNumber <= 4; weekNumber++) {
            WeekEntry week = weeks.findByUserIdAndWeekNumber(userId, weekNumber).orElse(null);
            if (week == null || week.getStartDate() == null) {
                continue;
            }
            week.setStartDate(week.getStartDate().plusDays(shift));
            if (week.getEndDate() != null) {
                week.setEndDate(week.getEndDate().plusDays(shift));
            }
            weeks.save(week);
        }
    }

    @Scheduled(fixedDelay = 5000, initialDelay = 5000)
    public synchronized void heartbeat() {
        for (DayEntry entry : days.findByRunningTrue()) {
            applyElapsed(entry);
            saveDay(entry);
        }
    }

    @Scheduled(fixedDelay = 60000, initialDelay = 15000)
    public synchronized void preservePast() {
        LocalDate today = LocalDate.now(zone);
        for (WeekEntry week : weeks.findByEndDateBefore(today)) {
            rememberHistory(week);
        }
        for (DayEntry entry : days.findByCompletedTrue()) {
            rememberAchievement(entry);
        }
    }

    public List<AchievementView> achievements() {
        Long userId = ownerId();
        preserveUser(userId);
        return achievements.findByUserIdOrderByDayDateAscFinishedAtAsc(userId).stream()
                .map(row -> new AchievementView(
                        row.getWeekNumber(),
                        row.getDayIndex(),
                        row.getDayName(),
                        row.getDayDate(),
                        text(row.getTheme()),
                        row.getFinishedAt()))
                .toList();
    }

    public List<HistoryWeekView> history() {
        Long userId = ownerId();
        preserveUser(userId);
        List<HistoryWeekView> list = new ArrayList<>();
        for (HistoryWeek week : historyWeeks.findByUserIdOrderByStartDateAsc(userId)) {
            List<HistoryDayView> stored = new ArrayList<>();
            for (HistoryDay day : historyDays.findByHistoryWeekIdOrderByDayIndexAsc(week.getId())) {
                stored.add(new HistoryDayView(
                        day.getDayIndex(),
                        day.getDayName(),
                        day.getDate(),
                        text(day.getTheme()),
                        text(day.getNotes()),
                        day.isCompleted(),
                        unpackDetails(day.getDetailsSnapshot())));
            }
            list.add(new HistoryWeekView(
                    week.getWeekNumber(),
                    week.getStartDate(),
                    week.getEndDate(),
                    text(week.getProgram()),
                    stored));
        }
        return list;
    }

    public BoardView board() {
        PlannerUser user = accounts.require();
        ensureDiary(user);
        preserveUser(user.getId());
        List<WeekView> list = new ArrayList<>();
        for (int number = 1; number <= 4; number++) {
            list.add(toWeek(loadWeek(number)));
        }
        return new BoardView(Instant.now(), list);
    }

    public synchronized WeekView updateWeek(int number, LocalDate startDate, LocalDate endDate, String program) {
        WeekEntry week = loadWeek(number);
        if (program != null) {
            week.setProgram(cleanProgram(program));
        }
        if (startDate != null) {
            week.setStartDate(startDate);
        }
        if (endDate != null) {
            week.setEndDate(endDate);
        } else if (startDate != null && week.getEndDate() == null) {
            week.setEndDate(startDate.plusDays(6));
        }
        weeks.save(week);
        preserveUser(week.getUserId());
        return toWeek(week);
    }

    public DayView day(int week, int day) {
        return toDay(load(week, day));
    }

    public synchronized DayView updateDay(int week, int day, String theme, String notes) {
        DayEntry entry = load(week, day);
        if (theme != null) {
            entry.setTheme(limit(theme, 4000, "Theme"));
        }
        if (notes != null) {
            entry.setNotes(limit(notes, 8000, "Notes"));
        }
        saveDay(entry);
        return toDay(entry);
    }

    public synchronized DayView start(int week, int day) {
        DayEntry entry = load(week, day);
        if (entry.isCompleted()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This day is already complete. Reset the timer to count again.");
        }
        applyElapsed(entry);
        if (entry.isCompleted() || entry.getElapsedSeconds() >= ClockMath.TARGET_SECONDS) {
            entry.setCompleted(true);
            entry.setElapsedSeconds(ClockMath.TARGET_SECONDS);
            entry.setRunning(false);
            entry.setRunningSince(null);
            saveDay(entry);
            return toDay(entry);
        }
        if (!entry.isRunning()) {
            entry.setRunning(true);
            entry.setRunningSince(Instant.now());
        }
        saveDay(entry);
        return toDay(entry);
    }

    public synchronized DayView pause(int week, int day) {
        DayEntry entry = load(week, day);
        applyElapsed(entry);
        entry.setRunning(false);
        entry.setRunningSince(null);
        saveDay(entry);
        return toDay(entry);
    }

    public synchronized DayView reset(int week, int day) {
        DayEntry entry = load(week, day);
        entry.setElapsedSeconds(0);
        entry.setRunning(false);
        entry.setRunningSince(null);
        entry.setCompleted(false);
        saveDay(entry);
        return toDay(entry);
    }

    public synchronized DayView sync(int week, int day) {
        DayEntry entry = load(week, day);
        applyElapsed(entry);
        saveDay(entry);
        return toDay(entry);
    }

    public synchronized DayView setElapsed(int week, int day, double seconds) {
        if (Double.isNaN(seconds) || seconds < -0.001 || seconds > ClockMath.TARGET_SECONDS + 0.001) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Time must be between 0 and 4 hours");
        }
        double clamped = Math.max(0, Math.min(ClockMath.TARGET_SECONDS, seconds));
        DayEntry entry = load(week, day);
        boolean done = clamped >= ClockMath.TARGET_SECONDS;
        entry.setElapsedSeconds(done ? ClockMath.TARGET_SECONDS : clamped);
        entry.setCompleted(done);
        if (done) {
            entry.setRunning(false);
            entry.setRunningSince(null);
        } else if (entry.isRunning()) {
            entry.setRunningSince(Instant.now());
        }
        saveDay(entry);
        return toDay(entry);
    }

    public synchronized DayView addDetail(int week, int day, String text) {
        load(week, day);
        DayDetail detail = new DayDetail();
        detail.setUserId(ownerId());
        detail.setWeekNumber(week);
        detail.setDayIndex(day);
        detail.setText(requireText(text));
        detail.setSortOrder(details.maxSortOrder(ownerId(), week, day) + 1);
        details.saveAndFlush(detail);
        return toDay(load(week, day));
    }

    public synchronized DayView updateDetail(long id, String text, Boolean done) {
        DayDetail detail = details.findByIdAndUserId(id, ownerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Detail not found"));
        if (text != null) {
            detail.setText(requireText(text));
        }
        if (done != null) {
            detail.setDone(done);
        }
        details.save(detail);
        return toDay(load(detail.getWeekNumber(), detail.getDayIndex()));
    }

    public synchronized DayView deleteDetail(long id) {
        DayDetail detail = details.findByIdAndUserId(id, ownerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Detail not found"));
        int week = detail.getWeekNumber();
        int day = detail.getDayIndex();
        details.delete(detail);
        details.flush();
        return toDay(load(week, day));
    }

    private void applyElapsed(DayEntry entry) {
        if (!entry.isRunning() || entry.getRunningSince() == null) {
            return;
        }
        long gapMillis = Duration.between(entry.getRunningSince(), Instant.now()).toMillis();
        ClockMath.Result result = ClockMath.advance(entry.getElapsedSeconds(), true, gapMillis);
        entry.setElapsedSeconds(result.elapsed());
        if (result.completed()) {
            entry.setCompleted(true);
        }
        if (!result.running()) {
            if (gapMillis > ClockMath.MAX_GAP_MILLIS) {
                log.info("Paused week {} {} because the computer was away for {}s",
                        entry.getWeekNumber(), NAMES[entry.getDayIndex()], gapMillis / 1000);
            }
            entry.setRunning(false);
            entry.setRunningSince(null);
        } else if (result.continueRun()) {
            entry.setRunning(true);
            entry.setRunningSince(Instant.now());
        }
    }

    private Long ownerId() {
        return accounts.require().getId();
    }

    private WeekEntry loadWeek(int number) {
        if (number < 1 || number > 4) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Week must be 1 to 4");
        }
        Long userId = ownerId();
        return weeks.findByUserIdAndWeekNumber(userId, number).orElseGet(() -> {
            WeekEntry created = new WeekEntry();
            created.setUserId(userId);
            created.setWeekNumber(number);
            created.setProgram("");
            return weeks.save(created);
        });
    }

    private DayEntry load(int week, int day) {
        WeekEntry owner = loadWeek(week);
        if (day < 0 || day > 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Day must be Monday through Sunday");
        }
        return days.findByUserIdAndWeekNumberAndDayIndex(owner.getUserId(), week, day).orElseGet(() -> {
            DayEntry created = new DayEntry();
            created.setUserId(owner.getUserId());
            created.setWeekNumber(week);
            created.setDayIndex(day);
            created.setTheme("");
            created.setNotes("");
            return days.save(created);
        });
    }

    private WeekView toWeek(WeekEntry week) {
        List<BoardDay> list = new ArrayList<>();
        for (int dayIndex = 0; dayIndex < 7; dayIndex++) {
            DayEntry entry = load(week.getWeekNumber(), dayIndex);
            list.add(new BoardDay(
                    entry.getWeekNumber(),
                    entry.getDayIndex(),
                    NAMES[entry.getDayIndex()],
                    dateFor(week, dayIndex),
                    text(entry.getTheme()),
                    ClockMath.TARGET_SECONDS,
                    entry.getElapsedSeconds(),
                    entry.isRunning(),
                    entry.getRunningSince(),
                    entry.isCompleted(),
                    (int) details.countByUserIdAndWeekNumberAndDayIndex(week.getUserId(), week.getWeekNumber(), dayIndex)
            ));
        }
        return new WeekView(
                week.getWeekNumber(),
                week.getStartDate(),
                week.getEndDate(),
                text(week.getProgram()),
                list
        );
    }

    private DayView toDay(DayEntry entry) {
        WeekEntry week = loadWeek(entry.getWeekNumber());
        List<DetailView> list = details
                .findByUserIdAndWeekNumberAndDayIndexOrderBySortOrderAscIdAsc(entry.getUserId(), entry.getWeekNumber(), entry.getDayIndex())
                .stream()
                .map(detail -> new DetailView(detail.getId(), detail.getText(), detail.isDone(), detail.getSortOrder()))
                .toList();
        return new DayView(
                entry.getWeekNumber(),
                entry.getDayIndex(),
                NAMES[entry.getDayIndex()],
                dateFor(week, entry.getDayIndex()),
                text(week.getProgram()),
                text(entry.getTheme()),
                text(entry.getNotes()),
                ClockMath.TARGET_SECONDS,
                entry.getElapsedSeconds(),
                entry.isRunning(),
                entry.getRunningSince(),
                entry.isCompleted(),
                Instant.now(),
                list
        );
    }

    private void saveDay(DayEntry entry) {
        days.save(entry);
        if (entry.isCompleted()) {
            rememberAchievement(entry);
        }
        if (entry.getUserId() != null) {
            weeks.findByUserIdAndWeekNumber(entry.getUserId(), entry.getWeekNumber()).ifPresent(this::rememberHistory);
        }
    }

    private synchronized void preserveUser(Long userId) {
        if (userId == null) {
            return;
        }
        LocalDate today = LocalDate.now(zone);
        for (WeekEntry week : weeks.findByUserId(userId)) {
            if (week.getEndDate() != null && week.getEndDate().isBefore(today)) {
                rememberHistory(week);
            }
        }
        for (DayEntry entry : days.findByUserIdAndCompletedTrue(userId)) {
            rememberAchievement(entry);
        }
    }

    private void rememberAchievement(DayEntry entry) {
        if (!entry.isCompleted() || entry.getUserId() == null || entry.getDayIndex() < 0 || entry.getDayIndex() > 6) {
            return;
        }
        WeekEntry week = weeks.findByUserIdAndWeekNumber(entry.getUserId(), entry.getWeekNumber()).orElse(null);
        LocalDate start = week == null ? null : week.getStartDate();
        var existing = start == null
                ? achievements.findByUserIdAndWeekNumberAndDayIndexAndWeekStartIsNull(entry.getUserId(), entry.getWeekNumber(), entry.getDayIndex())
                : achievements.findByUserIdAndWeekNumberAndDayIndexAndWeekStart(entry.getUserId(), entry.getWeekNumber(), entry.getDayIndex(), start);
        Achievement row = existing.orElseGet(Achievement::new);
        boolean fresh = row.getId() == null;
        row.setUserId(entry.getUserId());
        row.setWeekNumber(entry.getWeekNumber());
        row.setDayIndex(entry.getDayIndex());
        row.setWeekStart(start);
        row.setDayDate(start == null ? null : start.plusDays(entry.getDayIndex()));
        row.setDayName(NAMES[entry.getDayIndex()]);
        row.setTheme(text(entry.getTheme()));
        if (fresh || row.getFinishedAt() == null) {
            row.setFinishedAt(Instant.now());
        }
        achievements.save(row);
    }

    private void rememberHistory(WeekEntry week) {
        if (week.getUserId() == null || week.getStartDate() == null || week.getEndDate() == null) {
            return;
        }
        if (!week.getEndDate().isBefore(LocalDate.now(zone))) {
            return;
        }
        HistoryWeek stored = historyWeeks.findByUserIdAndStartDate(week.getUserId(), week.getStartDate()).orElseGet(HistoryWeek::new);
        stored.setUserId(week.getUserId());
        stored.setWeekNumber(week.getWeekNumber());
        stored.setStartDate(week.getStartDate());
        stored.setEndDate(week.getEndDate());
        stored.setProgram(text(week.getProgram()));
        stored = historyWeeks.save(stored);
        for (DayEntry entry : days.findByUserIdAndWeekNumberOrderByDayIndexAsc(week.getUserId(), week.getWeekNumber())) {
            if (entry.getDayIndex() < 0 || entry.getDayIndex() > 6) {
                continue;
            }
            HistoryDay day = historyDays.findByHistoryWeekIdAndDayIndex(stored.getId(), entry.getDayIndex()).orElseGet(HistoryDay::new);
            day.setHistoryWeekId(stored.getId());
            day.setUserId(week.getUserId());
            day.setDayIndex(entry.getDayIndex());
            day.setDayName(NAMES[entry.getDayIndex()]);
            day.setDate(week.getStartDate().plusDays(entry.getDayIndex()));
            day.setTheme(text(entry.getTheme()));
            day.setNotes(text(entry.getNotes()));
            day.setCompleted(entry.isCompleted());
            day.setDetailsSnapshot(packDetails(details.findByUserIdAndWeekNumberAndDayIndexOrderBySortOrderAscIdAsc(
                    week.getUserId(), week.getWeekNumber(), entry.getDayIndex())));
            historyDays.save(day);
        }
    }

    private String packDetails(List<DayDetail> list) {
        StringBuilder out = new StringBuilder();
        for (DayDetail detail : list) {
            if (!out.isEmpty()) {
                out.append('\n');
            }
            out.append(detail.isDone() ? '1' : '0').append('\t').append(text(detail.getText()).replace('\n', ' ').replace('\t', ' '));
        }
        return out.toString();
    }

    private List<HistoryDetailView> unpackDetails(String snapshot) {
        List<HistoryDetailView> list = new ArrayList<>();
        if (snapshot == null || snapshot.isBlank()) {
            return list;
        }
        for (String line : snapshot.split("\n", -1)) {
            int split = line.indexOf('\t');
            if (split < 0) {
                continue;
            }
            list.add(new HistoryDetailView(line.substring(split + 1), line.startsWith("1")));
        }
        return list;
    }

    private LocalDate dateFor(WeekEntry week, int dayIndex) {
        if (week.getStartDate() == null) {
            return null;
        }
        return week.getStartDate().plusDays(dayIndex);
    }

    private String text(String value) {
        return value == null ? "" : value;
    }

    private String limit(String value, int max, String label) {
        if (value.length() > max) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " is too long");
        }
        return value;
    }

    private String cleanProgram(String value) {
        String trimmed = value.trim();
        if (trimmed.length() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Program is too long");
        }
        return trimmed;
    }

    private String requireText(String text) {
        if (text == null || text.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Detail text is required");
        }
        String trimmed = text.trim();
        if (trimmed.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Detail is too long");
        }
        return trimmed;
    }
}
