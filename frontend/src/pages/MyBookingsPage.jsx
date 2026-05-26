import React, { useEffect, useState } from "react";
import { getMyBookings, payBooking, getReceipt } from "../services/userApi";
import "../styles/user.css";

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await getMyBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      alert(err.message || "Unable to load bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handlePay(bookingId) {
    try {
      await payBooking(bookingId, { paymentMethod: "CARD" });
      await load();
      alert("Payment successful");
    } catch (err) {
      alert(err.message || "Payment failed");
    }
  }

  async function handlePrint(bookingId) {
    try {
      const receipt = await getReceipt(bookingId);
      if (receipt?.url) window.open(receipt.url, "_blank");
      else {
        const w = window.open("", "_blank");
        w.document.write(receipt || "Receipt");
        w.document.close();
      }
    } catch {
      alert("Unable to open receipt");
    }
  }

  return (
    <main className="dash-shell user-shell">
      <section className="panel-card">
        <h2>My Bookings</h2>
        {loading ? (
          <p>Loading…</p>
        ) : bookings.length === 0 ? (
          <p>You have no bookings yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Route</th>
                  <th>Seats</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.bookingId}>
                    <td>{b.bookingId}</td>
                    <td>{b.route?.source} → {b.route?.destination} ({b.route?.travelDate})</td>
                    <td>
                      {(b.seats || b.bookingSeats || [])
                        .map((s) => s.seatNumber || s.seat?.seatNumber)
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </td>
                    <td>{Number(b.totalAmount || 0).toFixed(2)}</td>
                    <td>{b.status}</td>
                    <td className="table-actions">
                      {b.status === "PENDING" && (
                        <button className="btn-primary" onClick={() => handlePay(b.bookingId)}>
                          Pay
                        </button>
                      )}
                      <button className="secondary-btn" onClick={() => handlePrint(b.bookingId)}>
                        Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}