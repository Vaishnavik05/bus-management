import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createBooking } from "../services/userApi";
import { useAuth } from "../context/AuthContext";
import "../styles/user.css";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function normalizeCardNumber(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 16);
}

function formatCardNumber(value) {
  return normalizeCardNumber(value).replace(/(.{4})/g, "$1 ").trim();
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuth();

  const route = state?.route;
  const selectedSeats = state?.selectedSeats || [];
  const totalAmount = Number(state?.totalAmount || 0);

  const [paymentMethod, setPaymentMethod] = useState("CARD");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    billingAddress: "",
    cardNumber: "",
    cardHolder: "",
    expiry: "",
    cvv: "",
    upiId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successBooking, setSuccessBooking] = useState(null);

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      fullName: current.fullName || user.fullName || "",
      email: current.email || user.email || "",
    }));
  }, [user]);

//   useEffect(() => {
//     if (!successBooking) return;
//     const timer = setTimeout(() => {
//       navigate("/dashboard");
//     }, 1400);
//     return () => clearTimeout(timer);
//   }, [successBooking, navigate]);

  const seatList = useMemo(
    () => selectedSeats.map((seat) => seat.seatNumber).filter(Boolean),
    [selectedSeats]
  );

  if (!route || !selectedSeats.length) {
    return (
      <main className="dash-shell user-shell">
        <section className="panel-card payment-shell">
          <h2>Payment</h2>
          <p>No booking data found. Please select seats from the dashboard first.</p>
          <button className="btn-primary" type="button" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </button>
        </section>
      </main>
    );
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function validate() {
    if (!form.fullName.trim()) return "Enter your full name.";
    if (!form.email.trim()) return "Enter your email.";
    if (!form.phone.trim()) return "Enter your phone number.";
    if (!form.billingAddress.trim()) return "Enter billing address.";

    if (paymentMethod === "CARD") {
      const cardDigits = normalizeCardNumber(form.cardNumber);
      if (cardDigits.length !== 16) return "Enter a valid 16-digit card number.";
      if (!form.cardHolder.trim()) return "Enter card holder name.";
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.expiry)) return "Enter expiry as MM/YY.";
      if (!/^\d{3}$/.test(form.cvv)) return "Enter a valid 3-digit CVV.";
    }

    if (paymentMethod === "UPI" && !form.upiId.trim()) {
      return "Enter UPI ID.";
    }

    return "";
  }

  async function handlePay(event) {
    event.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const bookingPayload = {
      routeId: route.routeId,
      busId: route.busId ?? route.bus?.busId ?? route.bus?.id,
      route: { routeId: route.routeId },
      seats: selectedSeats.map((seat) => seat.seatNumber),
      seatNumbers: selectedSeats.map((seat) => seat.seatNumber),
      totalAmount,
      payment: {
        cardHolder: form.cardHolder || form.fullName,
      },
    };

    setLoading(true);
    try {
      const booking = await createBooking(bookingPayload);
      setSuccessBooking(booking);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dash-shell user-shell">
      <div className="payment-page">
        <div className="payment-header">
          <h1>Secure Checkout</h1>
          <p>Complete your payment to confirm the booking.</p>
        </div>

        <div className="payment-layout">
          <section className="payment-card">
            {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}

            {successBooking ? (
              <div className="payment-success">
                <div className="payment-success-badge">Payment Successful</div>
                <h2>Booking Confirmed</h2>

                <div className="payment-success-inline">
                  <p className="payment-booking-id">
                    Booking ID: <strong>{successBooking.bookingId}</strong>
                  </p>

                  <div className="payment-success-actions">
                    <button className="btn-primary" type="button" onClick={() => window.print()}>
                      Print Receipt
                    </button>
                    <button className="ghost-btn" type="button" onClick={() => navigate("/dashboard")}>
                      Return to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePay}>
                <div className="payment-section">
                  <h2>Passenger Details</h2>
                  <div className="payment-grid two-col">
                    <input
                      placeholder="Full name"
                      value={form.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                    />
                    <input
                      placeholder="Email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                    />
                    <input
                      placeholder="Phone"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                    />
                    <input
                      placeholder="Billing address"
                      value={form.billingAddress}
                      onChange={(e) => updateField("billingAddress", e.target.value)}
                    />
                  </div>
                </div>

                <div className="payment-section">
                  <h2>Payment Method</h2>
                  <div className="payment-tabs">
                    <button
                      type="button"
                      className={paymentMethod === "CARD" ? "payment-tab active" : "payment-tab"}
                      onClick={() => setPaymentMethod("CARD")}
                    >
                      Debit / Credit Card
                    </button>
                    <button
                      type="button"
                      className={paymentMethod === "UPI" ? "payment-tab active" : "payment-tab"}
                      onClick={() => setPaymentMethod("UPI")}
                    >
                      UPI
                    </button>
                  </div>

                  {paymentMethod === "CARD" ? (
                    <div className="payment-grid card-grid">
                      <input
                        placeholder="Card number"
                        value={formatCardNumber(form.cardNumber)}
                        onChange={(e) => updateField("cardNumber", normalizeCardNumber(e.target.value))}
                        inputMode="numeric"
                      />
                      <input
                        placeholder="Card holder name"
                        value={form.cardHolder}
                        onChange={(e) => updateField("cardHolder", e.target.value)}
                      />
                      <input
                        placeholder="MM/YY"
                        value={form.expiry}
                        onChange={(e) => updateField("expiry", e.target.value)}
                        maxLength={5}
                      />
                      <input
                        placeholder="CVV"
                        value={form.cvv}
                        onChange={(e) => updateField("cvv", e.target.value.replace(/\D/g, "").slice(0, 3))}
                        maxLength={3}
                        inputMode="numeric"
                      />
                    </div>
                  ) : (
                    <div className="payment-grid one-col">
                      <input
                        placeholder="UPI ID"
                        value={form.upiId}
                        onChange={(e) => updateField("upiId", e.target.value)}
                      />
                      <div className="bank-note">
                        Scan and pay using any UPI app. Example: user@upi
                      </div>
                    </div>
                  )}
                </div>

                <div className="payment-security">
                  <span className="security-badge">Dummy payment gateway</span>
                  <span>Encrypted checkout simulation for your bus booking demo.</span>
                </div>

                <button type="submit" className="btn-primary payment-submit" disabled={loading}>
                  {loading ? "Processing Payment…" : `Pay ${formatCurrency(totalAmount)} and Book`}
                </button>
              </form>
            )}
          </section>

          <aside className="payment-card payment-summary-card">
            <h2>Booking Summary</h2>

            <div className="summary-block">
              <div className="summary-row">
                <span>Route</span>
                <strong>
                  {route.source} → {route.destination}
                </strong>
              </div>
              <div className="summary-row">
                <span>Travel Date</span>
                <strong>{route.travelDate}</strong>
              </div>
              <div className="summary-row">
                <span>Departure</span>
                <strong>{route.departureTime}</strong>
              </div>
              <div className="summary-row">
                <span>Arrival</span>
                <strong>{route.arrivalTime}</strong>
              </div>
            </div>

            <div className="summary-block">
              <div className="summary-row">
                <span>Selected Seats</span>
                <strong>{seatList.join(", ") || "-"}</strong>
              </div>
              {/* <div className="seat-chip-list">
                {seatList.map((seat) => (
                  <span key={seat} className="seat-chip">
                    {seat}
                  </span>
                ))}
              </div> */}
            </div>

            <div className="summary-block fare-box">
              <div className="summary-row">
                <span>Total Amount</span>
                <strong>{formatCurrency(totalAmount)}</strong>
              </div>
              <div className="summary-row">
                <span>Status</span>
                <strong>{successBooking ? "Payment completed" : "Ready for payment"}</strong>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}