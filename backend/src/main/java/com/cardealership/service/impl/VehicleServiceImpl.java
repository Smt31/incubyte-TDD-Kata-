package com.cardealership.service.impl;

import com.cardealership.dto.VehicleRequest;
import com.cardealership.dto.VehicleResponse;
import com.cardealership.exception.VehicleAlreadyExistsException;
import com.cardealership.exception.VehicleNotFoundException;
import com.cardealership.model.Vehicle;
import com.cardealership.repository.VehicleRepository;
import com.cardealership.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VehicleServiceImpl implements VehicleService {

    private final VehicleRepository vehicleRepository;

    @Override
    public VehicleResponse createVehicle(VehicleRequest request) {
        if (vehicleRepository.existsByVin(request.getVin())) {
            throw new VehicleAlreadyExistsException("Vehicle with this VIN already exists");
        }

        Vehicle vehicle = Vehicle.builder()
                .vin(request.getVin())
                .make(request.getMake())
                .model(request.getModel())
                .year(request.getYear())
                .price(request.getPrice())
                .description(request.getDescription())
                .imageUrl(request.getImageUrl())
                .category(request.getCategory())
                .quantity(request.getQuantity())
                .build();

        Vehicle saved = vehicleRepository.save(vehicle);
        return mapToResponse(saved);
    }

    @Override
    public List<VehicleResponse> getAllVehicles() {
        return vehicleRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public VehicleResponse getVehicleById(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new VehicleNotFoundException("Vehicle not found with ID: " + id));
        return mapToResponse(vehicle);
    }

    @Override
    public VehicleResponse updateVehicle(Long id, VehicleRequest request) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new VehicleNotFoundException("Vehicle not found with ID: " + id));

        // Check if VIN changed and is already taken by another vehicle
        if (!vehicle.getVin().equals(request.getVin()) && vehicleRepository.existsByVin(request.getVin())) {
            throw new VehicleAlreadyExistsException("Vehicle with this VIN already exists");
        }

        vehicle.setVin(request.getVin());
        vehicle.setMake(request.getMake());
        vehicle.setModel(request.getModel());
        vehicle.setYear(request.getYear());
        vehicle.setPrice(request.getPrice());
        vehicle.setDescription(request.getDescription());
        vehicle.setImageUrl(request.getImageUrl());
        vehicle.setCategory(request.getCategory());
        vehicle.setQuantity(request.getQuantity());

        Vehicle updated = vehicleRepository.save(vehicle);
        return mapToResponse(updated);
    }

    @Override
    public void deleteVehicle(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new VehicleNotFoundException("Vehicle not found with ID: " + id));
        vehicleRepository.delete(vehicle);
    }

    private VehicleResponse mapToResponse(Vehicle vehicle) {
        return VehicleResponse.builder()
                .id(vehicle.getId())
                .vin(vehicle.getVin())
                .make(vehicle.getMake())
                .model(vehicle.getModel())
                .year(vehicle.getYear())
                .price(vehicle.getPrice())
                .description(vehicle.getDescription())
                .imageUrl(vehicle.getImageUrl())
                .category(vehicle.getCategory())
                .quantity(vehicle.getQuantity())
                .build();
    }
}
