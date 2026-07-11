package com.cardealership.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehicleResponse {
    private Long id;
    private String vin;
    private String make;
    private String model;
    private Integer year;
    private Double price;
    private String description;
    private String imageUrl;
    private String category;
    private Integer quantity;
}
