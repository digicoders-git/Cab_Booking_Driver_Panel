// src/pages/Login.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { useNavigate } from "react-router-dom";
import { driverLogin } from "../api/index";

const Login = () => {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [errorData, setErrorData] = useState(null);
  const [isRejected, setIsRejected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { setLoginData } = useAuth();
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
    setIsRejected(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!credentials.email || !credentials.password) {
      setError("Please fill in both email and password.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const data = await driverLogin(credentials.email.trim(), credentials.password);
      
      // Formatting the api response to match context expectations
      const loginPayload = {
        adminId: credentials.email,
        name: data?.driver?.name || data?.user?.name || "Driver User",
        id: data?.driver?._id || data?.user?._id || "1",
        token: data?.token,
        role: "Driver",
        ...data?.driver
      };

      setLoginData(loginPayload);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const respData = err.response?.data;
      const errorMessage =
        respData?.message ||
        respData?.error ||
        err.message ||
        "Login failed. Please check your credentials.";

      setError(errorMessage);
      setErrorData(respData);

      // Check if driver was rejected to show resubmit button
      if (errorMessage.toLowerCase().includes("rejected")) {
        setIsRejected(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: themeColors.background,
        fontFamily: currentFont.family,
      }}
    >
      <div
        className="w-full max-w-sm p-6 rounded-2xl shadow-lg border"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        {/* Branding Section */}
        <div className="text-center mb-4">
          <div className="w-full h-40 mx-auto mb-2 flex items-center justify-center p-1">
            <img
              src="/logo.png"
              alt="Cab booking Logo"
              className="w-full h-full object-contain"
            />
          </div>

          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: themeColors.primary }}
          >
            Cab booking
          </h1>

          <p
            className="text-xs"
            style={{ color: themeColors.textSecondary }}
          >
            Driver Panel Login
          </p>
        </div>

        {/* Error Box */}
        {error && (
          <div className="mb-4">
            <div
              className={`p-3 ${isRejected ? 'rounded-t-lg' : 'rounded-lg'} text-center text-sm`}
              style={{
                backgroundColor: themeColors.danger + "15",
                color: themeColors.danger,
                border: `1px solid ${themeColors.danger}30`,
              }}
            >
              {error}
            </div>
            {isRejected && (
              <button
                onClick={() => navigate("/driver/register", { 
                  state: { 
                    email: credentials.email,
                    prefillData: errorData?.driver 
                  } 
                })}
                className="w-full p-2.5 rounded-b-lg text-xs font-bold transition-all hover:brightness-95 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: themeColors.primary,
                  color: themeColors.onPrimary,
                }}
              >
                📝 Edit & Resubmit Documents
              </button>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block mb-2 text-sm font-medium"
              style={{ color: themeColors.text }}
            >
              Email Address
            </label>
            <input
              type="text"
              id="email"
              name="email"
              value={credentials.email}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: themeColors.background,
                color: themeColors.text,
                borderColor: themeColors.border,
              }}
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block mb-2 text-sm font-medium"
              style={{ color: themeColors.text }}
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: themeColors.background,
                color: themeColors.text,
                borderColor: themeColors.border,
              }}
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
            style={{
              backgroundColor: themeColors.primary,
              color: themeColors.onPrimary,
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Register Link */}
        <p className="text-center text-xs mt-4" style={{ color: themeColors.textSecondary }}>
          New driver?{" "}
          <button
            onClick={() => navigate("/driver/register")}
            className="font-semibold hover:underline"
            style={{ color: themeColors.primary }}
          >
            Register here
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;