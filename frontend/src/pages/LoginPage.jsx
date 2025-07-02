import { useState } from "react";
import { Link } from "react-router-dom";
import useLogin from "../hooks/useLogin";
import Footer from "../components/Footer";
import ThemeSelector from "../components/ThemeSelector";
import { useThemeStore } from "../store/useThemeStore";

const LoginPage = () => {
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const { theme } = useThemeStore();
  const { isPending, error, loginMutation } = useLogin();

  const handleLogin = (e) => {
    e.preventDefault();
    loginMutation(loginData);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-base-100" data-theme={theme}>
      <div className="flex-grow flex items-center justify-center min-h-[80vh]">
        <div className="border border-primary/10 flex flex-col w-full max-w-md mx-auto bg-base-100 rounded-3xl shadow-xl overflow-hidden my-6 md:my-10 transition-transform duration-300 hover:scale-[1.01]">
          <div className="card-body p-5 sm:p-8 md:p-10 space-y-6">
            {/* LOGO and ThemeSelector in same row */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-medium" style={{ fontFamily: 'Pacifico, cursive', letterSpacing: '2px' }}>
                  <span className="font-aicon">Converse</span>
                </span>
              </div>
              <div className="flex items-center">
                <ThemeSelector />
              </div>
            </div>

            {/* ERROR MESSAGE DISPLAY */}
            {error && (
              <div className="alert alert-error mb-4">
                <span>{error?.response?.data?.message || error?.message || "An error occurred"}</span>
              </div>
            )}

            <div className="w-full">
              <form onSubmit={handleLogin}>
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold">Welcome Back</h2>
                    <p className="text-sm opacity-70">
                      Sign in to your account to continue your chat journey
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="form-control w-full space-y-2">
                      <label className="label">
                        <span className="label-text">Email</span>
                      </label>
                      <input
                        type="email"
                        placeholder="hello@example.com"
                        className="input input-bordered w-full"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-control w-full space-y-2">
                      <label className="label">
                        <span className="label-text">Password</span>
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="input input-bordered w-full"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                      />
                    </div>

                    <button type="submit" className="btn btn-primary w-full" disabled={isPending}>
                      {isPending ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </button>

                    <div className="text-center mt-4">
                      <p className="text-sm">
                        Don't have an account?{" "}
                        <Link to="/signup" className="text-primary hover:underline">
                          Create one
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};
export default LoginPage;
