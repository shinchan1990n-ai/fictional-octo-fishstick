import { AttendanceCalendar } from "./components/calendar";
import Login from "./components/login";
import { Routes, Route } from "react-router-dom";
import { TrackingInterface } from "./components/trackingInterface";
import { Loader } from "./components/loader";
import { MainAdminDashboard } from "./components/mainDashboard";

function App() {
  return (
    <>
      <div className="">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/calendar" element={<AttendanceCalendar />} />
          <Route path="/trackinginterface" element={<TrackingInterface />} />
          <Route path="/loader" element={<Loader />} />
          <Route path="/mainadmindashboard" element={<MainAdminDashboard />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
