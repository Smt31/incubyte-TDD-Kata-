import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import DashboardPage from '../pages/DashboardPage'
import { AuthProvider } from '../context/AuthContext'
import { vehicleApi } from '../services/api'

// Mock the API calls
vi.mock('../services/api', () => ({
  default: {
    interceptors: {
      request: { use: vi.fn() }
    }
  },
  authApi: {
    register: vi.fn(),
    login: vi.fn(),
  },
  vehicleApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ data: {} }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  }
}))

describe('DashboardPage Vehicle CRUD & Role Access (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders a grid of fetched luxury vehicles for authenticated users', async () => {
    const mockVehicles = [
      {
        id: 1,
        vin: '1HGCR2F83JA123456',
        make: 'Porsche',
        model: '911 GT3 RS',
        year: 2023,
        price: 225000.0,
        description: 'VeloDrive Luxury Collection',
        imageUrl: '',
      }
    ]
    vehicleApi.getAll.mockResolvedValueOnce({ data: mockVehicles })

    localStorage.setItem('user', JSON.stringify({ name: 'Client User', role: 'USER', email: 'client@velodrive.com' }))
    localStorage.setItem('token', 'mock-user-token')

    render(
      <MemoryRouter>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    )

    // Wait for the api call to finish and render the vehicle details
    await waitFor(() => {
      expect(vehicleApi.getAll).toHaveBeenCalledTimes(1)
    })

    expect(screen.getByText(/Porsche 911 GT3 RS/i)).toBeInTheDocument()
    expect(screen.getByText(/2023/i)).toBeInTheDocument()
    expect(screen.getByText(/\$225,000/i)).toBeInTheDocument()

    // Since role is USER, ADMIN operations like "Add Vehicle" must not be present
    expect(screen.queryByRole('button', { name: /Add Vehicle/i })).not.toBeInTheDocument()
  })

  it('displays management actions and allows vehicle creation for ADMIN users', async () => {
    vehicleApi.getAll.mockResolvedValueOnce({ data: [] })

    localStorage.setItem('user', JSON.stringify({ name: 'Admin Manager', role: 'ADMIN', email: 'admin@velodrive.com' }))
    localStorage.setItem('token', 'mock-admin-token')

    render(
      <MemoryRouter>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(vehicleApi.getAll).toHaveBeenCalled()
    })

    // "Add Vehicle" button should be visible for ADMIN
    const addBtn = screen.getByRole('button', { name: /Add Vehicle/i })
    expect(addBtn).toBeInTheDocument()

    // Click to open Modal
    fireEvent.click(addBtn)

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/VIN \(17 characters\)/i), { target: { value: '1HGCR2F83JA111111' } })
    fireEvent.change(screen.getByPlaceholderText(/Make/i), { target: { value: 'Lamborghini' } })
    fireEvent.change(screen.getByPlaceholderText(/Model/i), { target: { value: 'Aventador' } })
    fireEvent.change(screen.getByPlaceholderText(/Year/i), { target: { value: '2022' } })
    fireEvent.change(screen.getByPlaceholderText(/Price/i), { target: { value: '380000' } })

    const mockCreated = {
      id: 2,
      vin: '1HGCR2F83JA111111',
      make: 'Lamborghini',
      model: 'Aventador',
      year: 2022,
      price: 380000.0,
    }
    vehicleApi.create.mockResolvedValueOnce({ data: mockCreated })

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /Save Vehicle/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(vehicleApi.create).toHaveBeenCalledWith({
        vin: '1HGCR2F83JA111111',
        make: 'Lamborghini',
        model: 'Aventador',
        year: 2022,
        price: 380000.0,
        description: '',
        imageUrl: '',
      })
    })
  })

  it('allows ADMIN to delete a vehicle from the fleet list', async () => {
    const mockVehicles = [
      {
        id: 1,
        vin: '1HGCR2F83JA123456',
        make: 'Porsche',
        model: '911',
        year: 2023,
        price: 120000.0,
      }
    ]
    vehicleApi.getAll.mockResolvedValueOnce({ data: mockVehicles })
    vehicleApi.delete.mockResolvedValueOnce({ data: {} })

    localStorage.setItem('user', JSON.stringify({ name: 'Admin Manager', role: 'ADMIN', email: 'admin@velodrive.com' }))
    localStorage.setItem('token', 'mock-admin-token')

    render(
      <MemoryRouter>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Porsche 911/i)).toBeInTheDocument()
    })

    // Click delete
    const deleteBtn = screen.getByRole('button', { name: /Delete/i })
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(vehicleApi.delete).toHaveBeenCalledWith(1)
    })
  })
})
