package com.cardealership.controller;

import com.cardealership.dto.RegisterRequest;
import com.cardealership.model.User;
import com.cardealership.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for AuthController endpoints following strict TDD.
 * Refactored to use type-safe RegisterRequest DTO builders for mock request payloads.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void shouldRegisterUserWithValidData() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("valid@example.com")
                .password("password123")
                .name("Valid User")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.email").value("valid@example.com"))
                .andExpect(jsonPath("$.name").value("Valid User"));
    }

    @Test
    void shouldRejectDuplicateEmail() throws Exception {
        // Pre-save existing user
        User existingUser = User.builder()
                .email("duplicate@example.com")
                .password(passwordEncoder.encode("password123"))
                .name("Existing User")
                .role("USER")
                .build();
        userRepository.save(existingUser);

        RegisterRequest request = RegisterRequest.builder()
                .email("duplicate@example.com")
                .password("password123")
                .name("New User")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Email already exists"));
    }

    @Test
    void shouldRejectBlankEmail() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email(" ")
                .password("password123")
                .name("Name")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.email").exists());
    }

    @Test
    void shouldRejectInvalidEmailFormat() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("invalid-email")
                .password("password123")
                .name("Name")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.email").value("Email must be a valid email address"));
    }

    @Test
    void shouldRejectBlankPassword() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("valid@example.com")
                .password(" ")
                .name("Name")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.password").exists());
    }

    @Test
    void shouldRejectShortPassword() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("valid@example.com")
                .password("12345") // Less than 6 characters
                .name("Name")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.password").value("Password must be at least 6 characters long"));
    }

    @Test
    void shouldRejectBlankName() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("valid@example.com")
                .password("password123")
                .name(" ")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.name").exists());
    }

    @Test
    void shouldAssignDefaultUSERRole() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("role@example.com")
                .password("password123")
                .name("Role User")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("USER"));
    }

    @Test
    void shouldHashPasswordBeforeSaving() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("hash@example.com")
                .password("myPlainPassword123")
                .name("Hash User")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        Optional<User> userOptional = userRepository.findByEmail("hash@example.com");
        assertTrue(userOptional.isPresent());
        User savedUser = userOptional.get();

        assertNotEquals("myPlainPassword123", savedUser.getPassword());
        assertTrue(passwordEncoder.matches("myPlainPassword123", savedUser.getPassword()));
    }

    @Test
    void shouldNotReturnPasswordInResponse() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("nopass@example.com")
                .password("password123")
                .name("No Pass User")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    void shouldSaveUserInDatabase() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("db@example.com")
                .password("password123")
                .name("DB User")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        assertTrue(userRepository.existsByEmail("db@example.com"));
    }

    @Test
    void shouldRejectEmptyRequestBody() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Request body is missing or empty"));
    }

    @Test
    void shouldRejectMalformedJSON() throws Exception {
        String malformedJson = "{email: 'test@example.com', password: 'password123'"; // Missing closing brace

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(malformedJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Malformed JSON request"));
    }

    @Test
    void shouldReturnValidationErrorsForInvalidInput() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("bademail")
                .password("short")
                .name("")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.email").exists())
                .andExpect(jsonPath("$.password").exists())
                .andExpect(jsonPath("$.name").exists());
    }

    @Test
    void shouldReturnCorrectHttpStatusCodes() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("http@example.com")
                .password("password123")
                .name("HTTP User")
                .build();

        // 201 Created on success
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // 400 Bad Request on duplicate
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
