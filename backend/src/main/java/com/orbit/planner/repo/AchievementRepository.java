package com.orbit.planner.repo;

import com.orbit.planner.model.Achievement;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AchievementRepository extends JpaRepository<Achievement, Long> {
    List<Achievement> findByUserIdOrderByDayDateAscFinishedAtAsc(Long userId);

    Optional<Achievement> findByUserIdAndWeekNumberAndDayIndexAndWeekStart(Long userId, int weekNumber, int dayIndex, LocalDate weekStart);

    Optional<Achievement> findByUserIdAndWeekNumberAndDayIndexAndWeekStartIsNull(Long userId, int weekNumber, int dayIndex);
}
