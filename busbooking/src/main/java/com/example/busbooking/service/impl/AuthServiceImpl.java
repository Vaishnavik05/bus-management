package com.example.busbooking.service.impl;

import com.example.busbooking.dto.AuthResponse;
import com.example.busbooking.dto.LoginRequest;
import com.example.busbooking.dto.RegisterRequest;
import com.example.busbooking.entity.User;
import com.example.busbooking.repository.UserRepository;
import com.example.busbooking.security.JwtUtil;
import com.example.busbooking.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class AuthServiceImpl implements AuthService {

    @Autowired
    private UserRepository repo;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Override
    public AuthResponse register(RegisterRequest req) {
        if (repo.findByEmail(req.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setFullName(req.getFullName());
        user.setEmail(req.getEmail());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setRole(req.getRole());
        user.setPhone(req.getPhone());

        repo.save(user);

        String token = jwtUtil.generateToken(user.getEmail());

        Map<String, Object> profile = new HashMap<>();
        profile.put("fullName", user.getFullName());
        profile.put("email", user.getEmail());
        profile.put("role", user.getRole() != null ? user.getRole().name() : null);

        return new AuthResponse("User Registered Successfully", token, user.getRole() != null ? user.getRole().name() : null, profile);
    }

    @Override
    public AuthResponse login(LoginRequest req) {
        User user = repo.findByEmail(req.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        String token = jwtUtil.generateToken(user.getEmail());

        Map<String, Object> profile = new HashMap<>();
        profile.put("fullName", user.getFullName());
        profile.put("email", user.getEmail());
        profile.put("role", user.getRole() != null ? user.getRole().name() : null);

        return new AuthResponse("Login Successful", token, user.getRole() != null ? user.getRole().name() : null, profile);
    }
}