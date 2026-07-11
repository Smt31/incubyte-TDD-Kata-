package com.cardealership.repository;

import com.cardealership.model.Vehicle;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
public class VehicleRepositoryTest {

    @Autowired
    private VehicleRepository vehicleRepository;

    @Test
    void shouldSaveAndFindVehicle() {
        Vehicle vehicle = Vehicle.builder()
                .vin("1HGCR2F83JA123456")
                .make("Porsche")
                .model("911 GT3")
                .year(2023)
                .price(180000.0)
                .description("Luxury vehicle")
                .build();

        Vehicle saved = vehicleRepository.save(vehicle);
        assertNotNull(saved.getId());

        Vehicle found = vehicleRepository.findById(saved.getId()).orElse(null);
        assertNotNull(found);
        assertEquals("1HGCR2F83JA123456", found.getVin());
    }
}
