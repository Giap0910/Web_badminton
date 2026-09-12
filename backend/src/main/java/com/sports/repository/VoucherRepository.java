package com.sports.repository;

import com.sports.entity.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface VoucherRepository extends JpaRepository<Voucher, Long> {

    Optional<Voucher> findByCodeIgnoreCase(String code);

    List<Voucher> findByIsActiveTrueAndExpiresAtAfter(LocalDateTime now);

    List<Voucher> findByIsActiveTrue();
}
