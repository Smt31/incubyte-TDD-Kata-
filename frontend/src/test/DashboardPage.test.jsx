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
    purchase: vi.fn().mockResolvedValue({ data: {} }),
    restock: vi.fn().mockResolvedValue({ data: {} }),
  }
}))

describe('DashboardPage Vehicle CRUD & Role Access (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
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
        category: 'Luxury',
        quantity: 5,
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
    fireEvent.change(screen.getByPlaceholderText(/VIN/i), { target: { value: '1HGCR2F83JA111111' } })
    fireEvent.change(screen.getByPlaceholderText(/Make/i), { target: { value: 'Lamborghini' } })
    fireEvent.change(screen.getByPlaceholderText(/Model/i), { target: { value: 'Aventador' } })
    fireEvent.change(screen.getByPlaceholderText(/Year/i), { target: { value: '2022' } })
    fireEvent.change(screen.getByPlaceholderText(/Price/i), { target: { value: '380000' } })
    fireEvent.change(screen.getByPlaceholderText(/SUV, Sedan, Coupe/i), { target: { value: 'Luxury' } })
    fireEvent.change(screen.getByPlaceholderText(/Initial Stock/i), { target: { value: '5' } })

    const mockCreated = {
      id: 2,
      vin: '1HGCR2F83JA111111',
      make: 'Lamborghini',
      model: 'Aventador',
      year: 2022,
      price: 380000.0,
      category: 'Luxury',
      quantity: 5,
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
        category: 'Luxury',
        quantity: 5,
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
        category: 'Luxury',
        quantity: 5,
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

  it('allows normal USER to purchase a vehicle and decreases stock', async () => {
    const mockVehicle = {
      id: 1,
      vin: '1HGCR2F83JA123456',
      make: 'Porsche',
      model: '911',
      year: 2023,
      price: 120000.0,
      category: 'Luxury',
      quantity: 5,
    }
    vehicleApi.getAll.mockResolvedValueOnce({ data: [mockVehicle] })

    const mockPurchased = { ...mockVehicle, quantity: 4 }
    vehicleApi.purchase.mockResolvedValueOnce({ data: mockPurchased })

    localStorage.setItem('user', JSON.stringify({ name: 'Client User', role: 'USER', email: 'client@velodrive.com' }))
    localStorage.setItem('token', 'mock-user-token')

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

    // Purchase button should be active and display stock
    expect(screen.getByText(/5 units/i)).toBeInTheDocument()
    const purchaseBtn = screen.getByRole('button', { name: /Purchase/i })
    expect(purchaseBtn).toBeEnabled()

    // Perform purchase
    fireEvent.click(purchaseBtn)

    await waitFor(() => {
      expect(vehicleApi.purchase).toHaveBeenCalledWith(1)
      expect(screen.getByText(/4 units/i)).toBeInTheDocument()
    })
  })

  it('disables Purchase button when stock is 0', async () => {
    const mockVehicle = {
      id: 1,
      vin: '1HGCR2F83JA123456',
      make: 'Porsche',
      model: '911',
      year: 2023,
      price: 120000.0,
      category: 'Luxury',
      quantity: 0,
    }
    vehicleApi.getAll.mockResolvedValueOnce({ data: [mockVehicle] })

    localStorage.setItem('user', JSON.stringify({ name: 'Client User', role: 'USER', email: 'client@velodrive.com' }))
    localStorage.setItem('token', 'mock-user-token')

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

    expect(screen.getAllByText(/Out of Stock/i).length).toBeGreaterThan(0)
    const purchaseBtn = screen.getByRole('button', { name: /Out of Stock/i })
    expect(purchaseBtn).toBeDisabled()
  })

  it('allows ADMIN to restock a vehicle and increases stock', async () => {
    const mockVehicle = {
      id: 1,
      vin: '1HGCR2F83JA123456',
      make: 'Porsche',
      model: '911',
      year: 2023,
      price: 120000.0,
      category: 'Luxury',
      quantity: 5,
    }
    vehicleApi.getAll.mockResolvedValueOnce({ data: [mockVehicle] })

    const mockRestocked = { ...mockVehicle, quantity: 15 }
    vehicleApi.restock.mockResolvedValueOnce({ data: mockRestocked })

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

    // Restock control should be present for admin
    const restockInput = screen.getByPlaceholderText(/Qty/i)
    const restockBtn = screen.getByRole('button', { name: /Restock/i })

    expect(restockInput).toBeInTheDocument()
    expect(restockBtn).toBeInTheDocument()

    // Fill restock quantity
    fireEvent.change(restockInput, { target: { value: '10' } })
    fireEvent.click(restockBtn)

    await waitFor(() => {
      expect(vehicleApi.restock).toHaveBeenCalledWith(1, 10)
      expect(screen.getByText(/15 units/i)).toBeInTheDocument()
    })
  })

  it('allows ADMIN to edit a vehicle and updates the list', async () => {
    const mockVehicle = {
      id: 1,
      vin: '1HGCR2F83JA123456',
      make: 'Porsche',
      model: '911',
      year: 2023,
      price: 120000.0,
      description: 'VeloDrive Luxury Collection',
      imageUrl: '',
      category: 'Luxury',
      quantity: 5,
    }
    vehicleApi.getAll.mockResolvedValueOnce({ data: [mockVehicle] })

    const mockUpdated = { ...mockVehicle, model: '911 Turbo S', price: 210000.0 }
    vehicleApi.update.mockResolvedValueOnce({ data: mockUpdated })

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

    // Edit button should be visible for ADMIN
    const editBtn = screen.getByRole('button', { name: /Edit/i })
    expect(editBtn).toBeInTheDocument()

    // Click to open Modal in edit mode
    fireEvent.click(editBtn)

    // Form fields should be pre-filled
    expect(screen.getByPlaceholderText(/VIN/i).value).toBe('1HGCR2F83JA123456')
    expect(screen.getByPlaceholderText(/Make/i).value).toBe('Porsche')
    expect(screen.getByPlaceholderText(/Model/i).value).toBe('911')

    // Change model and price
    fireEvent.change(screen.getByPlaceholderText(/Model/i), { target: { value: '911 Turbo S' } })
    fireEvent.change(screen.getByPlaceholderText(/Price/i), { target: { value: '210000' } })

    // Click save changes
    const saveBtn = screen.getByRole('button', { name: /Save Changes/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(vehicleApi.update).toHaveBeenCalledWith(1, {
        vin: '1HGCR2F83JA123456',
        make: 'Porsche',
        model: '911 Turbo S',
        year: 2023,
        price: 210000.0,
        description: 'VeloDrive Luxury Collection',
        imageUrl: '',
        category: 'Luxury',
        quantity: 5,
      })
      expect(screen.getByText(/Porsche 911 Turbo S/i)).toBeInTheDocument()
    })
  })

  it('filters vehicles in real-time by search query', async () => {
    const mockVehicles = [
      {
        id: 1,
        vin: 'VIN1',
        make: 'Porsche',
        model: '911',
        year: 2023,
        price: 120000.0,
        category: 'Sports',
        quantity: 2,
      },
      {
        id: 2,
        vin: 'VIN2',
        make: 'Ferrari',
        model: 'Roma',
        year: 2022,
        price: 240000.0,
        category: 'Supercar',
        quantity: 1,
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

    await waitFor(() => {
      expect(screen.getByText(/Porsche 911/i)).toBeInTheDocument()
      expect(screen.getByText(/Ferrari Roma/i)).toBeInTheDocument()
    })

    // Type 'Ferrari' in search input
    const searchInput = screen.getByPlaceholderText(/Search by make, model, category, or VIN/i)
    fireEvent.change(searchInput, { target: { value: 'Ferrari' } })

    // Only Ferrari should remain
    expect(screen.getByText(/Ferrari Roma/i)).toBeInTheDocument()
    expect(screen.queryByText(/Porsche 911/i)).not.toBeInTheDocument()
  })

  it('filters vehicles by maximum price on apply click', async () => {
    const mockVehicles = [
      {
        id: 1,
        vin: 'VIN1',
        make: 'Porsche',
        model: '911',
        year: 2023,
        price: 120000.0,
        category: 'Sports',
        quantity: 2,
      },
      {
        id: 2,
        vin: 'VIN2',
        make: 'Ferrari',
        model: 'Roma',
        year: 2022,
        price: 240000.0,
        category: 'Supercar',
        quantity: 1,
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

    await waitFor(() => {
      expect(screen.getByText(/Porsche 911/i)).toBeInTheDocument()
      expect(screen.getByText(/Ferrari Roma/i)).toBeInTheDocument()
    })

    // Type '150000' in max price input
    const priceInput = screen.getByPlaceholderText(/Max Price/i)
    fireEvent.change(priceInput, { target: { value: '150000' } })

    // Ferrari (240k) should still be visible because price filter is not applied yet
    expect(screen.getByText(/Ferrari Roma/i)).toBeInTheDocument()

    // Click apply button
    const applyBtn = screen.getByTitle(/Apply price filter/i)
    fireEvent.click(applyBtn)

    // Only Porsche (120k) should remain, Ferrari (240k) should be hidden
    await waitFor(() => {
      expect(screen.queryByText(/Ferrari Roma/i)).not.toBeInTheDocument()
      expect(screen.getByText(/Porsche 911/i)).toBeInTheDocument()
    })
  })

  it('filters vehicles by minimum price on apply click', async () => {
    const mockVehicles = [
      {
        id: 1,
        vin: 'VIN1',
        make: 'Porsche',
        model: '911',
        year: 2023,
        price: 120000.0,
        category: 'Sports',
        quantity: 2,
      },
      {
        id: 2,
        vin: 'VIN2',
        make: 'Ferrari',
        model: 'Roma',
        year: 2022,
        price: 240000.0,
        category: 'Supercar',
        quantity: 1,
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

    await waitFor(() => {
      expect(screen.getByText(/Porsche 911/i)).toBeInTheDocument()
      expect(screen.getByText(/Ferrari Roma/i)).toBeInTheDocument()
    })

    // Type '150000' in min price input
    const minPriceInput = screen.getByPlaceholderText(/Min Price/i)
    fireEvent.change(minPriceInput, { target: { value: '150000' } })

    // Click apply button
    const applyBtn = screen.getByTitle(/Apply price filter/i)
    fireEvent.click(applyBtn)

    // Only Ferrari (240k) should remain, Porsche (120k) should be hidden
    await waitFor(() => {
      expect(screen.queryByText(/Porsche 911/i)).not.toBeInTheDocument()
      expect(screen.getByText(/Ferrari Roma/i)).toBeInTheDocument()
    })
  })

  it('sorts vehicles by price and year', async () => {
    const mockVehicles = [
      {
        id: 1,
        vin: 'VIN1',
        make: 'Porsche',
        model: '911',
        year: 2023,
        price: 120000.0,
        category: 'Sports',
        quantity: 2,
      },
      {
        id: 2,
        vin: 'VIN2',
        make: 'Ferrari',
        model: 'Roma',
        year: 2022,
        price: 240000.0,
        category: 'Supercar',
        quantity: 1,
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

    await waitFor(() => {
      expect(screen.getByText(/Porsche 911/i)).toBeInTheDocument()
    })

    // Find the Sort select dropdown
    const sortSelect = screen.getByRole('combobox')
    expect(sortSelect).toBeInTheDocument()

    // Select Price: High to Low
    fireEvent.change(sortSelect, { target: { value: 'price-desc' } })
    
    // Check that Ferrari is rendered before Porsche in the DOM
    const cards = screen.getAllByClassName('fleet-card')
    expect(cards[0]).toHaveTextContent(/Ferrari Roma/i)
    expect(cards[1]).toHaveTextContent(/Porsche 911/i)
  })

  it('resets all filters when clicking the Reset button', async () => {
    const mockVehicles = [
      {
        id: 1,
        vin: 'VIN1',
        make: 'Porsche',
        model: '911',
        year: 2023,
        price: 120000.0,
        category: 'Sports',
        quantity: 2,
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

    await waitFor(() => {
      expect(screen.getByText(/Porsche 911/i)).toBeInTheDocument()
    })

    // Type query and price limits
    fireEvent.change(screen.getByPlaceholderText(/Search by make/i), { target: { value: 'Lamborghini' } })
    fireEvent.change(screen.getByPlaceholderText(/Min Price/i), { target: { value: '50000' } })
    fireEvent.change(screen.getByPlaceholderText(/Max Price/i), { target: { value: '150000' } })
    
    // Apply prices
    fireEvent.click(screen.getByTitle(/Apply price filter/i))

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'price-asc' } })

    // Verify it is filtered out (no results)
    expect(screen.queryByText(/Porsche 911/i)).not.toBeInTheDocument()

    // Click Reset
    const resetBtn = screen.getByRole('button', { name: /Reset/i })
    fireEvent.click(resetBtn)

    // Verify Porsche 911 is back
    expect(screen.getByText(/Porsche 911/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Search by make/i).value).toBe('')
    expect(screen.getByPlaceholderText(/Min Price/i).value).toBe('')
    expect(screen.getByPlaceholderText(/Max Price/i).value).toBe('')
    expect(screen.getByRole('combobox').value).toBe('default')
  })
})
