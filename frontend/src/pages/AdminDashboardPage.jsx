import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/admin.css";
import {
  cancelBooking,
  createBus,
  createRoute,
  deleteBus,
  deleteRoute,
  getAdminReports,
  getBuses,
  getBookings,
  getRoutes,
  getUsers,
  updateBus,
  updateRoute,
} from "../services/adminApi";

const blankBus = { busNumber: "", busName: "", busType: "", totalSeats: "" };
const blankRoute = {
  source: "",
  destination: "",
  travelDate: "",
  departureTime: "",
  arrivalTime: "",
  fare: "",
  busId: "",
};
const blankUser = { fullName: "", email: "", phone: "", role: "USER", blocked: false };

function formatDateTime(value) {
  if (!value) return "";
  return String(value).slice(0, 16);
}

function formatRegDate(value) {
  if (!value) return "";
  const s = String(value);
  if (s.includes("T")) return s.split("T")[0];
  try {
    return new Date(s).toLocaleDateString();
  } catch (e) {
    return s.slice(0, 10);
  }
}

function formatTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingBusId, setEditingBusId] = useState(null);
  const [editingRouteId, setEditingRouteId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [busForm, setBusForm] = useState(blankBus);
  const [routeForm, setRouteForm] = useState(blankRoute);
  const [userForm, setUserForm] = useState(blankUser);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [busData, routeData, bookingData, userData, reportData] = await Promise.all([
        getBuses(),
        getRoutes(),
        getBookings(),
        getUsers(),
        getAdminReports(),
      ]);
      setBuses(busData);
      setRoutes(routeData);
      setBookings(bookingData);
      setUsers(userData);
      setReports(reportData);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Unable to load admin data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  function resetForms(section) {
    if (section === "buses") {
      setEditingBusId(null);
      setBusForm(blankBus);
    }
    if (section === "routes") {
      setEditingRouteId(null);
      setRouteForm(blankRoute);
    }
    if (section === "users") {
      setEditingUserId(null);
      setUserForm(blankUser);
    }
  }

  async function saveBus(event) {
    event.preventDefault();
    setMessage("");
    const payload = { ...busForm, totalSeats: Number(busForm.totalSeats) };
    if (!payload.busNumber || !payload.busName || !payload.busType) return setError("Fill all bus fields.");
    try {
      if (editingBusId) {
        await updateBus(editingBusId, payload);
        setMessage("Bus updated.");
      } else {
        await createBus(payload);
        setMessage("Bus added.");
      }
      setBusForm(blankBus);
      setEditingBusId(null);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Unable to save bus");
    }
  }

  async function saveRoute(event) {
    event.preventDefault();
    setMessage("");
    const payload = {
      source: routeForm.source,
      destination: routeForm.destination,
      travelDate: routeForm.travelDate || null,
      departureTime: routeForm.departureTime || null,
      arrivalTime: routeForm.arrivalTime || null,
      fare: Number(routeForm.fare),
      bus: routeForm.busId ? { busId: Number(routeForm.busId) } : null,
    };
    if (!payload.source || !payload.destination) return setError("Fill source and destination.");
    try {
      if (editingRouteId) {
        await updateRoute(editingRouteId, payload);
        setMessage("Route updated.");
      } else {
        await createRoute(payload);
        setMessage("Route added.");
      }
      setRouteForm(blankRoute);
      setEditingRouteId(null);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Unable to save route");
    }
  }

  async function saveUser(event) {
    event.preventDefault();
    setMessage("");
    if (!editingUserId) return setError("Select a user to edit first.");
    if (!userForm.fullName || !userForm.email) return setError("Fill user name and email.");
    try {
      await updateUser(editingUserId, userForm);
      setMessage("User updated.");
      setUserForm(blankUser);
      setEditingUserId(null);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Unable to save user");
    }
  }

  function editBus(bus) {
    setEditingBusId(bus.busId);
    setBusForm({
      busNumber: bus.busNumber || "",
      busName: bus.busName || "",
      busType: bus.busType || "",
      totalSeats: bus.totalSeats ?? "",
    });
  }

  function editRoute(route) {
    setEditingRouteId(route.routeId);
    setRouteForm({
      source: route.source || "",
      destination: route.destination || "",
      travelDate: route.travelDate || "",
      fare: route.fare ?? "",
      arrivalTime: formatTime(route.arrivalTime),
      departureTime: formatTime(route.departureTime),
      busId: route.bus?.busId || "",
    });
  }

  function editUser(account) {
    setEditingUserId(account.userId);
    setUserForm({
      fullName: account.fullName || "",
      email: account.email || "",
      phone: account.phone || "",
      role: account.role || "USER",
      blocked: Boolean(account.blocked),
    });
  }

  async function handleCancelBooking(bookingId) {
    try {
      await cancelBooking(bookingId);
      setMessage("Booking cancelled.");
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Unable to cancel booking");
    }
  }

  async function handleDeleteBus(busId) {
    await deleteBus(busId);
    setMessage("Bus deleted.");
    await loadData();
  }

  async function handleDeleteRoute(routeId) {
    await deleteRoute(routeId);
    setMessage("Route deleted.");
    await loadData();
  }

  async function handleDeleteUser(userId) {
    await deleteUser(userId);
    setMessage("User deleted.");
    await loadData();
  }

  async function handleToggleBlock(account) {
    if (account.blocked) {
      await unblockUser(account.userId);
      setMessage("User unblocked.");
    } else {
      await blockUser(account.userId);
      setMessage("User blocked.");
    }
    await loadData();
  }

  return (
    <main className="dash-shell admin-shell">
      <div className="admin-toast-area" aria-live="polite" aria-atomic="true">
        {error ? (
          <div className="admin-alert admin-alert-error admin-toast">
            <div className="toast-content">{error}</div>
            <button className="toast-close" onClick={() => setError("")} aria-label="Dismiss error">×</button>
          </div>
        ) : null}

        {message ? (
          <div className="admin-alert admin-alert-success admin-toast">
            <div className="toast-content">{message}</div>
            <button className="toast-close" onClick={() => setMessage("")} aria-label="Dismiss">×</button>
            <div className="toast-progress" aria-hidden="true" />
          </div>
        ) : null}
      </div>

      <section className="dash-card admin-dashboard-card admin-grid-shell">
        <div className="admin-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p>Welcome {user?.name || "Admin"}. This route is ADMIN-only.</p>
            <p>
              <strong>Role:</strong> {user?.role || "ADMIN"}
            </p>
          </div>
          <div className="admin-actions-row">
            <button className="ghost-btn" onClick={loadData} disabled={loading}>
              Refresh
            </button>
            <button className="logout-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        <section className="admin-panel admin-panel-full">
          <div className="panel-card">
            <h2>Bus Management</h2>
            <form className="admin-form" onSubmit={saveBus}>
              <input placeholder="Bus number" value={busForm.busNumber} onChange={(event) => setBusForm({ ...busForm, busNumber: event.target.value })} />
              <input placeholder="Bus name" value={busForm.busName} onChange={(event) => setBusForm({ ...busForm, busName: event.target.value })} />
              <select value={busForm.busType} onChange={(event) => setBusForm({ ...busForm, busType: event.target.value })}>
                <option value="">Select bus type</option>
                <option value="SLEEPER_AC">Sleeper AC</option>
                <option value="SLEEPER_NON_AC">Sleeper Non AC</option>
                <option value="NORMAL_AC">Normal AC</option>
                <option value="NORMAL_NON_AC">Normal Non AC</option>
              </select>
              <input type="number" min="1" placeholder="Seat capacity" value={busForm.totalSeats} onChange={(event) => setBusForm({ ...busForm, totalSeats: event.target.value })} />
              <div className="form-row">
                <button type="submit" className="primary-btn btn">{editingBusId ? "Update Bus" : "Add Bus"}</button>
                <button type="button" className="ghost-btn btn" onClick={() => resetForms("buses")}>Clear</button>
              </div>
            </form>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Number</th><th>Name</th><th>Type</th><th>Seats</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {buses.map((bus) => (
                    <tr key={bus.busId}>
                      <td>{bus.busNumber}</td>
                      <td>{bus.busName}</td>
                      <td>{bus.busType}</td>
                      <td>{bus.totalSeats}</td>
                      <td className="table-actions">
                        <button type="button" className="secondary-btn btn" onClick={() => editBus(bus)}>Edit</button>
                        <button type="button" className="danger-btn btn small" onClick={() => handleDeleteBus(bus.busId)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel-card">
            <h2>Route & Schedule Management</h2>
            <form className="admin-form admin-form-grid" onSubmit={saveRoute}>
              <input
                placeholder="Source"
                value={routeForm.source}
                onChange={(event) => setRouteForm({ ...routeForm, source: event.target.value })}
              />
              <input
                placeholder="Destination"
                value={routeForm.destination}
                onChange={(event) => setRouteForm({ ...routeForm, destination: event.target.value })}
              />
              <input
                type="date"
                value={routeForm.travelDate}
                onChange={(event) => setRouteForm({ ...routeForm, travelDate: event.target.value })}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Fare"
                value={routeForm.fare}
                onChange={(event) => setRouteForm({ ...routeForm, fare: event.target.value })}
              />
              <input
                type="time"
                value={routeForm.departureTime}
                onChange={(event) => setRouteForm({ ...routeForm, departureTime: event.target.value })}
              />
              <input
                type="time"
                value={routeForm.arrivalTime}
                onChange={(event) => setRouteForm({ ...routeForm, arrivalTime: event.target.value })}
              />
              <select
                value={routeForm.busId}
                onChange={(event) => setRouteForm({ ...routeForm, busId: event.target.value })}
              >
                <option value="">Assign bus</option>
                {buses.map((bus) => (
                  <option key={bus.busId} value={bus.busId}>
                    {bus.busName} ({bus.busNumber})
                  </option>
                ))}
              </select>
              <div className="form-row full-row">
                <button type="submit">{editingRouteId ? "Update Route" : "Add Route"}</button>
                <button type="button" className="ghost-btn btn" onClick={() => resetForms("routes")}>
                  Clear
                </button>
              </div>
            </form>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Route</th><th>Date</th><th>Departure</th><th>Arrival</th><th>Fare</th><th>Bus</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {routes.map((route) => (
                    <tr key={route.routeId}>
                      <td>{route.source} → {route.destination}</td>
                      <td>{route.travelDate}</td>
                      <td>{formatTime(route.departureTime)}</td>
                      <td>{formatTime(route.arrivalTime)}</td>
                      <td>{route.fare}</td>
                      <td>{route.bus?.busName || "-"}</td>
                      <td className="table-actions">
                        <button type="button" onClick={() => editRoute(route)}>Edit</button>
                        <button type="button" className="ghost-btn" onClick={() => handleDeleteRoute(route.routeId)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel-card">
            <h2>Booking Management</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>ID</th><th>User</th><th>Route</th><th>Status</th><th>Amount</th><th>Booked At</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.bookingId}>
                      <td>{booking.bookingId}</td>
                      <td>{booking.user?.fullName || booking.user?.email || booking.user?.userId || "-"}</td>
                      <td>{booking.route ? `${booking.route.source} → ${booking.route.destination}` : "-"}</td>
                      <td>{booking.status}</td>
                      <td>{booking.totalAmount}</td>
                      <td>{formatDateTime(booking.bookingDate)}</td>
                      <td className="table-actions">
                        <button type="button" className="ghost-btn" onClick={() => handleCancelBooking(booking.bookingId)}>Cancel</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel-card">
            <h2>User Management</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Registration date</th></tr>
                </thead>
                <tbody>
                  {users.map((account) => (
                    <tr key={account.userId}>
                      <td>{account.fullName}</td>
                      <td>{account.email}</td>
                      <td>{account.phone || "-"}</td>
                      <td>{account.role}</td>
                      <td>{formatRegDate(account.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Management removed per request */}

          <div className="panel-card">
            <h2>Reports & Analytics</h2>
            <div className="admin-grid analytics-grid">
              <article className="admin-box"><h3>Total Users</h3><p>{reports.totalUsers ?? 0}</p></article>
              <article className="admin-box"><h3>Total Bookings</h3><p>{reports.totalBookings ?? 0}</p></article>
              <article className="admin-box"><h3>Revenue</h3><p>{Number(reports.revenue ?? 0).toFixed(2)}</p></article>
              <article className="admin-box"><h3>Bus Statistics</h3><p>{reports.totalBuses ?? 0} buses</p></article>
              <article className="admin-box"><h3>Total Routes</h3><p>{reports.totalRoutes ?? 0}</p></article>
              <article className="admin-box"><h3>Cancelled Bookings</h3><p>{reports.cancelledBookings ?? 0}</p></article>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
