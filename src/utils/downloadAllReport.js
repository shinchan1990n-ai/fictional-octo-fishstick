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

// Helper: month prefix like "2026-01"
function getMonthPrefix(yearMonth = "2026-01") {
  return yearMonth;
}

/**
 * Generates ONE combined CSV report for ALL users in a given month
 * @param {string} [yearMonth="2026-01"] - Format YYYY-MM
 * @returns {Promise<string>} CSV string ready for download
 */
export async function generateMonthlyCombinedReport(yearMonth = "2026-01") {
  console.log(`Generating combined monthly report for: ${yearMonth}`);

  const rows = [];
  const usersCache = {}; // email → {name}

  try {
    // Step 1: Get all users
    const usersColl = collection(db, "users");
    const usersSnap = await getDocs(usersColl);

    if (usersSnap.empty) {
      return "No users found in the system.";
    }

    // Step 2: For each user → fetch their attendance for the month
    for (const userDoc of usersSnap.docs) {
      const email = userDoc.id;
      const userData = userDoc.data();
      const username = userData.name || "Unknown";
      console.log("email : ", email);

      usersCache[email] = { name: username };

      // Attendance subcollection
      const attendanceColl = collection(db, "users", email, "attendance");

      // Filter only documents in the selected month
      const monthPrefix = getMonthPrefix(yearMonth);
      const q = query(
        attendanceColl,
        where("__name__", ">=", monthPrefix),
        where("__name__", "<", `${monthPrefix}z`),
        orderBy("__name__"),
      );

      const attSnap = await getDocs(q);

      for (const attDoc of attSnap.docs) {
        const data = attDoc.data();
        const date = attDoc.id;
        console.log("inside data : ", date);

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
            totalHours = Math.max(0, (diffMin - 60) / 60);
          }
        }

        rows.push({
          Username: username,
          Email: email,
          Date: date,
          Status: data.status || "-",
          "Task-Done": data.tasks || "-",
          "Work-Mode": data.workMode || "-",
          "WFH-Approved": data.wfhApproved ?? "-",
          "WFH-Reason": data.wfhReason || "-",
          "Leave-Reason": data.leaveReason || "-",
          "Check-in Time": checkIn,
          "Check-out Time": checkOut,
          "Total Worked Hours (minus 1h lunch)": totalHours.toFixed(2),
        });
      }
    }

    if (rows.length === 0) {
      return "No attendance records found for the selected month.";
    }

    // Convert all rows to CSV
    const csv = json2csv(rows, {
      delimiter: { field: ",", eol: "\n" },
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
      excelBOM: true,
    });

    return csv;
  } catch (err) {
    console.error("Combined report error:", err);
    throw err;
  }
}
