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
  const [countdown, setCountdown] = useState(10);

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
      className="fixed inset-0 z-[9999] flex items-center justify-center sm:p-4 bg-black/80 backdrop-blur-md"
    >
      <div className="bg-white sm:rounded-[2.5rem] shadow-2xl max-w-lg w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden border-0 sm:border-2 border-gray-100 animate-[slideUp_0.3s_ease-out]">
        
        {/* Header (Fixed) */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 px-6 py-6 relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
          </div>

          <div className="absolute top-6 right-6 flex items-center justify-center">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="28" cy="28" r="24" stroke="rgba(255,255,255,0.2)" strokeWidth="4" fill="transparent" />
                <circle
                  cx="28" cy="28" r="24" stroke="white" strokeWidth="5" fill="transparent"
                  strokeDasharray={150.8}
                  strokeDashoffset={150.8 * (1 - countdown / 10)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className="absolute text-white font-black text-lg">{countdown}</span>
            </div>
          </div>

          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <FaCar className="text-blue-600 text-3xl" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-0.5 tracking-tight">New Ride!</h2>
              <p className="text-blue-100 text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
                Action Required
              </p>
            </div>
          </div>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-gray-50/50 to-white">
          {/* Passenger */}
          <div className="flex items-center gap-4 p-5 bg-white rounded-3xl shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              {(rideData.passengerName || rideData.passengerDetails?.name || 'P').charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-gray-900 text-xl truncate">{rideData.passengerName || rideData.passengerDetails?.name || 'Passenger'}</p>
              <p className="text-sm font-medium text-gray-500 flex items-center gap-2 mt-1">
                <FaPhone className="text-green-600" size={12} />
                {rideData.passengerPhone || rideData.passengerDetails?.phone || 'N/A'}
              </p>
            </div>
          </div>

          {/* Route */}
          <div className="relative space-y-1 px-1">
            <div className="absolute left-[31px] top-[48px] bottom-[48px] w-0.5 border-l-[3px] border-dashed border-blue-100 z-0"></div>

            <div className="relative z-10 flex items-start gap-4 p-4 bg-green-50/40 rounded-2xl border border-green-100/50">
              <div className="mt-1 p-2.5 bg-green-500 rounded-xl shadow-lg">
                <Navigation className="text-white" size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-1 opacity-70">Pickup</p>
                <p className="text-[15px] font-bold text-gray-900 leading-tight">{rideData.pickup || rideData.pickupLocation || '—'}</p>
              </div>
            </div>

            {rideData.stops && rideData.stops.length > 0 && (
              <div className="space-y-1 ml-1.5">
                {rideData.stops.map((stop, sIdx) => (
                  <div key={sIdx} className="relative z-10 flex items-start gap-4 p-3 bg-orange-50/20 rounded-2xl border border-orange-100/30">
                    <div className="mt-0.5 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-xs text-white font-black shadow-md">
                      {sIdx + 1}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-[9px] font-bold text-orange-700 uppercase tracking-wide opacity-80">Stop {sIdx + 1}</p>
                      <p className="text-sm font-semibold text-gray-700 leading-snug">{stop.address || stop.location || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="relative z-10 flex items-start gap-4 p-4 bg-red-50/40 rounded-2xl border border-red-100/50">
              <div className="mt-1 p-2.5 bg-red-500 rounded-xl shadow-lg">
                <MapPin className="text-white" size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1 opacity-70">Destination</p>
                <p className="text-[15px] font-bold text-gray-900 leading-tight">{rideData.drop || rideData.destination || '—'}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-3xl p-4 text-center border border-gray-100 shadow-sm">
              <p className="text-lg font-black text-emerald-600 italic">₹{rideData.fare || 0}</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Fare</p>
            </div>
            <div className="bg-white rounded-3xl p-4 text-center border border-gray-100 shadow-sm">
              <p className="text-lg font-black text-blue-600">{rideData.distance || 0}</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">KM</p>
            </div>
            <div className="bg-white rounded-3xl p-4 text-center border border-gray-100 shadow-sm">
              <p className="text-xs font-black text-purple-600 uppercase truncate">{rideData.rideType || 'Private'}</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Type</p>
            </div>
          </div>
        </div>

        {/* Footer (Sticky) */}
        <div className="px-6 py-6 pb-8 sm:pb-6 flex gap-4 bg-white border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onReject}
            className="flex-1 py-4 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-2xl font-bold transition-all border border-gray-200 active:scale-95"
          >
            Reject
          </button>
          <button
            onClick={onAccept}
            className="flex-[2] py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-black text-lg transition-all active:scale-95 shadow-xl shadow-green-500/20"
          >
            Accept Ride
          </button>
        </div>
      </div>
    </div>
  );
};

export default RideRequestModal;