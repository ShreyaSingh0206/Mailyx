
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "assistant",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await signup(formData);

      navigate(
        user.role === "assistant" ? "/assistant" : "/client"
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Signup failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-white">

      {/* Background Video - No Overlay */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/videos/login-bg.mp4" type="video/mp4" />
      </video>

      {/* Main Content */}
      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">

        {/* Left Section */}
        <div className="flex flex-col justify-between px-8 py-10 sm:px-14 lg:px-20">

          {/* Logo */}
          <Link to="/login" className="flex items-center gap-3 w-fit">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/30 bg-white/10 backdrop-blur-md">
              <span className="text-2xl font-bold text-yellow-400">
                M
              </span>
            </div>

            <span className="text-2xl font-bold tracking-wide text-white drop-shadow-lg">
              Mailyx<span className="text-yellow-400">.</span>
            </span>
          </Link>

          {/* Welcome Text */}
          <div className="my-16 max-w-lg">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400 drop-shadow-lg">
              Your inbox, reimagined
            </p>

            <h1 className="text-4xl font-bold leading-tight text-white drop-shadow-xl sm:text-5xl lg:text-6xl">
              Get started with
              <span className="block text-yellow-400">
                Mailyx.
              </span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-white/90 drop-shadow-lg sm:text-lg">
              Create your account and experience a smarter
              way to manage emails, prioritize conversations,
              and stay organized.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/30 bg-black/20 px-4 py-2 text-sm text-white backdrop-blur-sm">
                AI-powered inbox
              </span>

              <span className="rounded-full border border-white/30 bg-black/20 px-4 py-2 text-sm text-white backdrop-blur-sm">
                Smart email management
              </span>
            </div>
          </div>

          {/* Footer */}
          <p className="text-sm text-white/80 drop-shadow-lg">
            Simplify your inbox. Focus on what matters.
          </p>
        </div>

        {/* Right Section */}
        <div className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-14">

          {/* Signup Card */}
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-black/35 p-7 shadow-2xl backdrop-blur-xl sm:p-9">

            <div className="mb-7">
              <p className="mb-2 text-sm font-medium text-yellow-400">
                CREATE YOUR ACCOUNT
              </p>

              <h2 className="text-3xl font-bold text-white">
                Join Mailyx
              </h2>

              <p className="mt-2 text-sm text-white/70">
                Enter your details to get started.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <p className="mb-5 rounded-lg border border-red-400/30 bg-red-500/15 p-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Full Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white/90">
                  Full Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                  autoComplete="name"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 outline-none transition focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white/90">
                  Email Address
                </label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 outline-none transition focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white/90">
                  Password
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    minLength={6}
                    required
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 pr-12 text-white placeholder-white/50 outline-none transition focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 transition hover:text-yellow-400"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.3 4.5 9 7-.3 1.1-1.2 2.5-2.5 3.7" />
                        <path d="M6.2 6.2C3.8 7.8 2.3 10.1 2 12c.7 2.5 4 7 10 7 1.1 0 2.1-.2 3-.5" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="mb-3 block text-sm font-medium text-white/90">
                  I want to join as
                </label>

                <div className="grid grid-cols-2 gap-3">

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        role: "assistant",
                      })
                    }
                    className={`rounded-xl border p-3 text-sm font-medium transition ${
                      formData.role === "assistant"
                        ? "border-yellow-400 bg-yellow-400/15 text-yellow-400"
                        : "border-white/20 bg-white/5 text-white/70 hover:border-white/40"
                    }`}
                  >
                    Assistant
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        role: "client",
                      })
                    }
                    className={`rounded-xl border p-3 text-sm font-medium transition ${
                      formData.role === "client"
                        ? "border-yellow-400 bg-yellow-400/15 text-yellow-400"
                        : "border-white/20 bg-white/5 text-white/70 hover:border-white/40"
                    }`}
                  >
                    Client
                  </button>

                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-yellow-400 py-3.5 font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>

            </form>

            {/* Login Link */}
            <p className="mt-7 text-center text-sm text-white/70">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-yellow-400 transition hover:text-yellow-300"
              >
                Login
              </Link>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
