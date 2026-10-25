package com.orbit.planner.repo;

import com.orbit.planner.model.DayEntry;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DayRepository extends JpaRepository<DayEntry, Long> {
    Optional<DayEntry> findByUserIdAndWeekNumberAndDayIndex(Long userId, int weekNumber, int dayIndex);

    List<DayEntry> findByUserIdAndWeekNumberOrderByDayIndexAsc(Long userId, int weekNumber);

    List<DayEntry> findByUserIdOrderByWeekNumberAscDayIndexAsc(Long userId);

    List<DayEntry> findByUserIdAndCompletedTrue(Long userId);

    List<DayEntry> findByCompletedTrue();

    List<DayEntry> findByRunningTrue();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update DayEntry d set d.userId = ?1 where d.userId is null")
    int claim(Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update DayEntry d
            set d.elapsedSeconds = :elapsed,
                d.running = :running,
                d.runningSince = :since,
                d.completed = :completed
            where d.id = :id
              and d.running = true
              and d.runningSince = :expectedSince
            """)
    int advanceClock(
            @Param("id") Long id,
            @Param("expectedSince") Instant expectedSince,
            @Param("elapsed") double elapsed,
            @Param("running") boolean running,
            @Param("since") Instant since,
            @Param("completed") boolean completed);
}
