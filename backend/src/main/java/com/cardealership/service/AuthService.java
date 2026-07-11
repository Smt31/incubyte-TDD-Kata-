package com.cardealership.service;

import com.cardealership.dto.LoginRequest;
import com.cardealership.dto.LoginResponse;
import com.cardealership.dto.RegisterRequest;
import com.cardealership.dto.UserResponse;

/**
 * Service interface handling all user authentication operations.
 */
public interface AuthService {
    UserResponse register(RegisterRequest request);
    LoginResponse login(LoginRequest request);
}
