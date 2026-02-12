import { useState, useEffect, useMemo, useContext } from "react";
import { AuthContext } from "./context/userContext";
import { getDateId } from "../utils/date";
import useGeolocation from "./hooks/useLocation";
import { calculateDistance } from "../utils/distance";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  PlaneTakeoff,
  Home,
  MapPin,
  Send,
  CheckCircle2,
  Loader2,
  LogOut,
} from "lucide-react";
import {
  doc,
  collection,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../utils/firebase.auth.js";
import { logout } from "../utils/firebase.config.js";
import { Loader } from "./loader.jsx";

export function TrackingInterface({ onBack }) {
  const navigate = useNavigate();

  const [isOnLeave, setIsOnLeave] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");

  const [isWFH, setIsWFH] = useState(false);
  const [isWFHApproved, setIsWFHApproved] = useState(false);
  const [wfhReason, setWfhReason] = useState("");
  const [isWFHSubmitted, setIsWFHSubmitted] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);

  const [attendanceStatus, setAttendanceStatus] = useState("idle");
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [dailyTask, setDailyTask] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOnTime, setOnTime] = useState(false);

  const context = useContext(AuthContext);
  if (context === null) {
    return new Error("useAuth must be used within an AuthProvider");
  }
  const { loggedInUser, setLoggedInUser } = context;

  const today = getDateId();

  //using custom hook for location and setting office - coordinates
  const { coords, error: geoError, loading: geoLoading } = useGeolocation();
  const OFFICE_LOCATION = {
    lat: 28.51107,
    lng: 77.222729,
    radiusMeters: 200,
  };

  //using worldtimeapi to get currnt indian time.
  // async function getServerTime() {
  //   try {
  //     const response = await fetch(
  //       "https://worldtimeapi.org/api/timezone/Asia/Kolkata",
  //     );
  //     const data = await response.json();
  //     return new Date(data.datetime);
  //   } catch (error) {
  //     console.error(
  //       "Failed to fetch server time, falling back to local:",
  //       error,
  //     );
  //     return new Date();
  //   }
  // }
  //isWithinTimeRange function to check current indian time at moment which user opened the app is within range.
  //now is the time from server.
  const isWithinTimeRange = (now, startH, startM, endH, endM) => {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTimeMinutes = hours * 60 + minutes;
    const startTimeMinutes = startH * 60 + startM;
    const endTimeMinutes = endH * 60 + endM;
    return (
      currentTimeMinutes >= startTimeMinutes &&
      currentTimeMinutes <= endTimeMinutes
    );
  };

  //it will run when loggedInUser is detected.
  //it will update the state variables with the user's database entries.
  useEffect(() => {
    if (!loggedInUser?.email) return;
    const q = query(collection(db, "users", loggedInUser.email, "attendance"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log("checked-in : ", data.checkInTime);
        const date = data.checkInTime?.toDate().toDateString();
        console.log("date : ", date);
        const todayStr = new Date().toDateString();
        console.log("today str : ", todayStr);
        if (date === todayStr) {
          if (data.status === "active") {
            setActiveSessionId(doc.id);
            setAttendanceStatus("checked-in");
            if (data.workMode === "WFH") {
              setIsWFH(true);
              setIsWFHSubmitted(true);
              setWfhReason(data.wfhReason || "");
              setIsWFHApproved(data.wfhApproved || false);
            }
          } else if (data.status === "completed") {
            setAttendanceStatus("checked-out");
          } else if (data.status === "on-leave") {
            setAttendanceStatus("on-leave");
            setIsOnLeave(true);
            setLeaveReason(data.reason || "");
          }
        }
      });
    });
    return () => unsubscribe();
  }, [loggedInUser]);

  //this helps to memoise the distance using calculateDistance function which uses haversine formula to calculateDistance b/w two coords.
  const distance = useMemo(() => {
    if (!coords) return null;
    return calculateDistance(
      coords.latitude,
      coords.longitude,
      OFFICE_LOCATION.lat,
      OFFICE_LOCATION.lng,
    );
  }, [coords]);

  //calculating is within radius or not.
  const isWithinRadius =
    distance !== null && distance <= OFFICE_LOCATION.radiusMeters;

  //can check in using conditions.
  //you can check only when wfh = true or you are in radius and geo location is loaded and loading is done
  const canCheckIn =
    (isWFH || isWithinRadius) &&
    !geoLoading &&
    !loading &&
    attendanceStatus === "idle";

  //you can check out when attendanceStatus == checked-in and not loading and dailyTask length > 5
  const canCheckOut =
    attendanceStatus === "checked-in" &&
    !loading &&
    dailyTask.trim().length > 10;

  const handleCheckIn = async () => {
    if (!loggedInUser || !canCheckIn) return <Loader />;
    setLoading(true);
    try {
      const attendanceCollRef = doc(
        db,
        "users",
        loggedInUser.email,
        "attendance",
        today,
      );
      await setDoc(
        attendanceCollRef,
        {
          checkInTime: serverTimestamp(),
          checkOutTime: null,
          status: "active",
          workMode: isWFH ? "WFH" : "Office",
          wfhReason: isWFH ? wfhReason : null,
          wfhApproved: isWFH ? isWFHApproved : null,
          locationIn: isWFH
            ? null
            : { lat: coords?.latitude || null, lng: coords?.longitude || null },
          userEmail: loggedInUser.email,
        },
        { merge: true },
      );
      setCheckInTime(serverTimestamp());
      console.log("check in time : ", checkInTime);
      alert("check in submitted");
    } catch (err) {
      alert(err);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveSubmit = async () => {
    if (!loggedInUser || attendanceStatus !== "idle") return <Loader />;
    setLoading(true);
    console.log("clicked submitted leave");
    try {
      const attendanceCollRef = doc(
        db,
        "users",
        loggedInUser.email,
        "attendance",
        today,
      );
      console.log("attendance collection ref : ", attendanceCollRef.data);
      await setDoc(
        attendanceCollRef,
        {
          checkInTime: serverTimestamp(),
          status: "on-leave",
          leaveReason: leaveReason,
          userEmail: loggedInUser.email,
        },
        { merge: true },
      );
      console.log("passed attendanceCollRef");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOutSubmit = async () => {
    if (!loggedInUser || !activeSessionId || !canCheckOut) return <Loader />;
    console.log("checkOutTime clicked ");
    setLoading(true);
    try {
      const docRef = doc(db, "users", loggedInUser.email, "attendance", today);
      await updateDoc(docRef, {
        checkOutTime: serverTimestamp(),
        status: "completed",
        tasks: dailyTask,
        locationOut: isWFH
          ? null
          : { lat: coords?.latitude || null, lng: coords?.longitude || null },
      });
      alert("checkOutTime submitted");
    } catch (err) {
      alert(err);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleWFHSubmit = () => {
    if (wfhReason.trim().length >= 10) {
      setIsWFHSubmitted(true);
    } else {
      alert("write reasonable reason.");
    }
  };

  function handleSignOut() {
    logout();
    setLoggedInUser({ email: null });
    navigate("/");
  }

  if (!loggedInUser?.email) {
    return <Loader />;
  }

  const Toggle = ({ active, onToggle, label, icon: Icon, disabled }) => (
    <div
      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${active ? "bg-neutral-50 border-neutral-200" : "bg-slate-50 border-slate-100"} ${disabled ? "opacity-40 grayscale" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg ${active ? "bg-neutral-600 text-white" : "bg-slate-200 text-slate-500"}`}
        >
          {Icon && <Icon className="w-4 h-4" />}
        </div>
        <span
          className={`text-sm font-bold ${active ? "text-neutral-900" : "text-slate-600"}`}
        >
          {label}
        </span>
      </div>
      <button
        disabled={disabled}
        onClick={onToggle}
        className={`h-6 w-11 rounded-full relative transition-colors ${active ? "bg-emerald-600" : "bg-slate-300"} ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div
          className={`absolute top-1 left-1 h-4 w-4 bg-white rounded-full transition-transform ${active ? "translate-x-5" : ""}`}
        />
      </button>
    </div>
  );

  return (
    <div>
      {loggedInUser?.email && (
        <div className="  selection:bg-neutral-600 px-1 selection:text-neutral-100 space-y-6 max-w-md mx-auto">
          <button
            onClick={() => navigate("/calendar")}
            className="mt-4 ml-3 flex items-center cursor-pointer hover:underline gap-2 text-neutral-600 font-bold text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to calendar
          </button>

          <div className="max-w-4xl mx-auto">
            <header className="flex flex-col md:flex-row items-center justify-between bg-white py-6 px-4 rounded-xl shadow-xs border border-neutral-300 mb-8 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-neutral-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                  {loggedInUser?.email[0]}
                </div>
                <div>
                  <h1 className="font-bold font-Bricolage text-slate-800 leading-tight">
                    Attendance Portal
                  </h1>
                  <p className="text-[10px] text-slate-400 font-Sora tracking-tighter">
                    {loggedInUser?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleSignOut()}
                className="flex items-center gap-2 cursor-pointer px-6 py-2 text-rose-600 font-bold hover:bg-rose-50 rounded-xl transition-all font-Sora"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </header>
          </div>
          {attendanceStatus !== "idle" && (
            <div className=" bg-white py-6 px-4 rounded-xl shadow-xs border border-neutral-300 mb-8 gap-4 max-w-4xl mx-auto flex flex-col text-blue-800 animate-pulse font-Sora ">
              <div>
                {attendanceStatus === "checked-in"
                  ? `You are now checked-in`
                  : attendanceStatus === "checked-out"
                    ? "You are now checked-out"
                    : ""}
                {attendanceStatus === "checked-in" ? checkInTime : ""}
              </div>
            </div>
          )}

          <div className="bg-white mb-8 font-Sora py-8 rounded-xl shadow-xs border border-neutral-300 space-y-8 relative overflow-hidden px-1">
            {/* Toggle Section */}
            <div
              className={`space-y-3 ${attendanceStatus !== "idle" ? "opacity-30 grayscale pointer-events-none" : ""}`}
            >
              <Toggle
                label="On-Leave"
                icon={PlaneTakeoff}
                active={isOnLeave}
                onToggle={() => setIsOnLeave(!isOnLeave)}
                disabled={
                  attendanceStatus === "idle" && attendanceStatus === "on-leave"
                }
              />
            </div>

            {/* Holiday Mode Logic */}
            {isOnLeave && (
              <div className="p-6 bg-rose-50 rounded-xl border border-rose-200 space-y-4 animate-in fade-in slide-in-from-top-4">
                <label className="text-xs font-bold text-rose-600 block uppercase tracking-widest">
                  Reason for holiday
                </label>
                <textarea
                  placeholder="e.g. Family emergency, Vacation, Medical..."
                  disabled={attendanceStatus === "on-leave"}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full min-h-[100px] p-4 bg-white border border-rose-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-400 text-rose-900 placeholder-rose-300 transition-all"
                />
                <button
                  onClick={handleLeaveSubmit}
                  disabled={
                    attendanceStatus === "on-leave" ||
                    leaveReason.length < 5 ||
                    loading
                  }
                  className={`w-full bg-amber-400 text-amber-900 font-bold py-4 rounded-xl shadow-md hover:bg-amber-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${attendanceStatus === "on-leave" ? "disabled:cursor-not-allowed" : ""}`}
                >
                  {attendanceStatus === "on-leave" ? (
                    "Leave Submitted"
                  ) : loading ? (
                    <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            )}

            {/* Other options container */}
            <div
              className={`space-y-8 transition-all duration-300 ${isOnLeave ? "opacity-30 grayscale pointer-events-none" : ""}`}
            >
              <div className="space-y-3">
                <Toggle
                  label="Work from home"
                  icon={Home}
                  active={isWFH}
                  onToggle={() => setIsWFH(!isWFH)}
                  disabled={attendanceStatus !== "idle"}
                />

                {/* WFH Logic */}
                {isWFH && (
                  <div className="p-6 bg-neutral-50 rounded-xl border border-neutral-200 space-y-4 animate-in fade-in slide-in-from-top-4">
                    <Toggle
                      label="Approved by Manager"
                      icon={CheckCircle2}
                      active={isWFHApproved}
                      onToggle={() => setIsWFHApproved(!isWFHApproved)}
                      disabled={isWFHSubmitted}
                    />

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-600 block uppercase tracking-widest">
                        Reason for WFH
                      </label>
                      <textarea
                        placeholder="e.g. Home delivery, Maintenance, Remote day... WRITE REASONABLE LENGTH OF REASON."
                        disabled={isWFHSubmitted}
                        value={wfhReason}
                        onChange={(e) => setWfhReason(e.target.value)}
                        className="w-full min-h-[100px] p-4 bg-white border border-neutral-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-neutral-400 text-neutral-900 placeholder-neutral-300 transition-all"
                      />
                    </div>

                    {!isWFHSubmitted && (
                      <button
                        onClick={handleWFHSubmit}
                        disabled={wfhReason.trim().length < 10}
                        className="w-full bg-amber-400 text-amber-900 font-bold py-4 rounded-xl shadow-md hover:bg-amber-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        Submit
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Action Grid Section (Disabled if WFH enabled but not submitted) */}
              <div
                className={`p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-6 transition-opacity ${isWFH && !isWFHSubmitted ? "opacity-30 pointer-events-none" : ""}`}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-amber-100 p-4 rounded-xl text-center font-bold text-amber-900 text-sm shadow-sm flex items-center justify-center">
                    Check-in
                  </div>
                  <button
                    disabled={!canCheckIn}
                    onClick={handleCheckIn}
                    className={`p-4 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${!canCheckIn ? "bg-slate-200 text-slate-400" : "bg-amber-400 text-amber-900 hover:bg-amber-500 active:scale-95"}`}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : attendanceStatus === "checked-in" ? (
                      "entry saved"
                    ) : (
                      "submit"
                    )}
                  </button>

                  <div className="bg-amber-100 p-4 rounded-xl text-center font-bold text-amber-900 text-sm shadow-sm flex items-center justify-center">
                    Check-out
                  </div>
                  <button
                    disabled={!canCheckOut}
                    onClick={handleCheckOutSubmit}
                    className={`p-4 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${!canCheckOut ? "bg-slate-200 text-slate-400" : "bg-amber-400 text-amber-900 hover:bg-amber-500 active:scale-95"}`}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Submit"
                    )}
                  </button>
                </div>

                {/* Standard Range Verification only if NOT WFH */}
                {!isWFH && attendanceStatus === "idle" && (
                  <div
                    className={`p-3 rounded-xl text-[10px] font-bold text-center flex items-center justify-center gap-2 ${isWithinRadius ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                  >
                    <MapPin className="w-3 h-3" />{" "}
                    {isWithinRadius
                      ? "Office Range Verified"
                      : "Outside Office Boundary"}
                  </div>
                )}
                {isWFH && (
                  <div className="p-3 rounded-xl text-[10px] font-bold text-center flex items-center justify-center gap-2 bg-neutral-100 text-neutral-700">
                    <Home className="w-3 h-3" /> Today Working from home.
                  </div>
                )}
              </div>

              {/* Work Done Section */}
              <div
                className={`p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4 transition-opacity ${isWFH && !isWFHSubmitted ? "opacity-30 pointer-events-none" : ""}`}
              >
                <label className="text-xs font-bold text-slate-600 block uppercase tracking-widest">
                  Work done today
                </label>
                <textarea
                  placeholder="what were you working on today ?"
                  disabled={attendanceStatus !== "checked-in"}
                  value={dailyTask}
                  onChange={(e) => setDailyTask(e.target.value)}
                  className="w-full min-h-[100px] p-4 bg-emerald-100/30 border border-emerald-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-400 text-emerald-900 placeholder-emerald-600/50 transition-all"
                />
                <button
                  disabled={
                    dailyTask.trim().length < 10 ||
                    attendanceStatus !== "checked-in"
                  }
                  className="w-full bg-amber-400 text-amber-900 font-bold py-4 rounded-xl shadow-md hover:bg-amber-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  onClick={() => alert("task added")}
                >
                  <Send className="w-4 h-4" /> Submit Task Log
                </button>
              </div>
              <div
                className={`p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-6 transition-opacity ${isWFH && !isWFHSubmitted ? "opacity-30 pointer-events-none" : ""}`}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-amber-100 p-4 rounded-xl text-center font-bold text-amber-900 text-sm shadow-sm flex items-center justify-center">
                    Check-out
                  </div>
                  <button
                    disabled={!canCheckOut}
                    onClick={handleCheckOutSubmit}
                    className={`p-4 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${!canCheckOut ? "bg-slate-200 text-slate-400" : "bg-amber-400 text-amber-900 hover:bg-amber-500 active:scale-95"}`}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Submit"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loggedInUser.email && (
        <div className="bg-gray-200">
          <Loader />
        </div>
      )}
    </div>
  );
}
