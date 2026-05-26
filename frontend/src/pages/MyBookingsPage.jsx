import React, { useEffect, useState } from "react";
import { getMyBookings, payBooking, getReceipt, cancelBooking } from "../services/userApi";
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

  async function handleCancel(bookingId) {
    const ok = window.confirm("Do you want to cancel this booking?");
    if (!ok) return;

    try {
      await cancelBooking(bookingId);

      // Remove cancelled row immediately from UI
      setBookings((prev) => prev.filter((b) => b.bookingId !== bookingId));

      alert("Booking cancelled. Your money will be refunded within 2 days.");
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Unable to cancel booking");
    }
  }

  function canCancel(status) {
    const s = String(status || "").toUpperCase();
    return s === "BOOKED" || s === "CONFIRMED" || s === "PAID";
  }

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

  async function handleDownload(bookingId) {
    const booking = bookings.find((b) => b.bookingId === bookingId);

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
        alert("Receipt downloaded");
        return;
      }

      const html =
        typeof receipt === "string" && receipt.trim()
          ? receipt
          : buildReceiptHtml(booking);

      downloadFromText(`receipt-${bookingId}.html`, html);
      alert("Receipt downloaded");
    } catch {
      const html = buildReceiptHtml(booking);
      downloadFromText(`receipt-${bookingId}.html`, html);
      alert("Receipt downloaded");
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
                    <td>
                      {b.route?.source} → {b.route?.destination} ({b.route?.travelDate})
                    </td>
                    <td>
                      {(b.seats || b.bookingSeats || [])
                        .map((s) => s.seatNumber || s.seat?.seatNumber)
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </td>
                    <td>{Number(b.totalAmount || 0).toFixed(2)}</td>
                    <td>{b.status}</td>
                    <td className="table-actions">
                      {String(b.status).toUpperCase() === "PENDING" && (
                        <button className="btn-primary" onClick={() => handlePay(b.bookingId)}>
                          Pay
                        </button>
                      )}
                      <button className="secondary-btn" onClick={() => handleDownload(b.bookingId)}>
                        Download Receipt
                      </button>
                      {canCancel(b.status) && (
                        <button className="danger-btn" onClick={() => handleCancel(b.bookingId)}>
                          Cancel
                        </button>
                      )}
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