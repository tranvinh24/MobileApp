package com.eldercare.model;

import com.eldercare.model.enums.CheckInType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "check_ins")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckIn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "elderly_id", nullable = false)
    private User elderly;

    @Enumerated(EnumType.STRING)
    @Column(name = "check_in_type", nullable = false)
    private CheckInType checkInType;

    @Column(name = "checked_at")
    private LocalDateTime checkedAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private BigDecimal latitude;
    private BigDecimal longitude;

    @PrePersist
    protected void onCreate() {
        checkedAt = LocalDateTime.now();
    }
}
