import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Loader2, ShieldCheck, LogOut } from "lucide-react";
import { download } from "../utils/downloadReport";
import { generateMonthlyCombinedReport } from "../utils/downloadAllReport";
import { AuthContext } from "./context/userContext";
import { db } from "../utils/firebase.auth.js";
import { collection, getDocs } from "firebase/firestore";
import { logout } from "../utils/firebase.config.js";
import { Loader } from "./loader.jsx";

// --- Admin Dashboard Component ---
export function MainAdminDashboard({ onBack }) {
  const [selectedEmail, setSelectedEmail] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("2026-01"); // default January 2026
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  const { loggedInUser, setLoggedInUser } = context;
  const navigate = useNavigate();

  // Fetch all users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        const usersList = [];
        querySnapshot.forEach((doc) => {
          usersList.push({ id: doc.id, ...doc.data() });
        });
        setAllUsers(usersList);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  // Single user report
  const handleDownloadSingle = async () => {
    if (!selectedEmail) {
      setMsg({ text: "Please select a user first", type: "error" });
      return;
    }

    setDownloading(true);
    setMsg({ text: "", type: "" });

    try {
      const csv = await download(selectedEmail);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance_report_${selectedEmail}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMsg({ text: "Single user report downloaded!", type: "success" });
    } catch (err) {
      console.error(err);
      setMsg({ text: "Failed to download single user report", type: "error" });
    } finally {
      setDownloading(false);
    }
  };

  // Master monthly report for all users
  const handleDownloadMaster = async () => {
    setDownloading(true);
    setMsg({ text: "", type: "" });

    try {
      const csv = await generateMonthlyCombinedReport(selectedMonth);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `master_attendance_${selectedMonth}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMsg({ text: "Master monthly report downloaded!", type: "success" });
    } catch (err) {
      console.error(err);
      setMsg({ text: "Failed to download master report", type: "error" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {loggedInUser?.email === "tempadmin001@gmail.com" ? (
        <div className="selection:bg-neutral-600 selection:text-neutral-100 space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-neutral-600 mt-4 ml-3 font-bold text-sm hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to login
          </button>

          <div className="sm:max-w-4xl w-[90%] mx-auto">
            <header className="flex flex-col md:flex-row items-center justify-between bg-white p-6 rounded-xl shadow-xs border border-neutral-300 mb-8 gap-4">
              <div className="flex font-Bricolage items-center gap-4">
                <div className="w-10 h-10 bg-neutral-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                  {loggedInUser.email[0]}
                </div>
                <div>
                  <h1 className="font-bold text-slate-800 leading-tight">
                    Admin Portal
                  </h1>
                  <p className="text-[10px] text-slate-400 font-mono tracking-tighter">
                    {loggedInUser?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  setLoggedInUser({ email: null });
                  navigate("/");
                }}
                className="flex font-Sora items-center gap-2 cursor-pointer px-6 py-2 text-rose-600 font-bold hover:bg-rose-50 rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </header>
          </div>

          <div className="bg-white mb-8 sm:max-w-4xl w-[90%] mx-auto p-8 font-Sora rounded-xl shadow-xs border border-neutral-300 space-y-8">
            <div className="flex items-center gap-4 border-b border-neutral-300 pb-6">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-Bricolage font-black text-slate-800 tracking-tight">
                  Admin Dashboard
                </h2>
                <p className="text-slate-400 text-sm font-medium">
                  Export attendance and activity logs
                </p>
              </div>
            </div>

            {/* Month selector */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Select Month for Report
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Master report button */}
            <button
              onClick={handleDownloadMaster}
              disabled={downloading || !selectedMonth}
              className={`w-full py-3 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-2
                ${downloading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
            >
              {downloading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Master Report...
                </>
              ) : (
                "Download Master Monthly Report (All Users)"
              )}
            </button>

            {/* User list + single report */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Individual User Reports
              </h3>
              {loadingUsers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2 border border-neutral-200 rounded-lg p-2 bg-neutral-50">
                  {allUsers.map((user) => {
                    const email = user.id;
                    const name = user.name || "Unknown";
                    return (
                      <div
                        key={email}
                        onClick={() => {
                          setSelectedEmail(email);
                          handleDownloadSingle();
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition-all flex justify-between items-center
                          ${
                            selectedEmail === email
                              ? "bg-indigo-100 border border-indigo-300"
                              : "hover:bg-neutral-200 border border-transparent"
                          }`}
                      >
                        <div>
                          <div className="font-medium capitalize">{name}</div>
                          <div className="text-sm text-slate-500">{email}</div>
                        </div>
                        {selectedEmail === email && downloading && (
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Messages */}
            {msg.text && (
              <div
                className={`p-4 rounded-lg text-center ${
                  msg.type === "success"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {msg.text}
              </div>
            )}
          </div>
        </div>
      ) : (
        <Loader />
      )}
    </>
  );
}
