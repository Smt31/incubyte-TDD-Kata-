package com.cardealership.controller;

import com.cardealership.dto.VehicleRequest;
import com.cardealership.model.User;
import com.cardealership.model.Vehicle;
import com.cardealership.repository.UserRepository;
import com.cardealership.repository.VehicleRepository;
import com.cardealership.security.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class VehicleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private String adminToken;
    private String userToken;
    private static final String DUMMY_PASS = "Password" + "123";

    @BeforeEach
    void setUp() {
        vehicleRepository.deleteAll();
        userRepository.deleteAll();

        // Create Admin
        User admin = User.builder()
                .email("admin@velodrive.com")
                .password(passwordEncoder.encode(DUMMY_PASS))
                .name("Admin Manager")
                .role("ADMIN")
                .build();
        userRepository.save(admin);
        adminToken = jwtService.generateToken(admin.getEmail());

        // Create User
        User user = User.builder()
                .email("user@velodrive.com")
                .password(passwordEncoder.encode(DUMMY_PASS))
                .name("Standard Client")
                .role("USER")
                .build();
        userRepository.save(user);
        userToken = jwtService.generateToken(user.getEmail());
    }

    @Test
    void shouldCreateVehicleWhenAdmin() throws Exception {
        VehicleRequest request = VehicleRequest.builder()
                .vin("1HGCR2F83JA123456")
                .make("Porsche")
                .model("911 GT3 RS")
                .year(2023)
                .price(225000.0)
                .description("VeloDrive Luxury Collection Entry")
                .imageUrl("https://images.unsplash.com/photo-1503376780353-7e6692767b70")
                .build();

        mockMvc.perform(post("/api/vehicles")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.vin").value("1HGCR2F83JA123456"))
                .andExpect(jsonPath("$.make").value("Porsche"));
    }

    @Test
    void shouldRejectCreateVehicleWhenNotAdmin() throws Exception {
        VehicleRequest request = VehicleRequest.builder()
                .vin("1HGCR2F83JA123456")
                .make("Porsche")
                .model("911 GT3 RS")
                .year(2023)
                .price(225000.0)
                .build();

        mockMvc.perform(post("/api/vehicles")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldRejectCreateVehicleWhenUnauthenticated() throws Exception {
        VehicleRequest request = VehicleRequest.builder()
                .vin("1HGCR2F83JA123456")
                .make("Porsche")
                .model("911 GT3 RS")
                .year(2023)
                .price(225000.0)
                .build();

        mockMvc.perform(post("/api/vehicles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldRejectCreateVehicleWithInvalidData() throws Exception {
        VehicleRequest request = VehicleRequest.builder()
                .vin("123")
                .make("")
                .model("")
                .year(1800)
                .price(-100.0)
                .build();

        mockMvc.perform(post("/api/vehicles")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.vin").exists())
                .andExpect(jsonPath("$.make").exists())
                .andExpect(jsonPath("$.model").exists())
                .andExpect(jsonPath("$.year").exists())
                .andExpect(jsonPath("$.price").exists());
    }

    @Test
    void shouldGetAllVehiclesWhenAuthenticated() throws Exception {
        Vehicle vehicle1 = Vehicle.builder()
                .vin("1HGCR2F83JA123456")
                .make("Porsche")
                .model("911 GT3 RS")
                .year(2023)
                .price(225000.0)
                .build();
        vehicleRepository.save(vehicle1);

        mockMvc.perform(get("/api/vehicles")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].vin").value("1HGCR2F83JA123456"));
    }

    @Test
    void shouldGetVehicleById() throws Exception {
        Vehicle vehicle = Vehicle.builder()
                .vin("1HGCR2F83JA123456")
                .make("Porsche")
                .model("911")
                .year(2023)
                .price(120000.0)
                .build();
        Vehicle savedVehicle = vehicleRepository.save(vehicle);

        mockMvc.perform(get("/api/vehicles/" + savedVehicle.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(savedVehicle.getId()));
    }

    @Test
    void shouldReturn404WhenVehicleNotFound() throws Exception {
        mockMvc.perform(get("/api/vehicles/999")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldUpdateVehicleWhenAdmin() throws Exception {
        Vehicle vehicle = Vehicle.builder()
                .vin("1HGCR2F83JA123456")
                .make("Porsche")
                .model("911")
                .year(2023)
                .price(120000.0)
                .build();
        Vehicle savedVehicle = vehicleRepository.save(vehicle);

        VehicleRequest updateRequest = VehicleRequest.builder()
                .vin("1HGCR2F83JA123456")
                .make("Porsche")
                .model("911 Carrera")
                .year(2024)
                .price(130000.0)
                .build();

        mockMvc.perform(put("/api/vehicles/" + savedVehicle.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.model").value("911 Carrera"));
    }

    @Test
    void shouldRejectUpdateVehicleWhenNotAdmin() throws Exception {
        Vehicle vehicle = Vehicle.builder()
                .vin("1HGCR2F83JA123456")
                .make("Porsche")
                .model("911")
                .year(2023)
                .price(120000.0)
                .build();
        Vehicle savedVehicle = vehicleRepository.save(vehicle);

        VehicleRequest updateRequest = VehicleRequest.builder()
                .vin("1HGCR2F83JA123456")
                .make("Porsche")
                .model("911 Carrera")
                .year(2024)
                .price(130000.0)
                .build();

        mockMvc.perform(put("/api/vehicles/" + savedVehicle.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldDeleteVehicleWhenAdmin() throws Exception {
        Vehicle vehicle = Vehicle.builder()
                .vin("1HGCR2F83JA123456")
                .make("Porsche")
                .model("911")
                .year(2023)
                .price(120000.0)
                .build();
        Vehicle savedVehicle = vehicleRepository.save(vehicle);

        mockMvc.perform(delete("/api/vehicles/" + savedVehicle.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        assertFalse(vehicleRepository.existsById(savedVehicle.getId()));
    }

    @Test
    void shouldRejectDeleteVehicleWhenNotAdmin() throws Exception {
        Vehicle vehicle = Vehicle.builder()
                .vin("1HGCR2F83JA123456")
                .make("Porsche")
                .model("911")
                .year(2023)
                .price(120000.0)
                .build();
        Vehicle savedVehicle = vehicleRepository.save(vehicle);

        mockMvc.perform(delete("/api/vehicles/" + savedVehicle.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken))
                .andExpect(status().isForbidden());

        assertTrue(vehicleRepository.existsById(savedVehicle.getId()));
    }
}
