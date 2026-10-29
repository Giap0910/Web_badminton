package com.sports.repository;

import com.sports.entity.BannerImage;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface BannerImageRepository extends JpaRepository<BannerImage, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM BannerImage b WHERE b.position = :position")
    Optional<BannerImage> findByPositionForUpdate(@Param("position") int position);
}
