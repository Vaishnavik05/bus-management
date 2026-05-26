package com.example.busbooking.repository;

import com.example.busbooking.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByUser_UserId(Long userId);
    List<Booking> findByUser_EmailOrderByBookingDateDesc(String email);
}