import { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaUserAlt, FaCarSide } from 'react-icons/fa';

const RideRequestModal = ({ 
  isOpen, 
  onClose, 
  rideData, 
  onAccept, 
  onReject 
}) => {
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    if (!isOpen || !rideData?.expiresAt) return;

    // Ringtone logic
    const audio = new Audio('/ringtone.mp3');
    audio.loop = true;
    audio.play().catch(e => console.log('Autoplay blocked by browser. Please interact with the app first.', e));

    const updateTimer = () => {
      const remaining = Math.max(0, Math.round((rideData.expiresAt - Date.now()) / 1000));
      setCountdown(remaining);
      
      if (remaining <= 0) {
        onClose();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => {
      clearInterval(interval);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [isOpen, rideData, onClose]);

  if (!isOpen || !rideData) return null;

  const progressPercent = (countdown / 15) * 100;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md sm:p-4">
      {/* Container */}
      <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-900/20 transform transition-all animate-[slideUp_0.3s_ease-out] flex flex-col max-h-[90vh] sm:max-h-[85vh]">
        
        {/* Progress Bar (Top Edge) */}
        <div className="w-full h-1.5 bg-gray-100">
          <div 
            className="h-full bg-blue-600 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Premium Header Map/Hero Area */}
        <div className="relative bg-gray-900 px-6 py-8 text-center flex-shrink-0 overflow-hidden">
           {/* Subtle background glow */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-600 rounded-full blur-[80px] opacity-40 pointer-events-none"></div>
           
           <div className="relative z-10 flex flex-col items-center justify-center">
             <div className="w-24 h-24 rounded-full border-[4px] border-gray-800 bg-gray-900/80 backdrop-blur-md shadow-[0_0_30px_rgba(37,99,235,0.4)] flex items-center justify-center relative mb-4">
               <span className="text-4xl font-black text-white">{countdown}</span>
               <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="44" cy="44" r="42" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="transparent" />
                  <circle
                    cx="44" cy="44" r="42" stroke="#3b82f6" strokeWidth="4" fill="transparent"
                    strokeDasharray={263.89}
                    strokeDashoffset={263.89 * (1 - countdown / 15)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-linear drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                  />
               </svg>
             </div>
             <h2 className="text-2xl font-black text-white tracking-tight">New Ride Request</h2>
             <div className="flex items-center gap-3 mt-2">
                <span className="px-3 py-1 bg-white/10 text-blue-300 rounded-full text-[10px] font-black uppercase tracking-widest">{rideData.rideType || 'Private'}</span>
                <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                <span className="text-gray-300 text-sm font-bold">{(rideData.distance || 0)} KM</span>
             </div>
           </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          
          {/* Fare & Stats Block */}
          <div className="bg-white px-6 py-5 border-b border-gray-100 flex justify-between items-center shadow-sm relative z-10">
             <div>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Est. Fare</p>
                <p className="text-4xl font-black text-emerald-500 tracking-tighter drop-shadow-sm">₹{rideData.fare || 0}</p>
             </div>
             <div className="text-right">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Passenger</p>
                <div className="flex items-center justify-end gap-2.5">
                  <p className="font-bold text-gray-800 text-lg">{rideData.passengerName || rideData.passengerDetails?.name || 'Passenger'}</p>
                  <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                    <FaUserAlt size={14} />
                  </div>
                </div>
             </div>
          </div>

          {/* Location Timeline */}
          <div className="px-8 py-8">
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-gray-200 rounded-full"></div>

              {/* Pickup */}
              <div className="relative flex items-start gap-5 mb-8">
                <div className="relative z-10 w-6 h-6 rounded-full bg-emerald-100 border-[3px] border-emerald-500 flex items-center justify-center mt-0.5 shadow-sm ring-4 ring-white">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 opacity-80">Pickup</p>
                  <p className="text-base font-bold text-gray-800 leading-snug">{rideData.pickup || rideData.pickupLocation || '—'}</p>
                </div>
              </div>

              {/* Stops (if any) */}
              {rideData.stops && rideData.stops.map((stop, idx) => (
                <div key={idx} className="relative flex items-start gap-5 mb-8">
                  <div className="relative z-10 w-6 h-6 rounded-full bg-orange-100 border-[3px] border-orange-500 flex items-center justify-center mt-0.5 ring-4 ring-white">
                    <span className="text-[10px] font-black text-orange-600">{idx + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1 opacity-80">Stop {idx + 1}</p>
                    <p className="text-sm font-bold text-gray-700 leading-snug">{stop.address || stop.location || '—'}</p>
                  </div>
                </div>
              ))}

              {/* Dropoff */}
              <div className="relative flex items-start gap-5">
                <div className="relative z-10 w-6 h-6 rounded-full bg-red-100 border-[3px] border-red-500 flex items-center justify-center mt-0.5 shadow-sm ring-4 ring-white">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1 opacity-80">Dropoff</p>
                  <p className="text-base font-bold text-gray-800 leading-snug">{rideData.drop || rideData.destination || '—'}</p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="p-4 sm:p-6 bg-white border-t border-gray-100 flex gap-3 flex-shrink-0 pb-8 sm:pb-6">
          <button 
            onClick={onReject}
            className="flex-1 py-4 px-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 font-black text-sm uppercase tracking-wider transition-all focus:ring-4 focus:ring-gray-100 active:scale-[0.98]"
          >
            Reject
          </button>
          <button 
            onClick={onAccept}
            className="flex-[2.5] py-4 px-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-[0_8px_25px_-8px_rgba(37,99,235,0.6)] transition-all focus:ring-4 focus:ring-blue-200 active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <FaCarSide size={22} className="opacity-90" />
            ACCEPT RIDE
          </button>
        </div>

      </div>
    </div>
  );
};

export default RideRequestModal;