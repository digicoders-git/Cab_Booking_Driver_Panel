import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import DashboardLayout from "./components/DashboardLayout";
import { Toaster } from "sonner";
import routes from "./route/SidebarRaoute";

// Load extra driver pages explicitly
const DriverLogin = lazy(() => import("./pages/driver/DriverLogin"));
const DriverRegister = lazy(() => import("./pages/driver/DriverRegister"));
const DriverTripDetail = lazy(() => import("./pages/driver/DriverTripDetail"));
const DriverSupportTicket = lazy(() => import("./pages/driver/DriverSupportTicket"));

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading Driver Panel...</p>
    </div>
  </div>
);

function App() {
  const { isLoggedIn, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login />} />
        
        {/* Driver Public Auth Routes */}
        <Route path="/driver/login" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : (
          <Suspense fallback={<LoadingSpinner />}><DriverLogin /></Suspense>
        )} />
        <Route path="/driver/register" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : (
          <Suspense fallback={<LoadingSpinner />}><DriverRegister /></Suspense>
        )} />

        {/* Protected Built-In Panel */}
        {isLoggedIn ? (
          <Route element={<DashboardLayout />}>
            {routes.flatMap(route => (route.children ? route.children : route)).map(({ path, component: Component }) => (
              <Route
                key={path}
                path={path}
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <Component />
                  </Suspense>
                }
              />
            ))}
            
            {/* Hidden protected routes not registered in sidebar array */}
            <Route path="/driver/trip/:id" element={<Suspense fallback={<LoadingSpinner />}><DriverTripDetail /></Suspense>} />
            <Route path="/driver/ticket/:id" element={<Suspense fallback={<LoadingSpinner />}><DriverSupportTicket /></Suspense>} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;