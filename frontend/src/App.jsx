import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UserDashboardPage from "./pages/UserDashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import PaymentPage from "./pages/PaymentPage";

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return children;
  }

  return <Navigate to={user?.role === "ADMIN" ? "/admin" : "/user"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />

      <Route element={<ProtectedRoute allowedRoles={["USER"]} />}>
        <Route path="/user" element={<UserDashboardPage />} />
        <Route path="/dashboard" element={<UserDashboardPage />} />
        <Route path="/bookings" element={<MyBookingsPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Route>

      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/payment" element={<PaymentPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
