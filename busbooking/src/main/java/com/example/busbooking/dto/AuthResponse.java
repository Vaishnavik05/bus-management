package com.example.busbooking.dto;

import java.util.Map;

public class AuthResponse {

    private String message;
    private String token;
    private String role;
    private Map<String, Object> profile;

    public AuthResponse() {}

    public AuthResponse(String message, String token, String role, Map<String, Object> profile) {
        this.message = message;
        this.token = token;
        this.role = role;
        this.profile = profile;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Map<String, Object> getProfile() {
        return profile;
    }

    public void setProfile(Map<String, Object> profile) {
        this.profile = profile;
    }
}