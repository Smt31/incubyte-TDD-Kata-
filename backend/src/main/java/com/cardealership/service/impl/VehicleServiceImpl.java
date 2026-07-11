package com.cardealership.service.impl;

import com.cardealership.dto.VehicleRequest;
import com.cardealership.dto.VehicleResponse;
import com.cardealership.service.VehicleService;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class VehicleServiceImpl implements VehicleService {

    @Override
    public VehicleResponse createVehicle(VehicleRequest request) {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @Override
    public List<VehicleResponse> getAllVehicles() {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @Override
    public VehicleResponse getVehicleById(Long id) {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @Override
    public VehicleResponse updateVehicle(Long id, VehicleRequest request) {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @Override
    public void deleteVehicle(Long id) {
        throw new UnsupportedOperationException("Not implemented yet");
    }
}
