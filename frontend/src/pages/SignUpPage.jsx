import { useState } from "react";
import { Link } from "react-router-dom";
import useSignUp from "../hooks/useSignUp";
import Footer from "../components/Footer";
import ThemeSelector from "../components/ThemeSelector";
import { useThemeStore } from "../store/useThemeStore";

const SignUpPage = () => {
  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const { theme } = useThemeStore();
  const { isPending, error, signupMutation } = useSignUp();

  const handleSignup = (e) => {
    e.preventDefault();
    signupMutation(signupData);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-base-100" data-theme={theme}>
      <div className="flex-grow flex items-center justify-center min-h-[80vh]">
        <div className="flex w-full max-w-6xl mx-auto">
          {/* SIGNUP FORM - LEFT SIDE */}
          <div className="border border-primary/10 flex flex-col w-full lg:w-1/2 mx-auto bg-base-100 rounded-3xl shadow-xl overflow-hidden my-6 md:my-10 transition-transform duration-300 hover:scale-[1.01]">
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
              {/* ERROR MESSAGE IF ANY */}
              {error && (
                <div className="alert alert-error mb-4">
                  <span>{error?.response?.data?.message || error?.message || "An error occurred"}</span>
                </div>
              )}
              <div className="w-full">
                <form onSubmit={handleSignup}>
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold">Create an Account</h2>
                      <p className="text-sm opacity-70">
                        Join <span className="font-aicon">Converse</span> and start chatting with friends!
                      </p>
                    </div>
                    <div className="space-y-3">
                      {/* FULLNAME */}
                      <div className="form-control w-full">
                        <label className="label">
                          <span className="label-text">Full Name</span>
                        </label>
                        <input
                          type="text"
                          placeholder="John Doe"
                          className="input input-bordered w-full"
                          value={signupData.fullName}
                          onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                          required
                        />
                      </div>
                      {/* EMAIL */}
                      <div className="form-control w-full">
                        <label className="label">
                          <span className="label-text">Email</span>
                        </label>
                        <input
                          type="email"
                          placeholder="john@gmail.com"
                          className="input input-bordered w-full"
                          value={signupData.email}
                          onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                          required
                        />
                      </div>
                      {/* PASSWORD */}
                      <div className="form-control w-full">
                        <label className="label">
                          <span className="label-text">Password</span>
                        </label>
                        <input
                          type="password"
                          placeholder="********"
                          className="input input-bordered w-full"
                          value={signupData.password}
                          onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                          required
                        />
                        <p className="text-xs opacity-70 mt-1">
                          Password must be at least 6 characters long
                        </p>
                      </div>
                      <div className="form-control">
                        <label className="label cursor-pointer justify-start gap-2">
                          <input type="checkbox" className="checkbox checkbox-sm" required />
                          <span className="text-xs leading-tight">
                            I agree to the{" "}
                            <span className="text-primary hover:underline">terms of service</span> and{" "}
                            <span className="text-primary hover:underline">privacy policy</span>
                          </span>
                        </label>
                      </div>
                    </div>
                    <button className="btn btn-primary w-full" type="submit">
                      {isPending ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          Loading...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </button>
                    <div className="text-center mt-4">
                      <p className="text-sm">
                        Already have an account?{" "}
                        <Link to="/login" className="text-primary hover:underline">
                          Sign in
                        </Link>
                      </p>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
          
          {/* ILLUSTRATION - RIGHT SIDE */}
          <div className="hidden lg:flex w-full lg:w-1/2 bg-primary/10 items-center justify-center">
            <div className="max-w-md p-8">
              {/* Illustration */}
              <div className="relative aspect-square max-w-sm mx-auto">
                <img src="/i.png" alt="Chatting illustration" className="w-full h-full" />
              </div>
              <div className="text-center space-y-3 mt-6">
                <h2 className="text-xl font-semibold">Connect with friends worldwide</h2>
                <p className="opacity-70">
                  Chat, make friends, and have fun conversations together!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SignUpPage;
