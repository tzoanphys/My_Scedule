package com.orbit.planner.repo;

import com.orbit.planner.model.PlanCheckpoint;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PlanCheckpointRepository extends JpaRepository<PlanCheckpoint, Long> {
    List<PlanCheckpoint> findByPlanIdAndUserIdOrderBySortOrderAscIdAsc(Long planId, Long userId);

    Optional<PlanCheckpoint> findByIdAndUserId(Long id, Long userId);

    @Query("select coalesce(max(c.sortOrder), 0) from PlanCheckpoint c where c.planId = ?1 and c.userId = ?2")
    int maxSortOrder(Long planId, Long userId);
}
