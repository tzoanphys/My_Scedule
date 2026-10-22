package com.orbit.planner.web;

import com.orbit.planner.api.ApiTypes.AchievementView;
import com.orbit.planner.api.ApiTypes.BoardView;
import com.orbit.planner.api.ApiTypes.HistoryWeekView;
import com.orbit.planner.api.ApiTypes.DayUpdate;
import com.orbit.planner.api.ApiTypes.DayView;
import com.orbit.planner.api.ApiTypes.DetailCreate;
import com.orbit.planner.api.ApiTypes.DetailUpdate;
import com.orbit.planner.api.ApiTypes.ElapsedRequest;
import com.orbit.planner.api.ApiTypes.WeekUpdate;
import com.orbit.planner.api.ApiTypes.WeekView;
import com.orbit.planner.service.PlannerService;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class PlannerController {
    private final PlannerService planner;

    public PlannerController(PlannerService planner) {
        this.planner = planner;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @GetMapping("/board")
    public BoardView board() {
        return planner.board();
    }

    @GetMapping("/achievements")
    public List<AchievementView> achievements() {
        return planner.achievements();
    }

    @GetMapping("/history")
    public List<HistoryWeekView> history() {
        return planner.history();
    }

    @PutMapping("/weeks/{week}")
    public WeekView updateWeek(@PathVariable int week, @RequestBody WeekUpdate body) {
        return planner.updateWeek(week, body.startDate(), body.endDate(), body.program());
    }

    @GetMapping("/days/{week}/{day}")
    public DayView day(@PathVariable int week, @PathVariable int day) {
        return planner.day(week, day);
    }

    @PutMapping("/days/{week}/{day}")
    public DayView updateDay(@PathVariable int week, @PathVariable int day, @RequestBody DayUpdate body) {
        return planner.updateDay(week, day, body.theme(), body.notes());
    }

    @PostMapping("/days/{week}/{day}/timer/{action}")
    public DayView timer(@PathVariable int week, @PathVariable int day, @PathVariable String action,
                         @RequestBody(required = false) ElapsedRequest body) {
        return switch (action) {
            case "start" -> planner.start(week, day);
            case "pause" -> planner.pause(week, day);
            case "reset" -> planner.reset(week, day);
            case "sync" -> planner.sync(week, day);
            case "elapsed" -> {
                if (body == null || body.elapsedSeconds() == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "elapsedSeconds is required");
                }
                yield planner.setElapsed(week, day, body.elapsedSeconds());
            }
            case "goal" -> {
                if (body == null || body.targetSeconds() == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "targetSeconds is required");
                }
                yield planner.setTarget(week, day, body.targetSeconds());
            }
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown timer action");
        };
    }

    @PostMapping("/days/{week}/{day}/details")
    public DayView addDetail(@PathVariable int week, @PathVariable int day, @RequestBody DetailCreate body) {
        return planner.addDetail(week, day, body == null ? null : body.text());
    }

    @PutMapping("/details/{id}")
    public DayView updateDetail(@PathVariable long id, @RequestBody DetailUpdate body) {
        return planner.updateDetail(id, body.text(), body.done());
    }

    @DeleteMapping("/details/{id}")
    public DayView deleteDetail(@PathVariable long id) {
        return planner.deleteDetail(id);
    }
}
