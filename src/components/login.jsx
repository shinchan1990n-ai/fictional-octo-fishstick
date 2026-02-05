import { useState, useEffect } from "react";
import { useContext } from "react";
import { AuthContext } from "./context/userContext.jsx";
import { loginWithEmail, logout } from "../utils/firebase.config";
import { auth } from "../utils/firebase.auth.js";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import {
  Mail,
  Lock,
  User,
  LogOut,
  Loader2,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { useNavigate } from "react-router";
import binaireLogo from "../assets/binaire_website_logomark_black.svg";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
  });
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();

  const context = useContext(AuthContext);
  if (context === null) {
    return new Error("useAuth must be used within an AuthProvider");
  }

  const { loggedInUser, setLoggedInUser } = context;

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("Processing...");

    try {
      const response = await loginWithEmail(formData.email, formData.password);
      setLoggedInUser({ email: formData.email, uid: response.uid });
      console.log("context logged in user : ", loggedInUser);
      setStatus("Logged in successfully!");
      if (formData.email === "tempAdmin001@gmail.com") {
        navigate("/mainadmindashboard");
      } else {
        navigate("/calendar");
      }
    } catch (err) {
      console.error("Authentication Error:", err);
      setLoggedInUser(null);
      setError(err.message.replace("Firebase: ", ""));
      setStatus("");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setFormData({ email: "", password: "", displayName: "" });
      setStatus("Logged out.");
      setLoggedInUser(null);
      await signInAnonymously(auth);
    } catch (err) {
      setError("Logout failed.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-200 selection:bg-neutral-600 selection:text-neutral-100 flex flex-col items-center justify-center p-4 gap-6">
      <div className="w-full mx-auto absolute top-0 inset-x-0 px-10 flex items-center justify-center p-3">
        <div className="relative w-fit sm:ml-[90px] h-full">
          <img src={binaireLogo} className="h-10 ml-8" loading="lazy" />
        </div>
      </div>
      <div className="sm:text-6xl text-3xl font-Bricolage font-bold">
        HR system
      </div>
      <div className="w-full max-w-md">
        <div className="bg-white border border-neutral-400 rounded-xl shadow-xs overflow-hidden">
          <div className="bg-neutral-800 p-8 text-white text-center">
            <h1 className="text-3xl font-bold font-Bricolage mb-2">Sign In</h1>
            <p className="text-neutral-100 text-sm opacity-80 font-Sora">
              With pre-verified credentials only.
            </p>
          </div>

          <form onSubmit={handleAuth} className="font-Sora p-8 space-y-5">
            {(error || status) && (
              <div
                className={`font-Sora flex items-center gap-2 p-3 rounded-lg text-sm border ${error ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"}`}
              >
                {error ? <AlertCircle className="w-4 h-4 shrink-0" /> : null}
                {error ? "Write correct credentials" : status ? status : ""}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  required
                  type="email"
                  placeholder="name@example.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-neutral-500 outline-none transition-all"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-neutral-500 outline-none transition-all"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-neutral-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`cursor-pointer w-full flex items-center justify-center gap-2 ${formData.email ? (formData.password ? "bg-emerald-600 hover:bg-emerald-700" : "bg-neutral-600 hover:bg-neutral-700") : "bg-neutral-600 hover:bg-neutral-700"} text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-neutral-100`}
            >
              Sign In
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
        <p className="text-center text-slate-400 text-xs mt-8">
          Authentication powered by Binaire
        </p>
      </div>
    </div>
  );
}
