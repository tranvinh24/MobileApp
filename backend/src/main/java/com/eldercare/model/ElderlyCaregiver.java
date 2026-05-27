package com.eldercare.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "elderly_caregiver")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ElderlyCaregiver {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "elderly_id", nullable = false)
    private User elderly;

    @ManyToOne
    @JoinColumn(name = "caregiver_id", nullable = false)
    private User caregiver;

    @Column(name = "linked_at")
    private LocalDateTime linkedAt;

    @Column(name = "is_primary")
    private Boolean isPrimary = false;

    @PrePersist
    protected void onCreate() {
        linkedAt = LocalDateTime.now();
    }
}
