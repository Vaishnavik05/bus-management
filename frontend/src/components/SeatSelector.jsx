import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRouteSeats } from "../services/userApi";
import "../styles/user.css";

function seatKey(seat) {
  return String(seat.seatId ?? seat.id ?? seat.seatNumber);
}

function isSeatBooked(seat) {
  const value = String(seat.status ?? seat.isBooked ?? "").toUpperCase();
  return value === "BOOKED" || value === "UNAVAILABLE";
}

export default function SeatSelector({ route, onClose }) {
  const navigate = useNavigate();
  const [seatsData, setSeatsData] = useState(null);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSeats() {
      setLoading(true);
      setError("");
      setSeatsData(null);
      setSelected([]);

      try {
        const busId = route?.bus?.busId;
        if (!busId) throw new Error("Bus is not assigned for this route.");

        const seats = await getRouteSeats(busId);
        if (!mounted) return;
        setSeatsData({ seats: Array.isArray(seats) ? seats : [] });
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Unable to load seats");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSeats();
    return () => {
      mounted = false;
    };
  }, [route]);

  const seats = seatsData?.seats || [];

  const selectedTotal = useMemo(() => {
    return selected.reduce((sum, selectedSeatKey) => {
      const seat = seats.find((item) => seatKey(item) === selectedSeatKey);
      return sum + Number(seat?.price ?? route.fare ?? 0);
    }, 0);
  }, [selected, seats, route.fare]);

  function toggleSeat(seat) {
    if (isSeatBooked(seat)) return;

    const key = seatKey(seat);
    setSelected((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }

  function handleBook() {
    if (!selected.length) {
      setError("Select at least one seat.");
      return;
    }

    const selectedSeats = selected
      .map((selectedSeatKey) => seats.find((item) => seatKey(item) === selectedSeatKey))
      .filter(Boolean);

    navigate("/payment", {
      state: {
        route,
        selectedSeats,
        totalAmount: selectedTotal,
      },
    });
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>
            Seats — {route.source} → {route.destination} ({route.travelDate})
          </h3>
          <button type="button" className="toast-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {error ? <div className="admin-alert admin-alert-error" style={{ marginTop: 12 }}>{error}</div> : null}

        {loading && !seatsData ? (
          <p style={{ marginTop: 12 }}>Loading seats...</p>
        ) : (
          <>
            <div className="seat-grid" style={{ marginTop: 12 }}>
              {seats.map((seat) => {
                const key = seatKey(seat);
                const booked = isSeatBooked(seat);
                const selectedSeat = selected.includes(key);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSeat(seat)}
                    className={
                      booked
                        ? "seat seat-booked"
                        : selectedSeat
                          ? "seat seat-selected"
                          : "seat seat-available"
                    }
                    disabled={booked}
                  >
                    {seat.seatNumber ?? key}
                  </button>
                );
              })}
            </div>

            <div className="seat-legend" style={{ marginTop: 12 }}>
              <div className="legend"><span className="box" style={{ background: "#f8feff" }} /> Available</div>
              <div className="legend"><span className="box" style={{ background: "#fff6f6" }} /> Booked</div>
              <div className="legend"><span className="box" style={{ background: "linear-gradient(135deg,var(--accent),var(--accent-dark))" }} /> Selected</div>
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <strong>Selected:</strong> {selected.length} <strong>Total:</strong> {selectedTotal.toFixed(2)}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn-primary" onClick={handleBook} disabled={loading || !selected.length}>
                  {loading ? "Booking…" : `Book ${selected.length} seat(s)`}
                </button>
                <button type="button" className="ghost-btn" onClick={onClose}>Cancel</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}