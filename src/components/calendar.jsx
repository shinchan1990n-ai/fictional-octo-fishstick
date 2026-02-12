import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import dayjs from "dayjs";
import { ArrowLeft } from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../utils/firebase.auth.js"; // adjust import path
import { AuthContext } from "../components/context/userContext.jsx"; // adjust path
import "react-calendar/dist/Calendar.css"; // don't forget base styles
import { Loader } from "./loader.jsx";

export const AttendanceCalendar = () => {
  const navigate = useNavigate();
  const today = dayjs().format("YYYY-MM-DD"); // "2026-01-31"
  const { loggedInUser } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]); // array of {id: "YYYY-MM-DD", status, ...}
  const [attendanceMap, setAttendanceMap] = useState({}); // {"2026-01-31": {status: "...", ...}}

  useEffect(() => {
    if (!loggedInUser?.email) {
      setLoading(false);
      return;
    }

    const fetchAndInitAttendance = async () => {
      try {
        setLoading(true);

        // 1. Get current user document (assuming doc ID = email)
        const userRef = doc(db, "users", loggedInUser.email);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          console.log("User document not found");
          setLoading(false);
          return;
        }

        const userId = userSnap.id; // = email in your case

        // 2. Reference to attendance subcollection
        const attendanceColl = collection(db, "users", userId, "attendance");

        // 3. Fetch ALL attendance records
        const snapshot = await getDocs(attendanceColl);

        const records = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        // 4. Build map for quick lookup
        const byDate = {};
        records.forEach((r) => {
          byDate[r.id] = r;
        });

        // 5. Check if TODAY exists → create if missing
        if (!byDate[today]) {
          const todayRef = doc(db, "users", userId, "attendance", today);
          const defaultEntry = {
            status: "not-marked", // ← change to "not-marked", "pending", etc.
            autoMarked: true,
            createdAt: serverTimestamp(),
            // reason: "", checkInTime: null, etc.
          };
          await setDoc(todayRef, defaultEntry);
          console.log(`Created default entry for ${today}`);

          // Add to local state immediately
          records.push({ id: today, ...defaultEntry });
          byDate[today] = defaultEntry;
        }

        // 6. Update state
        setAttendanceData(records);
        setAttendanceMap(byDate);
      } catch (err) {
        console.error("Attendance fetch/create error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndInitAttendance();
  }, [loggedInUser?.email, today]); // today as dep → safe if component stays mounted across days

  if (!loggedInUser?.email) {
    return <Loader />;
  }

  const handleDateClick = (date) => {
    const clicked = dayjs(date).format("YYYY-MM-DD");
    if (clicked === today) {
      navigate("/trackinginterface");
    }
  };

  if (loading) {
    return <div className="text-center p-6">Loading calendar...</div>;
  }

  return (
    <div className="w-screen h-screen flex items-center justify-center  selection:bg-neutral-600 selection:text-neutral-100 ">
      {loggedInUser?.email && (
        <div className="flex flex-col w-full h-full justify-center items-center gap-2">
          <button
            onClick={() => navigate("/")}
            className="mt-4 -ml-3.5 flex items-center cursor-pointer hover:underline gap-2 text-neutral-600 font-bold text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to login
          </button>
          <div className="sm:max-w-[400px] w-[95%] h-[60%] border mx-auto bg-neutral-200 flex flex-col justify-start items-center py-4 px-1 rounded-xl shadow-md">
            <h2 className="font-Bricolage text-lg font-semibold mb-4 text-center text-gray-800">
              Attendance Calendar
            </h2>

            <Calendar
              className="mx-auto w-full rounded-xl !h-full overflow-clip border !border-fuchsia-950 !font-Sora sm:text-lg text-xs bg-white"
              onClickDay={handleDateClick}
              // Only allow clicking on today
              tileDisabled={({ date }) => {
                const d = dayjs(date).format("YYYY-MM-DD");
                // Disable all future days + past days without record (adjust rule if needed)
                return d != today;
              }}
              // Color logic
              tileClassName={({ date, view }) => {
                const d = dayjs(date).format("YYYY-MM-DD");
                const record = attendanceMap[d];

                if (d === today) {
                  return "!bg-blue-600 !text-white !font-bold hover:bg-green-700";
                }
                if (!record) {
                  if (date.getDay() === 0 && view == "month") {
                    return "!text-white !bg-black/50 !font-bold";
                  }
                  return "text-gray-400 bg-gray-100"; // missing past day
                }
                if (
                  record.status === "on-leave" ||
                  record.status === "absent"
                ) {
                  return "!bg-red-600 !text-white !font-bold";
                }
                if (record.status === "completed") {
                  return "!bg-green-600 !text-white !font-bold";
                }
                if (record.status === "active" && d !== today) {
                  return "!bg-yellow-600 !text-white !font-bold";
                }
                if (date.getDay() === 0 && view == "month") {
                  return "!text-white !bg-black/50 !font-bold";
                }
                return "bg-gray-200";
              }}
              // Show label under day
              tileContent={({ date }) => {
                const d = dayjs(date).format("YYYY-MM-DD");
                const record = attendanceMap[d];
                if (!record || d > today) return null;

                let label = "";
                let color = "";

                if (record.status === "completed") {
                  label = "Present";
                  color = "text-green-600";
                } else if (record.status === "absent") {
                  label = "Absent";
                  color = "text-red-600";
                }

                return label ? (
                  <div
                    className={`text-xs rounded-full ${label == "Present" ? "bg-green-600" : label == "Absent" ? "bg-red-600" : "bg-gray-800"} mt-1 font-medium `}
                  ></div>
                ) : null;
              }}
            />
          </div>
          <div className="font-Sora text-red-600 text-xs text-start animate-pulse px-5 pt-6">
            Click on today's date to check-in and check-out.
          </div>
          <div className="flex flex-col gap-2 font-Sora max-w-[400px] w-full px-4 py-6">
            <div className="flex gap-2">
              <div className="bg-green-600 rounded-xl size-7 flex"></div>
              <div>Present</div>
            </div>
            <div className="flex gap-2">
              <div className="bg-yellow-600 rounded-xl size-7 flex"></div>
              <div>Incomplete</div>
            </div>
            <div className="flex gap-2">
              <div className="bg-red-600 rounded-xl size-7 flex"></div>
              <div>Absent</div>
            </div>
            <div className="flex gap-2">
              <div className="bg-blue-600 rounded-xl size-7 flex"></div>
              <div>Today(Click-able)</div>
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
};
