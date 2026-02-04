import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "./firebase.auth.js";
import { json2csv } from "json-2-csv";

function getMonthPrefix(yearMonth = "2026-01") {
  return yearMonth; // e.g. "2026-01"
}

export async function download(email, yearMonth = "2026-01") {
  if (!email) {
    return "Email is required";
  }

  console.log("Generating report for email:", email);

  // Step 1: Get the user document once
  const userRef = doc(db, "users", email);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return "User not found";
  }

  const userData = userSnap.data();
  const username = userData.name || "Unknown";

  // Step 2: Get all attendance documents for this user only
  const attendanceColl = collection(db, "users", email, "attendance");

  // Optional: sort by date (newest first)
  // const q = query(attendanceColl, orderBy("__name__", "desc"));
  const monthPrefix = getMonthPrefix(yearMonth);
  const q = query(
    attendanceColl,
    where("__name__", ">=", monthPrefix),
    where("__name__", "<", `${monthPrefix}z`), // lexical upper bound trick
    orderBy("__name__"),
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return "No attendance records found for this user";
  }

  const rows = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const date = docSnap.id;

    let checkIn = "-";
    let checkOut = "-";
    let totalHours = 0;

    if (data.checkInTime) {
      const inDate = data.checkInTime.toDate();
      checkIn = inDate.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      });

      if (data.checkOutTime) {
        const outDate = data.checkOutTime.toDate();
        checkOut = outDate.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "short",
        });

        const diffMs = outDate.getTime() - inDate.getTime();
        const diffMin = diffMs / 1000 / 60;
        totalHours = Math.max(0, (diffMin - 60) / 60); // minus 1 hour lunch
      }
    }

    rows.push({
      Username: username,
      Email: email,
      Date: date,
      Status: data.status,
      "Task-Done": data.tasks,
      "Work-Mode": data.workMode,
      "WFH-Approved": data.wfhApproved,
      "WFH-Reason": data.wfhReason,
      "Leave-Reason": data.leaveReason,
      "Check-in Time": checkIn,
      "Check-out Time": checkOut,
      "Total Worked Hours (minus 1h lunch)": totalHours.toFixed(2),
    });
  }

  try {
    // Convert to CSV using json-2-csv
    const csv = json2csv(rows, {
      delimiter: {
        field: ",",
        eol: "\n",
      },
      keys: [
        "Username",
        "Email",
        "Date",
        "Status",
        "Task-Done",
        "Work-Mode",
        "WFH-Approved",
        "WFH-Reason",
        "Leave-Reason",
        "Check-in Time",
        "Check-out Time",
        "Total Worked Hours (minus 1h lunch)",
      ],
      excelBOM: true, // good for Excel compatibility
    });

    return csv;
  } catch (err) {
    console.error("CSV conversion error:", err);
    return "Error generating CSV";
  }
}
