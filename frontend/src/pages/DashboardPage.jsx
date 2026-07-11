import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { vehicleApi } from '../services/api'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // State
  const [vehicles, setVehicles] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState({
    vin: '',
    make: '',
    model: '',
    year: '',
    price: '',
    description: '',
    imageUrl: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch fleet
  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      const res = await vehicleApi.getAll()
      setVehicles(res.data || [])
    } catch (err) {
      console.error('Failed to fetch vehicles', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Input change
  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  // Create vehicle
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Front-end validation
    if (!form.vin || form.vin.trim().length < 4) {
      setError('VIN must be at least 4 characters long')
      return
    }
    if (!form.make.trim()) {
      setError('Make is required')
      return
    }
    if (!form.model.trim()) {
      setError('Model is required')
      return
    }
    const yearVal = parseInt(form.year)
    if (isNaN(yearVal) || yearVal < 1886) {
      setError('Enter a valid year (1886 or later)')
      return
    }
    const priceVal = parseFloat(form.price)
    if (isNaN(priceVal) || priceVal <= 0) {
      setError('Price must be greater than zero')
      return
    }

    try {
      const payload = {
        vin: form.vin.trim(),
        make: form.make.trim(),
        model: form.model.trim(),
        year: yearVal,
        price: priceVal,
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
      }

      const res = await vehicleApi.create(payload)
      setVehicles([...vehicles, res.data])
      setShowAddModal(false)
      setForm({
        vin: '',
        make: '',
        model: '',
        year: '',
        price: '',
        description: '',
        imageUrl: '',
      })
    } catch (err) {
      const serverMsg = err.response?.data?.message || 'Failed to add vehicle'
      setError(serverMsg)
    }
  }

  // Delete vehicle
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this vehicle from the collection?')) {
      try {
        await vehicleApi.delete(id)
        setVehicles(vehicles.filter((v) => v.id !== id))
      } catch (err) {
        alert('Failed to delete vehicle')
      }
    }
  }

  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="portal-layout">
      {/* Navbar */}
      <nav className="portal-nav">
        <div className="portal-brand">VeloDrive</div>
        <div className="portal-user-info">
          <span className="portal-role-tag">{user?.role}</span>
          <span style={{ fontSize: '13px', color: '#a1a1aa' }}>
            User: <strong style={{ color: '#ffffff' }}>{user?.name}</strong>
          </span>
          <button className="btn-portal-signout" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </nav>

      {/* Main Body */}
      <main className="portal-content">
        <div className="portal-header-row">
          <div className="portal-welcome">
            <h1 className="portal-welcome-title">Welcome, {user?.name}</h1>
            <p className="portal-welcome-desc">Private collection dashboard & precision inventory tracking.</p>
          </div>
          {isAdmin && (
            <button className="btn-add-vehicle" onClick={() => setShowAddModal(true)}>
              + Add Vehicle
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="portal-grid">
          <div className="portal-card">
            <div className="portal-card-icon">🚘</div>
            <div className="portal-card-title">Active Fleet</div>
            <div className="portal-card-value">{vehicles.length}</div>
          </div>
          <div className="portal-card">
            <div className="portal-card-icon">⏱️</div>
            <div className="portal-card-title">Pending Delivery</div>
            <div className="portal-card-value">0</div>
          </div>
          <div className="portal-card">
            <div className="portal-card-icon">🔑</div>
            <div className="portal-card-title">Role Clearance</div>
            <div className="portal-card-value" style={{ fontSize: '16px', color: '#dfba73' }}>
              {user?.role}
            </div>
          </div>
        </div>

        {/* Fleet Listings */}
        <div className="fleet-section">
          <h2 className="fleet-title">Available Luxury Inventory</h2>

          {loading ? (
            <div className="fleet-loading">Calibrating telemetry systems...</div>
          ) : vehicles.length === 0 ? (
            <div className="fleet-empty-state">
              <p>No high-performance vehicles in the database catalog.</p>
              {isAdmin && <p style={{ fontSize: '14px', color: '#dfba73', marginTop: '8px' }}>Use the "Add Vehicle" system above to catalog the first supercar.</p>}
            </div>
          ) : (
            <div className="fleet-grid">
              {vehicles.map((v) => (
                <div className="fleet-card" key={v.id}>
                  <div className="fleet-card-img-container">
                    <img
                      src={v.imageUrl || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=600'}
                      alt={`${v.make} ${v.model}`}
                      className="fleet-card-img"
                    />
                  </div>
                  <div className="fleet-card-details">
                    <div className="fleet-card-header">
                      <span className="fleet-card-year">{v.year}</span>
                      <span className="fleet-card-price">
                        ${v.price ? v.price.toLocaleString('en-US') : '0'}
                      </span>
                    </div>
                    <h3 className="fleet-card-title">{v.make} {v.model}</h3>
                    <p className="fleet-card-desc">{v.description || 'No description cataloged for this model.'}</p>
                    <div className="fleet-card-meta">
                      <span>VIN: <code>{v.vin}</code></span>
                    </div>
                    {isAdmin && (
                      <div className="fleet-card-actions">
                        <button className="btn-fleet-delete" onClick={() => handleDelete(v.id)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Catalog New Luxury Vehicle</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              {error && <div className="auth-error-box">{error}</div>}

              <div className="form-group-row">
                <div className="form-input-group">
                  <label>VIN (Vehicle Identification Number)</label>
                  <input
                    type="text"
                    name="vin"
                    placeholder="VIN (min 4 characters)"
                    value={form.vin}
                    onChange={handleInputChange}
                    maxLength={30}
                    required
                  />
                </div>
              </div>

              <div className="form-group-row-2col">
                <div className="form-input-group">
                  <label>Make / Brand</label>
                  <input
                    type="text"
                    name="make"
                    placeholder="Make"
                    value={form.make}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-input-group">
                  <label>Model</label>
                  <input
                    type="text"
                    name="model"
                    placeholder="Model"
                    value={form.model}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group-row-2col">
                <div className="form-input-group">
                  <label>Year</label>
                  <input
                    type="number"
                    name="year"
                    placeholder="Year"
                    value={form.year}
                    onChange={handleInputChange}
                    min={1886}
                    required
                  />
                </div>
                <div className="form-input-group">
                  <label>Price (USD)</label>
                  <input
                    type="number"
                    name="price"
                    placeholder="Price"
                    value={form.price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0.01"
                    required
                  />
                </div>
              </div>

              <div className="form-input-group">
                <label>Image URL</label>
                <input
                  type="url"
                  name="imageUrl"
                  placeholder="https://images.unsplash.com/... (optional)"
                  value={form.imageUrl}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-input-group">
                <label>Description</label>
                <textarea
                  name="description"
                  placeholder="Enter vehicle specifics, condition, and options..."
                  value={form.description}
                  onChange={handleInputChange}
                  rows={3}
                ></textarea>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
