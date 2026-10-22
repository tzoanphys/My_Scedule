package com.orbit.planner.repo;

import com.orbit.planner.model.DayDetail;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface DetailRepository extends JpaRepository<DayDetail, Long> {
    List<DayDetail> findByUserIdAndWeekNumberAndDayIndexOrderBySortOrderAscIdAsc(Long userId, int weekNumber, int dayIndex);

    long countByUserIdAndWeekNumberAndDayIndex(Long userId, int weekNumber, int dayIndex);

    Optional<DayDetail> findByIdAndUserId(Long id, Long userId);

    List<DayDetail> findByUserIdAndWeekNumber(Long userId, int weekNumber);

    @Query("select coalesce(max(d.sortOrder), 0) from DayDetail d where d.userId = ?1 and d.weekNumber = ?2 and d.dayIndex = ?3")
    int maxSortOrder(Long userId, int weekNumber, int dayIndex);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update DayDetail d set d.userId = ?1 where d.userId is null")
    int claim(Long userId);
}
