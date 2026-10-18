package com.orbit.planner.repo;

import com.orbit.planner.model.DayEntry;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface DayRepository extends JpaRepository<DayEntry, Long> {
    Optional<DayEntry> findByUserIdAndWeekNumberAndDayIndex(Long userId, int weekNumber, int dayIndex);

    List<DayEntry> findByUserIdAndWeekNumberOrderByDayIndexAsc(Long userId, int weekNumber);

    List<DayEntry> findByUserIdAndCompletedTrue(Long userId);

    List<DayEntry> findByCompletedTrue();

    List<DayEntry> findByRunningTrue();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update DayEntry d set d.userId = ?1 where d.userId is null")
    int claim(Long userId);
}
