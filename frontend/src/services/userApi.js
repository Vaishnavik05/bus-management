import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bus_booking_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function getAllRoutes() {
  const { data } = await api.get("/routes");
  return data;
}

// fallback if backend doesn't expose /routes, use search with empty params
export function getAllRoutesFallback() {
  const q = new URLSearchParams({ source: "", destination: "", date: "" });
  return request(`/routes/search?${q.toString()}`);
}

export async function searchRoutes({ source = "", destination = "", date = "", busType = "" }) {
  const { data } = await api.get("/routes", {
    params: { source, destination, date, busType },
  });
  return data;
}

export async function getRouteSeats(busId) {
  const { data } = await api.get(`/seats/${busId}`);
  return Array.isArray(data) ? data : data?.seats || [];
}

export async function createBooking(payload) {
  const { data } = await api.post("/bookings/book", payload);
  return data;
}

export async function payBooking(bookingId, payload) {
  const { data } = await api.post(`/bookings/${bookingId}/pay`, payload);
  return data;
}

export async function getMyBookings() {
  const { data } = await api.get("/bookings");
  return data;
}

export async function getReceipt(bookingId) {
  const attempts = [
    () => api.get(`/bookings/${bookingId}/receipt`),
    () => api.get(`/bookings/${bookingId}/receipt/download`),
    () => api.get(`/bookings/receipt/${bookingId}`),
    () => api.get(`/bookings/${bookingId}/ticket`),
  ];

  let lastError;

  for (const attempt of attempts) {
    try {
      const { data } = await attempt();
      return data;
    } catch (err) {
      lastError = err;
      const status = err?.response?.status;
      const shouldTryNext =
        !status || status === 404 || status === 405 || (status >= 500 && status <= 599);

      if (!shouldTryNext) {
        throw err;
      }
    }
  }

  throw lastError || new Error("Unable to fetch receipt");
}

// NEW: cancel booking
export async function cancelBooking(bookingId) {
  const attempts = [
    () => api.post(`/bookings/${bookingId}/cancel`),
    () => api.patch(`/bookings/${bookingId}/cancel`),
    () => api.put(`/bookings/${bookingId}/cancel`),
    () => api.delete(`/bookings/${bookingId}`),
    () => api.post(`/bookings/cancel/${bookingId}`),
  ];

  let lastError;

  for (const attempt of attempts) {
    try {
      const { data } = await attempt();
      return data;
    } catch (err) {
      lastError = err;
      const status = err?.response?.status;

      const shouldTryNext =
        !status || status === 404 || status === 405 || (status >= 500 && status <= 599);

      if (!shouldTryNext) {
        throw err;
      }
    }
  }

  throw lastError || new Error("Unable to cancel booking");
}
