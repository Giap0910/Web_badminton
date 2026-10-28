package com.sports.repository;

import com.sports.entity.AiChatLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiChatLogRepository extends JpaRepository<AiChatLog, Long> {
    List<AiChatLog> findByUserIdOrderByCreatedAtDesc(Long userId);
}
