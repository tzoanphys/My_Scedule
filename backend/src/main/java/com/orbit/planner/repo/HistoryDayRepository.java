package com.orbit.planner.repo;

import com.orbit.planner.model.HistoryDay;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HistoryDayRepository extends JpaRepository<HistoryDay, Long> {
    List<HistoryDay> findByHistoryWeekIdOrderByDayIndexAsc(Long historyWeekId);

    Optional<HistoryDay> findByHistoryWeekIdAndDayIndex(Long historyWeekId, int dayIndex);

    List<HistoryDay> findByUserId(Long userId);
}
