import { useState, useEffect } from 'react';
import { FaCar, FaCheckCircle, FaBan, FaPhone } from 'react-icons/fa';
import { Navigation, MapPin } from 'lucide-react';

const RideRequestModal = ({ 
  isOpen, 
  onClose, 
  rideData, 
  onAccept, 
  onReject,
  themeColors 
}) => {
  const [countdown, setCountdown] = useState(10); // Sync based on 10s

  useEffect(() => {
    if (!isOpen || !rideData?.expiresAt) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.round((rideData.expiresAt - Date.now()) / 1000));
      setCountdown(remaining);
      
      if (remaining <= 0) {
        onClose();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isOpen, rideData, onClose]);

  if (!isOpen || !rideData) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
    >
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border-2 border-gray-100 animate-[slideUp_0.3s_ease-out]">
        
        {/* Header with Luxury Gradient */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 px-6 py-5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full translate-x-20 translate-y-20"></div>
          </div>

          <div className="absolute top-4 right-4 flex items-center justify-center">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.2)" strokeWidth="4" fill="transparent" />
                <circle
                  cx="24" cy="24" r="20" stroke="white" strokeWidth="4" fill="transparent"
                  strokeDasharray={125.6}
                  strokeDashoffset={125.6 * (1 - countdown / 10)}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className="absolute text-white font-black text-sm">{countdown}</span>
            </div>
          </div>

          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <FaCar className="text-blue-600 text-2xl" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-0.5">New Ride Request!</h2>
              <p className="text-blue-100 text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                Respond before time runs out
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 bg-gradient-to-b from-gray-50 to-white">
          {/* Passenger Info */}
          <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {(rideData.passengerName || rideData.passengerDetails?.name || 'P').charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-lg">{rideData.passengerName || rideData.passengerDetails?.name || 'Passenger'}</p>
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <FaPhone className="text-green-600" size={10} />
                {rideData.passengerPhone || rideData.passengerDetails?.phone || 'N/A'}
              </p>
            </div>
          </div>

          {/* Route Info */}
          <div className="space-y-3 px-1">
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
              <div className="mt-0.5 p-2 bg-green-500 rounded-lg shadow-sm">
                <Navigation className="text-white" size={16} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-1">Pickup</p>
                <p className="text-sm font-medium text-gray-900 line-clamp-2">{rideData.pickup || rideData.pickupLocation || '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
              <div className="mt-0.5 p-2 bg-red-500 rounded-lg shadow-sm">
                <MapPin className="text-white" size={16} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1">Drop</p>
                <p className="text-sm font-medium text-gray-900 line-clamp-2">{rideData.drop || rideData.destination || rideData.dropLocation || '—'}</p>
              </div>
            </div>
          </div>

          {/* Fare & Distance */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-500 rounded-2xl p-4 text-center shadow-lg shadow-emerald-500/20">
              <p className="text-2xl font-bold text-white italic">₹{rideData.fare || rideData.estimatedFare || 0}</p>
              <p className="text-[10px] text-white/80 font-black uppercase tracking-widest">Fare</p>
            </div>
            <div className="bg-blue-600 rounded-2xl p-4 text-center shadow-lg shadow-blue-500/20">
              <p className="text-2xl font-bold text-white">{rideData.distance || rideData.estimatedDistance || 0}</p>
              <p className="text-[10px] text-white/80 font-black uppercase tracking-widest">KM</p>
            </div>
            <div className="bg-purple-600 rounded-2xl p-4 text-center shadow-lg shadow-purple-500/20">
              <p className="text-sm font-bold text-white uppercase truncate">{rideData.rideType || 'Private'}</p>
              <p className="text-[10px] text-white/80 font-black uppercase tracking-widest">Type</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 pb-6 pt-2 flex gap-3 bg-white">
          <button
            onClick={onReject}
            className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border border-gray-200"
          >
            <FaBan /> Reject
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:scale-[1.02] active:scale-95 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-500/30"
          >
            <FaCheckCircle /> Accept Ride
          </button>
        </div>
      </div>
    </div>
  );
};

export default RideRequestModal;