
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const demoAccounts = [
  {
    role: "Assistant",
    email: "shreya@gmail.com",
    password: "123456",
  },
  {
    role: "Client",
    email: "aarav@mehtacapital.test",
    password: "Demo@1234",
  },
];

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
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

  const fillDemoAccount = (account) => {
    setFormData({
      email: account.email,
      password: account.password,
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(formData);
      navigate(user.role === "assistant" ? "/assistant" : "/client");
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">

      {/* Full-screen background video - no overlay */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/videos/login-bg.mp4" type="video/mp4" />
      </video>

      {/* Main content */}
      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-2">

        {/* Left section */}
        <div className="flex flex-col justify-between px-8 py-8 sm:px-14 lg:px-20 lg:py-12">

          {/* Logo */}
          <Link to="/login" className="flex w-fit items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400 text-black shadow-lg shadow-yellow-400/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </div>

            <span className="text-2xl font-bold tracking-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]">
              Mailyx<span className="text-yellow-400">.</span>
            </span>
          </Link>

          {/* Welcome text */}
          <div className="my-12 max-w-xl lg:my-0">
            <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-yellow-400 [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]">
              <span className="h-px w-8 bg-yellow-400" />
              Your intelligent email assistant
            </p>

            <h1 className="text-5xl font-semibold leading-[1.12] tracking-tight sm:text-6xl xl:text-7xl [text-shadow:0_3px_20px_rgba(0,0,0,0.8)]">
              Welcome
              <br />
              <span className="text-white/90">back.</span>
            </h1>

            <p className="mt-7 max-w-md text-base leading-8 text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.9)] sm:text-lg">
              Your inbox, intelligently managed. Let AI handle the busywork
              while you focus on what matters.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <div className="rounded-full border border-white/30 bg-black/20 px-4 py-2 text-xs text-white backdrop-blur-sm">
                AI-powered email management
              </div>
              <div className="rounded-full border border-white/30 bg-black/20 px-4 py-2 text-xs text-white backdrop-blur-sm">
                Smarter workflows
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="hidden text-xs text-white/80 [text-shadow:0_2px_8px_rgba(0,0,0,0.8)] lg:block">
            © 2026 Mailyx. All rights reserved.
          </p>
        </div>

        {/* Right section */}
        <div className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-14">

          {/* Glassmorphic login card */}
          <div className="w-full max-w-md rounded-3xl border border-white/25 bg-black/35 p-7 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-9">

            <div className="mb-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 text-yellow-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="23"
                  height="23"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <path d="m10 17 5-5-5-5" />
                  <path d="M15 12H3" />
                </svg>
              </div>

              <h2 className="text-3xl font-semibold tracking-tight">
                Sign in
              </h2>

              <p className="mt-2 text-sm text-white/70">
                Welcome back! Enter your details to continue.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/15 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Email address
                </label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  required
                  className="w-full rounded-xl border border-white/25 bg-white/10 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/45 focus:border-yellow-400 focus:bg-white/15 focus:ring-2 focus:ring-yellow-400/20"
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Password
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    className="w-full rounded-xl border border-white/25 bg-white/10 px-4 py-3.5 pr-12 text-sm text-white outline-none transition placeholder:text-white/45 focus:border-yellow-400 focus:bg-white/15 focus:ring-2 focus:ring-yellow-400/20"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/65 transition hover:text-yellow-400"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.2-2.4 3.3" />
                        <path d="M6.2 6.2C3.9 7.7 2.7 10 2.5 12c1 2.5 4.5 7 9.5 7 1.4 0 2.7-.3 3.8-.9" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3.5 font-semibold text-black transition duration-300 hover:bg-yellow-300 hover:shadow-lg hover:shadow-yellow-400/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in to Mailyx"}

                {!loading && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                )}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/20" />
                <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                  Demo accounts
                </span>
                <div className="h-px flex-1 bg-white/20" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {demoAccounts.map((account) => (
                  <button
                    key={account.role}
                    type="button"
                    onClick={() => fillDemoAccount(account)}
                    className="rounded-xl border border-white/20 bg-white/10 p-3 text-left transition hover:border-yellow-400/60 hover:bg-yellow-400/10"
                  >
                    <span className="mb-1 block text-xs font-semibold text-yellow-400">
                      {account.role}
                    </span>

                    <span className="block truncate text-xs text-white">
                      {account.email}
                    </span>

                    <span className="mt-2 block text-[10px] text-white/60">
                      Click to autofill
                    </span>
                  </button>
                ))}
              </div>

              <p className="mt-3 text-center text-[10px] leading-5 text-white/60">
                Assistant: 123456 · Client: Demo@1234
              </p>
            </div>

            {/* Signup */}
            <p className="mt-7 text-center text-sm text-white/70">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-semibold text-yellow-400 transition hover:text-yellow-300"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
