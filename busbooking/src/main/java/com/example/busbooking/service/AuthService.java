package com.example.busbooking.service;

import com.example.busbooking.dto.AuthResponse;
import com.example.busbooking.dto.LoginRequest;
import com.example.busbooking.dto.RegisterRequest;

public interface AuthService {
    AuthResponse register(RegisterRequest req);
    AuthResponse login(LoginRequest req);
}