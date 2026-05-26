import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyBookings, cancelBooking, getReceipt } from "../services/userApi";
import { useAuth } from "../context/AuthContext";
import SeatSelector from "../components/SeatSelector";
import "../styles/user.css";

async function fetchAllRoutes() {
  const res = await fetch("/api/routes", {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Unable to load buses");
  }

  return res.json();
}

export default function UserDashboardPage() {
  const [allRoutes, setAllRoutes] = useState([]);
  const [results, setResults] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [form, setForm] = useState({
    source: "",
    destination: "",
    date: "",
    busType: "",
  });
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { logout } = useAuth();

  async function loadRoutes() {
    const routesData = await fetchAllRoutes();
    const safeRoutes = Array.isArray(routesData) ? routesData : [];
    setAllRoutes(safeRoutes);
    setResults(safeRoutes);
  }

  async function loadBookings() {
    const bookingsData = await getMyBookings();
    setMyBookings(Array.isArray(bookingsData) ? bookingsData : []);
  }

  async function handleRefreshAll() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await Promise.all([loadRoutes(), loadBookings()]);
      setMessage("All data refreshed.");
    } catch (err) {
      setError(err.message || "Unable to refresh data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    let mounted = true;

    async function loadAllData() {
      setLoading(true);
      setError("");
      try {
        const [routesData, bookingsData] = await Promise.all([
          fetchAllRoutes(),
          getMyBookings(),
        ]);

        if (!mounted) return;
        const safeRoutes = Array.isArray(routesData) ? routesData : [];
        setAllRoutes(safeRoutes);
        setResults(safeRoutes);
        setMyBookings(Array.isArray(bookingsData) ? bookingsData : []);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Unable to load dashboard data");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAllData();

    return () => {
      mounted = false;
    };
  }, []);

  function applyFilter(list, filters) {
    return list.filter((route) => {
      const source = String(route.source || "").toLowerCase();
      const destination = String(route.destination || "").toLowerCase();
      const travelDate = String(route.travelDate || "").toLowerCase();
      const busType = String(route.bus?.busType || route.busType || "").toLowerCase();

      const sourceMatch = !filters.source || source.includes(filters.source.toLowerCase());
      const destinationMatch =
        !filters.destination || destination.includes(filters.destination.toLowerCase());
      const dateMatch = !filters.date || travelDate.includes(filters.date.toLowerCase());
      const typeMatch = !filters.busType || busType.includes(filters.busType.toLowerCase());

      return sourceMatch && destinationMatch && dateMatch && typeMatch;
    });
  }

  async function handleSearch(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const filtered = applyFilter(allRoutes, form);
      setResults(filtered);
      if (!filtered.length) {
        setMessage("No buses found for your search.");
      }
    } catch (err) {
      setError(err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function resetSearch() {
    const cleared = { source: "", destination: "", date: "", busType: "" };
    setForm(cleared);
    setResults(allRoutes);
  }

  function canCancel(status) {
    const s = String(status || "").toUpperCase();
    return s === "BOOKED" || s === "CONFIRMED" || s === "PAID" || s === "PENDING";
  }

  async function handleCancelBooking(bookingId) {
    const ok = window.confirm("Do you want to cancel this booking?");
    if (!ok) return;

    try {
      await cancelBooking(bookingId);
      setMyBookings((prev) => prev.filter((b) => b.bookingId !== bookingId));
      setMessage("Booking cancelled. Your money will be refunded within 2 days.");
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Unable to cancel booking");
    }
  }

  async function handleDownloadReceipt(bookingId) {
    const booking = myBookings.find((b) => b.bookingId === bookingId);

    try {
      const receipt = await getReceipt(bookingId);

      if (receipt?.url) {
        const a = document.createElement("a");
        a.href = receipt.url;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.download = `receipt-${bookingId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setMessage("Receipt downloaded successfully.");
        setError("");
        return;
      }

      const html =
        typeof receipt === "string" && receipt.trim()
          ? receipt
          : buildReceiptHtml(booking);

      downloadFromText(`receipt-${bookingId}.html`, html);
      setMessage("Receipt downloaded successfully.");
      setError("");
    } catch {
      const html = buildReceiptHtml(booking);
      downloadFromText(`receipt-${bookingId}.html`, html);
      setMessage("Receipt downloaded successfully.");
      setError("");
    }
  }

  function buildReceiptHtml(booking) {
    const seats = (booking?.seats || booking?.bookingSeats || [])
      .map((s) => s.seatNumber || s.seat?.seatNumber)
      .filter(Boolean)
      .join(", ") || "-";

    return `
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Receipt #${booking?.bookingId || ""}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1f2f3a; }
            h1 { margin-bottom: 8px; }
            .row { margin: 8px 0; }
            .label { color: #5a6d77; width: 140px; display: inline-block; }
          </style>
        </head>
        <body>
          <h1>Bus Booking Receipt</h1>
          <div class="row"><span class="label">Booking ID:</span><strong>${booking?.bookingId ?? "-"}</strong></div>
          <div class="row"><span class="label">Route:</span>${booking?.route?.source ?? "-"} → ${booking?.route?.destination ?? "-"}</div>
          <div class="row"><span class="label">Travel Date:</span>${booking?.route?.travelDate ?? "-"}</div>
          <div class="row"><span class="label">Seats:</span>${seats}</div>
          <div class="row"><span class="label">Amount:</span>${Number(booking?.totalAmount || 0).toFixed(2)}</div>
          <div class="row"><span class="label">Status:</span>${booking?.status ?? "-"}</div>
        </body>
      </html>
    `;
  }

  const bookingCount = myBookings.length;
  const confirmedCount = myBookings.filter((booking) => {
    const status = String(booking.status || "").toUpperCase();
    return status === "BOOKED" || status === "CONFIRMED";
  }).length;
  const latestBooking = myBookings[0];

  function downloadFromText(filename, content, mimeType = "text/html;charset=utf-8") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="dash-shell user-shell">
      <div className="dashboard-shell">
        <div className="user-toast-area" aria-live="polite" aria-atomic="true">
          {message ? (
            <div className="admin-toast admin-alert admin-toast-success">
              <div className="toast-content">{message}</div>
              <button className="toast-close" onClick={() => setMessage("")} aria-label="Dismiss">
                ×
              </button>
              <div className="toast-progress" aria-hidden="true" />
            </div>
          ) : null}

          {error ? (
            <div className="admin-toast admin-alert admin-alert-error">
              <div className="toast-content">{error}</div>
              <button className="toast-close" onClick={() => setError("")} aria-label="Dismiss error">
                ×
              </button>
            </div>
          ) : null}
        </div>

        <section className="dashboard-hero panel-card">
          <div className="dashboard-hero-top dashboard-top-row">
            <div className="dashboard-title-wrap">
              <div className="dashboard-badge">User Dashboard</div>
              <h1 className="dashboard-title">Plan, book, and track your trips in one place</h1>
              <p className="dashboard-subtitle">
                Search available buses, book seats, and review your booking history below.
              </p>
            </div>

            <div className="dashboard-header-actions">
              <button type="button" className="secondary-btn" onClick={handleRefreshAll} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh All"}
              </button>
              <button
                type="button"
                className="logout-btn"
                onClick={() => {
                  logout();
                  navigate("/login", { replace: true });
                }}
              >
                Logout
              </button>
            </div>
          </div>

          <div className="dashboard-kpis">
            <div className="kpi-card">
              <span className="kpi-label">Available routes</span>
              <strong>{results.length}</strong>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Your bookings</span>
              <strong>{bookingCount}</strong>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Booked trips</span>
              <strong>{confirmedCount}</strong>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Latest booking</span>
              <strong>{latestBooking ? `#${latestBooking.bookingId}` : "None"}</strong>
            </div>
          </div>
        </section>

        <section className="panel-card dashboard-section">
          <div className="section-head">
            <div>
              <h2>Search Buses</h2>
              <p>Filter by source, destination, date, or bus type.</p>
            </div>
          </div>

          <form className="user-search-form search-filters-one-line" onSubmit={handleSearch}>
            <input
              placeholder="Source (e.g. Chennai)"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
            />
            <input
              placeholder="Destination (e.g. Bangalore)"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
            />
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <select
              value={form.busType}
              onChange={(e) => setForm({ ...form, busType: e.target.value })}
            >
              <option value="">All bus types</option>
              <option value="SLEEPER_AC">Sleeper AC</option>
              <option value="SLEEPER_NON_AC">Sleeper Non AC</option>
              <option value="NORMAL_AC">Normal AC</option>
              <option value="NORMAL_NON_AC">Normal Non AC</option>
            </select>

            <div className="form-row full-row dashboard-form-actions">
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Searching..." : "Search Available Buses"}
              </button>
              <button type="button" className="ghost-btn" onClick={resetSearch}>
                Clear
              </button>
            </div>
          </form>
        </section>

        <section className="panel-card dashboard-section">
          <div className="section-head">
            <div>
              <h2>Available Buses</h2>
              <p>{results.length} bus route(s) available</p>
            </div>
          </div>

          <div className="table-wrap dashboard-table">
            <table>
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Date</th>
                  <th>Departure</th>
                  <th>Arrival</th>
                  <th>Bus Type</th>
                  <th>Fare</th>
                  <th>Bus</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((route) => (
                  <tr key={route.routeId}>
                    <td>{route.source} → {route.destination}</td>
                    <td>{route.travelDate}</td>
                    <td>{route.departureTime}</td>
                    <td>{route.arrivalTime}</td>
                    <td>{route.bus?.busType || route.busType || "-"}</td>
                    <td>{Number(route.fare ?? 0).toFixed(2)}</td>
                    <td>{route.bus?.busName || "-"}</td>
                    <td className="table-actions">
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => setSelectedRoute(route)}
                      >
                        View Seats
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => setSelectedRoute(route)}
                      >
                        Book Seat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selectedRoute && (
          <section className="panel-card seat-panel-wrapper">
            <div className="section-head">
              <div>
                <h2>Seat Selection</h2>
                <p>
                  {selectedRoute.source} → {selectedRoute.destination} ({selectedRoute.travelDate})
                </p>
              </div>
              <button type="button" className="ghost-btn" onClick={() => setSelectedRoute(null)}>
                Close
              </button>
            </div>

            <SeatSelector
              route={selectedRoute}
              inline
              onClose={() => setSelectedRoute(null)}
            />
          </section>
        )}

        <section className="panel-card dashboard-section">
          <div className="section-head">
            <div>
              <h2>My Bookings</h2>
              <p>Your booked seats and payment history</p>
            </div>
          </div>

          {myBookings.length === 0 ? (
            <div className="empty-state">
              <strong>No bookings yet</strong>
              <span>After you book and pay, the trip will appear here automatically.</span>
            </div>
          ) : (
            <div className="table-wrap dashboard-table">
              <table>
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Route</th>
                    <th>Seats</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myBookings.map((booking) => (
                    <tr key={booking.bookingId}>
                      <td>{booking.bookingId}</td>
                      <td>
                        {booking.route?.source} → {booking.route?.destination} ({booking.route?.travelDate})
                      </td>
                      <td>
                        {(booking.seats || booking.bookingSeats || [])
                          .map((seat) => seat.seatNumber || seat.seat?.seatNumber)
                          .filter(Boolean)
                          .join(", ") || "-"}
                      </td>
                      <td>{Number(booking.totalAmount || 0).toFixed(2)}</td>
                      <td>
                        <span className={`status-pill status-${String(booking.status || "").toLowerCase()}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="table-actions">
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => handleDownloadReceipt(booking.bookingId)}
                        >
                          Download Receipt
                        </button>

                        {canCancel(booking.status) ? (
                          <button
                            type="button"
                            className="danger-btn"
                            onClick={() => handleCancelBooking(booking.bookingId)}
                          >
                            Cancel
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
