import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../lib/api";
import Footer from "../components/Footer";
import ThemeSelector from "../components/ThemeSelector";
import { useThemeStore } from "../store/useThemeStore";
import toast from "react-hot-toast";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const { theme } = useThemeStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await forgotPassword({ email });
      if (res.success) {
        toast.success(res.message || "OTP sent to your email");
        if (res.otp) {
          setOtpValue(res.otp);
          setShowOtpPopup(true);
          setTimeout(() => {
            setShowOtpPopup(false);
            navigate("/verify-otp", { state: { email, otp: res.otp } });
          }, 3000);
        } else {
          navigate("/verify-otp", { state: { email, otp: res.otp } });
        }
      } else {
        toast.error(res.message || "Failed to send OTP");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Error sending OTP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-base-100" data-theme={theme}>
      {/* OTP Popup */}
      {showOtpPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-base-100 text-base-content rounded-lg shadow-lg p-6 w-full max-w-xs mx-auto flex flex-col items-center relative">
            <h2 className="text-lg font-semibold mb-2 text-primary">Your OTP</h2>
            <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded text-xl font-bold mb-4">
              <span>{otpValue}</span>
            </div>
            <p className="text-gray-600 text-sm text-center">Copy and use this OTP to verify your account.</p>
          </div>
        </div>
      )}
      <div className="flex-grow flex items-center justify-center min-h-[80vh]">
        <div className="border border-primary/10 flex flex-col w-full max-w-md mx-auto bg-base-100 rounded-3xl shadow-xl overflow-hidden my-6 md:my-10 transition-transform duration-300 hover:scale-[1.01]">
          <div className="card-body p-5 sm:p-8 md:p-10 space-y-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-medium" style={{ fontFamily: 'Pacifico, cursive', letterSpacing: '2px' }}>
                <span className="font-aicon">Converse</span>
              </span>
              <ThemeSelector />
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Forgot Password</h2>
                <p className="text-sm opacity-70">Enter your email to receive an OTP for password reset.</p>
              </div>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Email</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered w-full"
                  placeholder="hello@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
                {isLoading ? <span className="loading loading-spinner loading-xs"></span> : "Send OTP"}
              </button>
            </form>
            <div className="text-center mt-4">
              <button
                type="button"
                className="text-primary hover:underline text-sm"
                onClick={() => navigate("/login")}
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ForgotPasswordPage; 