import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createBooking } from "../services/userApi";
import "../styles/user.css";
import { useAuth } from "../context/AuthContext";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function seatKey(seat) {
  return String(seat.seatId ?? seat.id ?? seat.seatNumber);
}

function printTicketHtml(booking, route, seats, totalAmount, paymentMethod) {
  const seatNumbers = seats.map((seat) => seat.seatNumber).join(", ");
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Bus Ticket</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 24px;
            background: #f4f8f9;
            color: #17323d;
          }
          .ticket {
            max-width: 760px;
            margin: 0 auto;
            background: #fff;
            border-radius: 18px;
            padding: 24px;
            border: 1px solid #d6e6e8;
            box-shadow: 0 16px 40px rgba(20, 41, 54, 0.08);
          }
          .title {
            font-size: 28px;
            font-weight: 800;
            margin: 0 0 16px;
            color: #0c5860;
          }
          .row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            margin: 10px 0;
            padding-bottom: 10px;
            border-bottom: 1px dashed #d6e6e8;
          }
          .label {
            color: #5c7780;
          }
          .value {
            font-weight: 700;
          }
          .footer {
            margin-top: 20px;
            padding-top: 16px;
            border-top: 2px solid #0e7a82;
            color: #5c7780;
            font-size: 13px;
          }
          .chips {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
          }
          .chip {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 38px;
            height: 34px;
            padding: 0 10px;
            border-radius: 999px;
            background: rgba(14, 122, 130, 0.08);
            color: #0c5860;
            font-weight: 700;
          }
          .print-btn {
            margin-top: 20px;
            border: none;
            background: linear-gradient(135deg, #0e7a82, #0c5860);
            color: #fff;
            padding: 12px 18px;
            border-radius: 12px;
            font-weight: 700;
            cursor: pointer;
          }
          @media print {
            .print-btn { display: none; }
            body { background: #fff; padding: 0; }
            .ticket { box-shadow: none; border: none; }
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <h1 class="title">Bus Ticket</h1>

          <div class="row"><span class="label">Booking ID</span><span class="value">${booking?.bookingId ?? "-"}</span></div>
          <div class="row"><span class="label">Passenger</span><span class="value">${booking?.passengerName || booking?.user?.fullName || "-"}</span></div>
          <div class="row"><span class="label">Route</span><span class="value">${route.source} → ${route.destination}</span></div>
          <div class="row"><span class="label">Travel Date</span><span class="value">${route.travelDate}</span></div>
          <div class="row"><span class="label">Departure</span><span class="value">${route.departureTime}</span></div>
          <div class="row"><span class="label">Arrival</span><span class="value">${route.arrivalTime}</span></div>
          <div class="row"><span class="label">Bus</span><span class="value">${route.bus?.busName || "-"}</span></div>
          <div class="row"><span class="label">Bus Type</span><span class="value">${route.bus?.busType || "-"}</span></div>
          <div class="row"><span class="label">Seats</span><span class="value">${seatNumbers}</span></div>
          <div class="row"><span class="label">Amount Paid</span><span class="value">${formatCurrency(totalAmount)}</span></div>
          <div class="row"><span class="label">Payment Mode</span><span class="value">${paymentMethod}</span></div>

          <div class="footer">
            Present this ticket at boarding. Use browser print and save as PDF if needed.
          </div>

          <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
}

function normalizeCardNumber(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 16);
}

function formatCardNumber(value) {
  return normalizeCardNumber(value).replace(/(.{4})/g, "$1 ").trim();
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const { state } = useLocation();

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

  useEffect(() => {
    if (!successBooking) return;
    const timer = setTimeout(() => {
      navigate("/dashboard");
    }, 1200);
    return () => clearTimeout(timer);
  }, [successBooking, navigate]);

  const seatList = useMemo(
    () => selectedSeats.map((seat) => seat.seatNumber).filter(Boolean),
    [selectedSeats]
  );

  if (!route || !selectedSeats.length) {
    return (
      <main className="dash-shell user-shell">
        <section className="panel-card payment-shell">
          <h2>Payment</h2>
          <p>No booking data found.</p>
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
      userId: user?.userId || user?.id || user?.sub,
      routeId: route.routeId,
      route: { routeId: route.routeId },
      seats: selectedSeats.map((seat) => seat.seatId ?? seat.id ?? seat.seatNumber),
      totalAmount,
      payment: {
        cardHolder: form.cardHolder || form.fullName,
      },
    };

    if (!bookingPayload.userId) {
      setError("User login information is missing. Please log in again.");
      return;
    }

    setLoading(true);
    try {
      const booking = await createBooking(bookingPayload);
      setSuccessBooking(booking);
      setTimeout(() => {
        navigate("/dashboard");
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  function handlePrintTicket() {
    printTicketHtml(
      successBooking,
      route,
      selectedSeats,
      totalAmount,
      paymentMethod
    );
  }

  function goDashboard() {
    navigate("/dashboard");
  }

  return (
    <main className="dash-shell user-shell">
      <section className="payment-page">
        <div className="payment-layout">
          <form className="payment-card payment-form-card" onSubmit={handlePay}>
            <div className="payment-header">
              <h1>Secure Checkout</h1>
              <p>Complete your booking with dummy payment details.</p>
            </div>

            {successBooking ? (
              <div className="payment-success">
                <div className="payment-success-badge">Payment Successful</div>
                <p>Your ticket has been generated successfully.</p>
                <div className="payment-success-actions">
                  <button type="button" className="btn-primary" onClick={handlePrintTicket}>
                    Print Ticket PDF
                  </button>
                  <button type="button" className="secondary-btn" onClick={goDashboard}>
                    Go to Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="payment-section">
                  <h2>Passenger Details</h2>
                  <div className="payment-grid two-col">
                    <input
                      placeholder="Full name"
                      value={form.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                    />
                    <input
                      placeholder="Email address"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                    />
                    <input
                      placeholder="Phone number"
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
                      Card
                    </button>
                    <button
                      type="button"
                      className={paymentMethod === "UPI" ? "payment-tab active" : "payment-tab"}
                      onClick={() => setPaymentMethod("UPI")}
                    >
                      UPI
                    </button>
                    <button
                      type="button"
                      className={paymentMethod === "NET_BANKING" ? "payment-tab active" : "payment-tab"}
                      onClick={() => setPaymentMethod("NET_BANKING")}
                    >
                      Net Banking
                    </button>
                  </div>

                  {paymentMethod === "CARD" ? (
                    <div className="payment-grid card-grid">
                      <input
                        placeholder="Card number"
                        value={formatCardNumber(form.cardNumber)}
                        onChange={(e) => updateField("cardNumber", normalizeCardNumber(e.target.value))}
                        inputMode="numeric"
                        type="text"
                      />
                      <div style={{ marginTop: 6, color: "#607983", fontSize: "0.9rem" }}>
                        {normalizeCardNumber(form.cardNumber).length}/16 digits entered
                      </div>
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
                        inputMode="numeric"
                        maxLength={3}
                      />
                    </div>
                  ) : null}

                  {paymentMethod === "UPI" ? (
                    <div className="payment-grid one-col">
                      <input
                        placeholder="UPI ID (e.g. name@upi)"
                        value={form.upiId}
                        onChange={(e) => updateField("upiId", e.target.value)}
                      />
                    </div>
                  ) : null}

                  {paymentMethod === "NET_BANKING" ? (
                    <div className="bank-note">
                      Dummy checkout enabled. Select your bank in a real gateway integration.
                    </div>
                  ) : null}
                </div>

                {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}

                <div className="payment-security">
                  <div className="security-badge">SSL Secured</div>
                  <span>Your payment is encrypted and safe for demo checkout.</span>
                </div>

                <button className="btn-primary payment-submit" type="submit" disabled={loading}>
                  {loading ? "Processing Payment..." : `Pay ${formatCurrency(totalAmount)}`}
                </button>
              </>
            )}
          </form>

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
              <div className="summary-row">
                <span>Bus</span>
                <strong>{route.bus?.busName || "-"}</strong>
              </div>
              <div className="summary-row">
                <span>Bus Type</span>
                <strong>{route.bus?.busType || "-"}</strong>
              </div>
            </div>

            <div className="summary-block">
              <h3>Selected Seats</h3>
              <div className="seat-chip-list">
                {seatList.map((seatNumber) => (
                  <span key={seatNumber} className="seat-chip">
                    {seatNumber}
                  </span>
                ))}
              </div>
            </div>

            <div className="summary-block fare-box">
              <div className="summary-row">
                <span>Seat Count</span>
                <strong>{selectedSeats.length}</strong>
              </div>
              <div className="summary-row">
                <span>Total Amount</span>
                <strong>{formatCurrency(totalAmount)}</strong>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}