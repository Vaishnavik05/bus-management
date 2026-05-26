package com.example.busbooking.controller;

import com.example.busbooking.entity.Booking;
import com.example.busbooking.entity.BookingSeat;
import com.example.busbooking.entity.Payment;
import com.example.busbooking.entity.Route;
import com.example.busbooking.entity.Seat;
import com.example.busbooking.entity.User;
import com.example.busbooking.enums.BookingStatus;
import com.example.busbooking.enums.PaymentStatus;
import com.example.busbooking.repository.BookingRepository;
import com.example.busbooking.repository.BookingSeatRepository;
import com.example.busbooking.repository.PaymentRepository;
import com.example.busbooking.repository.RouteRepository;
import com.example.busbooking.repository.SeatRepository;
import com.example.busbooking.repository.UserRepository;
import com.example.busbooking.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired
    private BookingRepository repo;

    @Autowired
    private RouteRepository routeRepo;

    @Autowired
    private SeatRepository seatRepo;

    @Autowired
    private BookingSeatRepository bookingSeatRepo;

    @Autowired
    private PaymentRepository paymentRepo;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping
    public List<Booking> getMyBookings(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        User user = resolveUserFromAuthorization(authorization);
        List<Booking> bookings = repo.findByUser_UserId(user.getUserId());
        if (bookings == null || bookings.isEmpty()) {
            bookings = repo.findByUser_EmailOrderByBookingDateDesc(user.getEmail());
        }
        return bookings;
    }

    @GetMapping("/{id}")
    public Booking getById(@PathVariable Long id) {
        return repo.findById(id).orElseThrow(() -> new RuntimeException("Booking not found"));
    }

    @PostMapping("/book")
    public Booking book(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Map<String, Object> payload) {

        User user = resolveUserFromAuthorization(authorization);

        Object routeObj = payload.get("route");
        Long routeId = null;
        if (routeObj instanceof Map) {
            Object rid = ((Map<?, ?>) routeObj).get("routeId");
            if (rid instanceof Number) routeId = ((Number) rid).longValue();
            else if (rid instanceof String) routeId = Long.parseLong((String) rid);
        } else if (payload.get("routeId") instanceof Number) {
            routeId = ((Number) payload.get("routeId")).longValue();
        } else if (payload.get("routeId") instanceof String) {
            routeId = Long.parseLong((String) payload.get("routeId"));
        }

        Route route = null;
        if (routeId != null) {
            route = routeRepo.findById(routeId).orElse(null);
        }

        Booking booking = new Booking();
        booking.setUser(user);
        booking.setRoute(route);
        booking.setStatus(BookingStatus.BOOKED);

        Object amt = payload.get("totalAmount") != null ? payload.get("totalAmount") : payload.get("amount");
        double total = 0.0;
        if (amt instanceof Number) total = ((Number) amt).doubleValue();
        else if (amt instanceof String) total = Double.parseDouble((String) amt);
        booking.setTotalAmount(total);

        Booking saved = repo.save(booking);

        Object seatsObj = payload.get("seats");
        if (seatsObj instanceof List) {
            List<?> seats = (List<?>) seatsObj;
            for (Object s : seats) {
                Seat seat = null;
                Long seatId = null;

                if (s instanceof Number) seatId = ((Number) s).longValue();
                else if (s instanceof String) {
                    try {
                        seatId = Long.parseLong((String) s);
                    } catch (NumberFormatException ignored) {
                        seatId = null;
                    }
                }

                if (seatId != null) {
                    seat = seatRepo.findById(seatId).orElse(null);
                }

                if (seat == null && route != null && route.getBus() != null) {
                    String target = String.valueOf(s);
                    List<Seat> busSeats = seatRepo.findByBus_BusId(route.getBus().getBusId());
                    for (Seat bs : busSeats) {
                        if (target.equals(bs.getSeatNumber())) {
                            seat = bs;
                            break;
                        }
                    }
                }

                if (seat != null) {
                    BookingSeat bsEntity = new BookingSeat();
                    bsEntity.setBooking(saved);
                    bsEntity.setSeat(seat);
                    bookingSeatRepo.save(bsEntity);
                }
            }
        }

        Object paymentObj = payload.get("payment");
        if (paymentObj instanceof Map) {
            Map<?, ?> pay = (Map<?, ?>) paymentObj;
            Payment p = new Payment();
            p.setBooking(saved);
            p.setAmount(total);
            p.setPaymentMethod(pay.get("cardHolder") != null ? "CARD" : "UNKNOWN");
            p.setPaymentStatus(PaymentStatus.SUCCESS);
            paymentRepo.save(p);
        }

        return saved;
    }

    @DeleteMapping("/cancel/{id}")
    public String cancel(@PathVariable Long id) {
        Booking b = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        b.setStatus(BookingStatus.CANCELLED);
        repo.save(b);
        return "Booking Cancelled";
    }

    private User resolveUserFromAuthorization(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing Authorization header");
        }

        String token = authorization.substring(7);
        String email;
        try {
            email = jwtUtil.extractEmail(token);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");
        }

        return userRepo.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}