package com.example.busbooking.controller;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.busbooking.entity.Bus;
import com.example.busbooking.entity.Seat;
import com.example.busbooking.enums.SeatType;
import com.example.busbooking.repository.BusRepository;
import com.example.busbooking.repository.SeatRepository;

@RestController
@RequestMapping("/api/buses")
public class BusController {

    @Autowired
    private BusRepository repo;

    @Autowired
    private SeatRepository seatRepo;

    @PostMapping
    public Bus addBus(@RequestBody Bus bus) {
        Bus saved = repo.save(bus);
        int total = Math.max(0, saved.getTotalSeats());
        List<Seat> seats = new ArrayList<>();

        for (int i = 1; i <= total; i++) {
            Seat s = new Seat();
            s.setSeatNumber(String.valueOf(i));
            s.setSeatType(i % 2 == 1 ? SeatType.WINDOW : SeatType.AISLE);
            s.setAvailable(true);
            s.setBus(saved);
            seats.add(s);
        }

        if (!seats.isEmpty()) {
            seatRepo.saveAll(seats);
        }

        return saved;
    }

    @GetMapping
    public List<Bus> getAll() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public Bus getById(@PathVariable Long id) {
        return repo.findById(id).orElseThrow(() -> new RuntimeException("Bus not found"));
    }

    @PutMapping("/{id}")
    public Bus updateBus(@PathVariable Long id, @RequestBody Bus bus) {
        Bus existing = repo.findById(id).orElseThrow(() -> new RuntimeException("Bus not found"));
        existing.setBusNumber(bus.getBusNumber());
        existing.setBusName(bus.getBusName());
        existing.setBusType(bus.getBusType());

        int newTotal = bus.getTotalSeats();
        existing.setTotalSeats(newTotal);
        Bus saved = repo.save(existing);

        List<Seat> existingSeats = seatRepo.findByBus_BusId(saved.getBusId());
        int existingCount = existingSeats.size();

        if (newTotal > existingCount) {
            List<Seat> toAdd = new ArrayList<>();
            for (int i = existingCount + 1; i <= newTotal; i++) {
                Seat s = new Seat();
                s.setSeatNumber(String.valueOf(i));
                s.setSeatType(i % 2 == 1 ? SeatType.WINDOW : SeatType.AISLE);
                s.setAvailable(true);
                s.setBus(saved);
                toAdd.add(s);
            }
            if (!toAdd.isEmpty()) {
                seatRepo.saveAll(toAdd);
            }
        } else if (newTotal < existingCount) {
            for (Seat s : existingSeats) {
                try {
                    int num = Integer.parseInt(s.getSeatNumber());
                    if (num > newTotal) {
                        s.setAvailable(false);
                    }
                } catch (NumberFormatException e) {
                }
            }
            seatRepo.saveAll(existingSeats);
        }

        return saved;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBus(@PathVariable Long id) {
        Bus existing = repo.findById(id).orElseThrow(() -> new RuntimeException("Bus not found"));
        repo.delete(existing);
        return ResponseEntity.noContent().build();
    }
}
