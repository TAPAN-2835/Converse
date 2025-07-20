import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyResetOtp } from "../lib/api";
import Footer from "../components/Footer";
import ThemeSelector from "../components/ThemeSelector";
import { useThemeStore } from "../store/useThemeStore";
import toast from "react-hot-toast";

const OtpVerificationPage = () => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const inputRefs = useRef([]);
  const email = location.state?.email;
  const devOtp = location.state?.otp;

  useEffect(() => {
    if (!email) navigate("/forgot-password");
    if (devOtp) {
      const otpStr = String(devOtp).padEnd(6, "");
      setOtp(otpStr.split("").slice(0, 6));
    }
  }, [email, devOtp, navigate]);

  const handleChange = (idx, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[idx] = value;
    setOtp(newOtp);
    if (value && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await verifyResetOtp({ email, otp: otp.join("") });
      if (res.success) {
        toast.success(res.message || "OTP verified");
        navigate("/reset-password", { state: { email } });
      } else {
        toast.error(res.message || "Invalid OTP");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Error verifying OTP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-base-100" data-theme={theme}>
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
                <h2 className="text-xl font-semibold">Enter OTP</h2>
                <p className="text-sm opacity-70">Enter the 6-digit OTP sent to your email.</p>
              </div>
              <div className="flex gap-2 justify-center">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="input input-bordered w-12 text-center text-xl font-bold"
                    value={digit}
                    onChange={e => handleChange(idx, e.target.value)}
                  />
                ))}
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={isLoading || otp.some(d => !d)}>
                {isLoading ? <span className="loading loading-spinner loading-xs"></span> : "Verify OTP"}
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

export default OtpVerificationPage; 