package com.eldercare.repository;

import com.eldercare.model.Conversation;
import com.eldercare.model.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByConversationOrderByCreatedAtDesc(Conversation conversation, Pageable pageable);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Message m WHERE m.conversation.elderly.id = :userId OR m.conversation.caregiver.id = :userId")
    void deleteByConversationParticipant(@Param("userId") Long userId);
}

