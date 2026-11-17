import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/signup";

import AssistantDashboard from "./pages/assistant/assistantDashboard";
import ClientDashboard from "./pages/client/ClientDashboard";

const HomeRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-10">Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  return (
    <Navigate
      to={user.role === "assistant" ? "/assistant" : "/client"}
      replace
    />
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<ProtectedRoute allowedRoles={["assistant"]} />}>
        <Route
          path="/assistant"
          element={<AssistantDashboard />}
        />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["client"]} />}>
        <Route
          path="/client"
          element={<ClientDashboard />}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

