package com.orbit.planner.repo;

import com.orbit.planner.model.WeekEntry;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface WeekRepository extends JpaRepository<WeekEntry, Long> {
    Optional<WeekEntry> findByUserIdAndWeekNumber(Long userId, int weekNumber);

    List<WeekEntry> findByUserId(Long userId);

    List<WeekEntry> findByEndDateBefore(LocalDate day);

    long countByUserIdIsNull();

    long countByUserIdIsNotNull();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update WeekEntry w set w.userId = ?1 where w.userId is null")
    int claim(Long userId);
}
