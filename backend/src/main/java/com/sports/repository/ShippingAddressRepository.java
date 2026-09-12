package com.sports.repository;

import com.sports.entity.ShippingAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShippingAddressRepository extends JpaRepository<ShippingAddress, Long> {

    List<ShippingAddress> findByUserIdOrderByIsDefaultDescCreatedAtDesc(Long userId);

    Optional<ShippingAddress> findByIdAndUserId(Long id, Long userId);

    @Modifying
    @Query("UPDATE ShippingAddress a SET a.isDefault = false WHERE a.user.id = :userId")
    void resetDefaultAddressForUser(@Param("userId") Long userId);
}
