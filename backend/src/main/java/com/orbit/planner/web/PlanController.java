package com.orbit.planner.web;

import com.orbit.planner.api.ApiTypes.CheckpointCreate;
import com.orbit.planner.api.ApiTypes.CheckpointUpdate;
import com.orbit.planner.api.ApiTypes.PlanThemeView;
import com.orbit.planner.api.ApiTypes.PlanWrite;
import com.orbit.planner.api.ApiTypes.StudyLog;
import com.orbit.planner.service.PlanService;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/plans")
public class PlanController {
    private final PlanService plans;

    public PlanController(PlanService plans) {
        this.plans = plans;
    }

    @GetMapping
    public List<PlanThemeView> list() {
        return plans.list();
    }

    @PostMapping("/themes")
    public PlanThemeView addTheme(@RequestBody PlanWrite body) {
        return plans.addTheme(body == null ? null : body.theme());
    }

    @PutMapping
    public PlanThemeView save(@RequestBody PlanWrite body) {
        return plans.save(body == null ? null : body.theme(), body == null ? null : body.plan());
    }

    @PostMapping("/study")
    public PlanThemeView logStudy(@RequestBody StudyLog body) {
        return plans.logStudy(body == null ? null : body.theme(), body == null ? null : body.seconds());
    }

    @PostMapping("/checkpoints")
    public PlanThemeView addCheckpoint(@RequestBody CheckpointCreate body) {
        return plans.addCheckpoint(
                body == null ? null : body.theme(),
                body == null ? null : body.text(),
                body == null ? null : body.date());
    }

    @PutMapping("/checkpoints/{id}")
    public PlanThemeView updateCheckpoint(@PathVariable long id, @RequestBody CheckpointUpdate body) {
        return plans.updateCheckpoint(
                id,
                body == null ? null : body.text(),
                body == null ? null : body.done(),
                body == null ? null : body.date());
    }

    @DeleteMapping("/checkpoints/{id}")
    public PlanThemeView deleteCheckpoint(@PathVariable long id) {
        return plans.deleteCheckpoint(id);
    }
}
