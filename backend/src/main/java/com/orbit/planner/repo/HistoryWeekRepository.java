package com.orbit.planner.repo;

import com.orbit.planner.model.HistoryWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HistoryWeekRepository extends JpaRepository<HistoryWeek, Long> {
    List<HistoryWeek> findByUserIdOrderByStartDateAsc(Long userId);

    Optional<HistoryWeek> findByUserIdAndStartDate(Long userId, LocalDate startDate);
}
