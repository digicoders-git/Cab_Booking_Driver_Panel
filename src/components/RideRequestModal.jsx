// src/components/RideRequestModal.jsx
import { useState, useEffect } from 'react';
import { FaTimes, FaMapMarkerAlt, FaRupeeSign, FaClock, FaUser, FaPhone } from 'react-icons/fa';
import { driverService } from '../api/driverApi';
import { toast } from 'sonner';
import './RideModal.css';

const RideRequestModal = ({ 
  isOpen, 
  onClose, 
  rideData, 
  onAccept, 
  onReject,
  themeColors 
}) => {
  const [isResponding, setIsResponding] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds timer

  // Auto-close timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto reject when time runs out
          handleReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  // Reset timer when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(30);
      setIsResponding(false);
    }
  }, [isOpen]);

  const handleAccept = async () => {
    if (isResponding) return;
    setIsResponding(true);

    try {
      await driverService.respondToRequest(rideData?.requestId || rideData?._id, 'accept');
      toast.success('🚗 Ride Accepted! Customer ko notification gaya hai');
      onAccept?.(rideData);
      onClose();
    } catch (error) {
      console.error('Accept error:', error);
      toast.error('Failed to accept ride. Try again!');
    } finally {
      setIsResponding(false);
    }
  };

  const handleReject = async () => {
    if (isResponding) return;
    setIsResponding(true);

    try {
      await driverService.respondToRequest(rideData?.requestId || rideData?._id, 'reject');
      toast.info('❌ Ride Rejected');
      onReject?.(rideData);
      onClose();
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Failed to reject ride');
    } finally {
      setIsResponding(false);
    }
  };

  if (!isOpen || !rideData) return null;

  const progressPercentage = (timeLeft / 30) * 100;

  return (
    <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black transition-opacity duration-300 ${
      isOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
    }`}>
      {/* Modal Container - Mobile First Design */}
      <div 
        className={`ride-modal w-full max-w-md mx-auto rounded-t-3xl sm:rounded-2xl shadow-2xl border-2 transform transition-all duration-300 ${
          isOpen ? 'modal-enter translate-y-0' : 'translate-y-full'
        } pulse-glow`}
        style={{ 
          backgroundColor: themeColors?.surface || '#ffffff',
          borderColor: themeColors?.primary || '#3b82f6'
        }}
      >
        {/* Header with Timer */}
        <div 
          className="p-4 rounded-t-3xl sm:rounded-t-2xl relative"
          style={{ backgroundColor: themeColors?.primary || '#3b82f6' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center">
              🚗 New Ride Request
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-all"
              disabled={isResponding}
            >
              <FaTimes size={18} />
            </button>
          </div>
          
          {/* Timer Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-white text-sm mb-1">
              <span>⏰ Time Left</span>
              <span className="font-bold text-lg">{timeLeft}s</span>
            </div>
            <div className="w-full bg-white bg-opacity-30 rounded-full h-3">
              <div 
                className="bg-white h-3 rounded-full transition-all duration-1000 relative overflow-hidden"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Ride Details */}
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Customer Info */}
          <div className="flex items-center space-x-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg live-indicator"
              style={{ backgroundColor: themeColors?.primary || '#3b82f6' }}
            >
              <FaUser size={18} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-800 text-lg">
                {rideData?.customerName || rideData?.passenger?.name || 'Customer'}
              </p>
              <p className="text-sm text-gray-600 flex items-center mt-1">
                <FaPhone size={12} className="mr-2" />
                {rideData?.customerPhone || rideData?.passenger?.phone || 'N/A'}
              </p>
            </div>
            {(rideData?.customerPhone || rideData?.passenger?.phone) && (
              <a 
                href={`tel:${rideData?.customerPhone || rideData?.passenger?.phone}`}
                className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-all shadow-lg"
              >
                <FaPhone size={16} />
              </a>
            )}
          </div>

          {/* Pickup Location */}
          <div className="space-y-2">
            <div className="flex items-start space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full mt-1 flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Pickup Location</p>
                <p className="text-gray-800 text-sm leading-relaxed">
                  {rideData?.pickup || rideData?.pickupLocation || 'Location not provided'}
                </p>
              </div>
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <div className="flex items-start space-x-3">
              <div className="w-4 h-4 bg-red-500 rounded-full mt-1 flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Destination</p>
                <p className="text-gray-800 text-sm leading-relaxed">
                  {rideData?.destination || rideData?.dropLocation || 'Destination not provided'}
                </p>
              </div>
            </div>
          </div>

          {/* Fare & Distance */}
          <div className="grid grid-cols-2 gap-3">
            <div 
              className="p-3 rounded-lg text-center"
              style={{ backgroundColor: themeColors?.success + '20' || '#10b98120' }}
            >
              <FaRupeeSign 
                className="mx-auto mb-1" 
                style={{ color: themeColors?.success || '#10b981' }}
              />
              <p className="text-sm font-medium text-gray-600">Fare</p>
              <p className="font-bold text-lg" style={{ color: themeColors?.success || '#10b981' }}>
                ₹{rideData?.fare || rideData?.estimatedFare || '0'}
              </p>
            </div>
            
            <div 
              className="p-3 rounded-lg text-center"
              style={{ backgroundColor: themeColors?.info + '20' || '#3b82f620' }}
            >
              <FaClock 
                className="mx-auto mb-1" 
                style={{ color: themeColors?.info || '#3b82f6' }}
              />
              <p className="text-sm font-medium text-gray-600">Distance</p>
              <p className="font-bold text-lg" style={{ color: themeColors?.info || '#3b82f6' }}>
                {rideData?.distance || rideData?.estimatedDistance || 'N/A'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons grid grid-cols-2 gap-4 pt-2">
            <button
              onClick={handleReject}
              disabled={isResponding}
              className="py-4 px-4 rounded-2xl font-bold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg transform hover:scale-105"
            >
              {isResponding ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full spinner-fast"></div>
              ) : (
                <>
                  <span className="text-xl">❌</span>
                  <span>Reject</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleAccept}
              disabled={isResponding}
              className="py-4 px-4 rounded-2xl font-bold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg transform hover:scale-105 pulse-glow"
            >
              {isResponding ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full spinner-fast"></div>
              ) : (
                <>
                  <span className="text-xl">✅</span>
                  <span>Accept</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RideRequestModal;