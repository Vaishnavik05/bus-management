package com.example.busbooking.controller;

import com.example.busbooking.entity.User;
import com.example.busbooking.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository repo;

    @GetMapping
    public List<User> getAll() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public User getById(@PathVariable Long id) {
        return repo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @PutMapping("/{id}")
    public User updateUser(@PathVariable Long id, @RequestBody User updated) {
        User existing = repo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        existing.setFullName(updated.getFullName());
        existing.setEmail(updated.getEmail());
        existing.setPhone(updated.getPhone());
        if (updated.getRole() != null) {
            existing.setRole(updated.getRole());
        }
        return repo.save(existing);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        User existing = repo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        repo.delete(existing);
        return ResponseEntity.noContent().build();
    }
}
