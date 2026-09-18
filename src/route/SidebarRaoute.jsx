import { lazy } from "react";
import { FaTachometerAlt, FaUser, FaRoute, FaWallet, FaBell, FaHeadset, FaLayerGroup, FaStore, FaCheckCircle } from "react-icons/fa";

const Dashboard = lazy(() => import("../pages/driver/DriverDashboard"));
const DriverProfile = lazy(() => import("../pages/driver/DriverProfile"));
const DriverTrips = lazy(() => import("../pages/driver/DriverTrips"));
const DriverWallet = lazy(() => import("../pages/driver/DriverWallet"));
const DriverNotifications = lazy(() => import("../pages/driver/DriverNotifications"));
const DriverSupport = lazy(() => import("../pages/driver/DriverSupport"));
const BulkMarketplaceDriver = lazy(() => import("../pages/driver/BulkMarketplaceDriver"));
const ScheduledJobs = lazy(() => import("../pages/driver/ScheduledJobs"));
const Marketplace = lazy(() => import("../pages/driver/Marketplace"));
const MyAcceptedLeads = lazy(() => import("../pages/driver/MyAcceptedLeads"));
const FixedRouteMarketplaceDriver = lazy(() => import("../pages/FixedRouteMarketplaceDriver"));
const MyPackageRidesDriver = lazy(() => import("../pages/MyPackageRidesDriver"));

const DestinationFilter = lazy(() => import("../pages/driver/DestinationFilter"));

const routes = [
  { path: "/dashboard", component: Dashboard, name: "Dashboard", icon: FaTachometerAlt },
  { path: "/driver/trips", component: DriverTrips, name: "Trips", icon: FaRoute },
  { path: "/driver/destination-filter", component: DestinationFilter, name: "Home-Bound Rides", icon: FaRoute },
  { path: "/driver/bulk-marketplace", component: BulkMarketplaceDriver, name: "Bulk Deals", icon: FaStore },
  { path: "/driver/scheduled-jobs", component: ScheduledJobs, name: "Accepted Bulk Deals", icon: FaCheckCircle },
  { path: "/driver/marketplace", component: Marketplace, name: "Lead Marketplace", icon: FaStore },
  { path: "/driver/my-accepted-leads", component: MyAcceptedLeads, name: "Accepted Leads", icon: FaCheckCircle },
  { path: "/driver/fixed-marketplace", component: FixedRouteMarketplaceDriver, name: "Package Rides", icon: FaStore },
  { path: "/driver/my-packages", component: MyPackageRidesDriver, name: "My Package Rides", icon: FaCheckCircle },
  { path: "/driver/notifications", component: DriverNotifications, name: "Notifications", icon: FaBell },
  { path: "/driver/support", component: DriverSupport, name: "Support", icon: FaHeadset },
  { path: "/driver/wallet", component: DriverWallet, name: "Wallet", icon: FaWallet },
  { path: "/driver/profile", component: DriverProfile, name: "Profile", icon: FaUser },
];

export default routes;
