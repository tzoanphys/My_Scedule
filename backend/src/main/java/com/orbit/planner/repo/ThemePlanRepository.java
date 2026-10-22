package com.orbit.planner.repo;

import com.orbit.planner.model.ThemePlan;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ThemePlanRepository extends JpaRepository<ThemePlan, Long> {
    List<ThemePlan> findByUserId(Long userId);

    Optional<ThemePlan> findByUserIdAndThemeKey(Long userId, String themeKey);

    Optional<ThemePlan> findByIdAndUserId(Long id, Long userId);
}
