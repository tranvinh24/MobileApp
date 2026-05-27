package com.eldercare.repository;

import com.eldercare.model.Conversation;
import com.eldercare.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    Optional<Conversation> findByElderlyAndCaregiver(User elderly, User caregiver);

    List<Conversation> findByElderly(User elderly);

    List<Conversation> findByCaregiver(User caregiver);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Conversation c WHERE c.elderly.id = :userId OR c.caregiver.id = :userId")
    void deleteByParticipant(@Param("userId") Long userId);
}

