# 🚀 Cab Booking System - Complete Code Flow (Hinglish Guide)

Yeh guide aapko pure system (Backend + Driver Panel + Agent Panel) ka flow detail mein samjhayegi. 

---

## 🏗️ 1. System Architecture (Pura Dhancha)

Hamara system 3 main hisson mein banta hua hai:
1.  **Backend (CapBokkin)**: Yeh system ka 'Dimaag' hai. Node.js, Express, aur MongoDB ka use karke banaya gaya hai. Saari business logic, database, aur real-time sockets yahin se control hote hain.
2.  **Driver Panel (Frontend)**: React/Vite par bana hai. Driver apni duty control karta hai, rides accept karta hai, aur live location bhejta hai.
3.  **Agent/User Panel (Frontend)**: Rides book karne ke liye use hota hai.

---

## 🧠 2. Backend Flow (The Brain)

### 📂 File Structure Overview:
-   **`server.js`**: Entry point. Sabhi routes aur middleware ko initialize karta hai. `autoExpireBookings` jaisa background task bhi yahin se chalta hai.
-   **`models/`**: Database ka structure define karte hain (e.g., `Booking.js`, `Driver.js`, `User.js`).
-   **`controllers/`**: Asli logic yahin likhi hai. 
    -   `bookingController.js`: Booking create aur fare estimate karta hai.
    -   `tripController.js`: Driver matching aur trip execution (Start/End) handle karta hai.
-   **`routes/`**: API endpoints define karte hain.
-   **`socket/socket.js`**: Real-time communication (Live tracking, Notifications).

### ⚙️ Server Startup (`server.js`):
1.  **DB Connect**: MongoDB se connect karta hai.
2.  **Firebase Init**: Push notifications ke liye Firebase Admin setup karta hai.
3.  **Socket.io Init**: Real-time connection enable karta hai.
4.  **Routes Register**: Saari APIs (Admin, Driver, User, etc.) ko link karta hai.
5.  **Automation**: Har 30 mins mein purani bulk bookings ko expire karta hai.

---

## ⚡ 3. Real-time Flow (Socket.io)

Socket.io hamare system ki 'Nass' (Pulse) hai. Isse sab kuch "Live" hota hai.

### `socket.js` Logic:
1.  **`join_room`**: Jab koi login karta hai, woh apne unique ID ke room mein join ho jata hai. Admin `admin_room` mein jata hai.
2.  **`update_location` (Driver)**:
    -   Driver app har 3 second mein location bhejti hai.
    -   Backend isse **Admins**, **Fleets**, aur agar trip chal rahi hai toh **User/Agent** ko instant broadcast karta hai.
    -   **Optimization**: Database mein har location save nahi hoti. Sirf har 2 minute mein ek baar update hota hai performance bachane ke liye.
3.  **`driver_online / offline`**: Driver ka status update hota hai aur admin ko notify kiya jata hai.

---

## 🚗 4. Booking ka Safar (Lifecycle)

Sabse complicated aur important part yahi hai.

### Step 1: Fare Estimation (`getAllFareEstimates`)
-   User source aur destination dalta hai.
-   **Google Maps API** se distance milta hai.
-   **Geo-Pricing**: System check karta hai ki kya pickup location kisi "Special Zone" (like Airport or High Demand Area) mein hai. Agar hai, toh rates badh jate hain.
-   **Driver ETA**: System aas-paas ke online drivers ko dhundta hai aur batata hai ki cab kitni der mein aayegi.

### Step 2: Booking Creation (`createBooking`)
-   Booking create hote hi **Waterfall Matching** shuru hoti hai.
-   **Waterfall Logic**:
    1.  Sabse paas wale driver ko request bhejte hain.
    2.  11 seconds wait karte hain.
    3.  Agar driver ne accept nahi kiya, toh request **Timeout** ho jati hai aur agle nearest driver ko jati hai.
    4.  Yeh process 4 minute tak chalta hai. Agar koi nahi mila, toh booking **Expire** ho jati hai.

### Step 3: Trip Execution
-   **Accept**: Driver request accept karta hai. Booking status "Accepted" ho jata hai.
-   **OTP Verification**: Trip start karne ke liye driver ko User se OTP mangna padta hai. `startTrip` API OTP verify karke status "Ongoing" kar deti hai.
-   **Live Tracking**: Trip ke dauran driver ki location user ko map par dikhti rehti hai.
-   **End Trip**: Driver destination par pahunch kar trip end karta hai. Payment calculate hoti hai aur wallet update hota hai.

---

## 📱 5. Driver Panel Flow

Driver Panel frontend (React) mein kaam kaise hota hai:

1.  **`AuthContext.jsx`**: Check karta hai ki driver login hai ya nahi. Token ko `localStorage` mein rakhta hai.
2.  **`DashboardLayout.jsx`**: Yeh sabse main component hai.
    -   Yeh Google Maps initialize karta hai.
    -   `navigator.geolocation.watchPosition` se driver ki location track karta hai.
    -   Socket se connect hota hai aur `new_ride_request` event ka wait karta hai.
3.  **`RideRequestModal.jsx`**: Jab naya request aata hai, yeh popup dikhta hai. Isme passenger ki details aur map par route dikhta hai.
4.  **`DriverDashboard.jsx`**: Yahan driver ko apne charts (earnings, trips, ratings) dikhte hain. `Highcharts` library ka use karke premium graphics banaye gaye hain.

---

## 💼 6. Agent Panel Flow

Agent Panel ka main kaam dusron ke liye ride book karna hai.
-   **`MyBulkBookings.jsx`**: Agent ne jitni bhi bookings ki hain, unka status yahan dikhta hai.
-   **Commission**: Har booking par agent ko kuch percentage commission milta hai jo unke wallet mein add hota hai.

---

## 🛠️ Summary of Technologies used:
-   **Backend**: Node.js, Express, MongoDB (Mongoose).
-   **Real-time**: Socket.io.
-   **Frontend**: React.js, Vite, Vanilla CSS.
-   **Maps**: Google Maps JS SDK.
-   **Charts**: Highcharts.
-   **Notifications**: Firebase Cloud Messaging (FCM).

---

**Note**: Har ek function aur API error handling ke saath likhi gayi hai. Agar koi server error aata hai, toh user ko Toast notification ke zariye inform kiya jata hai.

> [!TIP]
> Agar aapko kisi specific file (jaise `bookingController.js` ya `socket.js`) ki line-by-line explanation chahiye, toh aap mujhse puch sakte hain!
