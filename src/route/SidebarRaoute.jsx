import { lazy } from "react";
import { FaTachometerAlt, FaUser, FaRoute, FaWallet, FaBell, FaHeadset, FaLayerGroup } from "react-icons/fa";

const Dashboard = lazy(() => import("../pages/driver/DriverDashboard"));
const DriverProfile = lazy(() => import("../pages/driver/DriverProfile"));
const DriverTrips = lazy(() => import("../pages/driver/DriverTrips"));
const DriverWallet = lazy(() => import("../pages/driver/DriverWallet"));
const DriverNotifications = lazy(() => import("../pages/driver/DriverNotifications"));
const DriverSupport = lazy(() => import("../pages/driver/DriverSupport"));
const ScheduledJobs = lazy(() => import("../pages/driver/ScheduledJobs"));

const routes = [
  { path: "/dashboard", component: Dashboard, name: "Dashboard", icon: FaTachometerAlt },
  { path: "/driver/trips", component: DriverTrips, name: "Trips", icon: FaRoute },
  { path: "/driver/wallet", component: DriverWallet, name: "Wallet", icon: FaWallet },
  { path: "/driver/scheduled-jobs", component: ScheduledJobs, name: "Bulk Assignments", icon: FaLayerGroup },
  { path: "/driver/notifications", component: DriverNotifications, name: "Notifications", icon: FaBell },
  { path: "/driver/support", component: DriverSupport, name: "Support", icon: FaHeadset },
  { path: "/driver/profile", component: DriverProfile, name: "Profile", icon: FaUser },
];

export default routes;
