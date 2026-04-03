// src/components/NoCarAssignedModal.jsx
import { FaCar, FaPhone, FaHeadset } from 'react-icons/fa';

const NoCarAssignedModal = ({ isOpen, themeColors, onContactAdmin, onHelp }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center"
        style={{ backgroundColor: themeColors.surface }}
      >
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#FEE2E2' }}
          >
            <FaCar size={48} style={{ color: '#EF4444' }} />
          </div>
        </div>

        {/* Title */}
        <h2
          className="text-2xl font-bold mb-3 flex items-center justify-center gap-2"
          style={{ color: '#111827' }}
        >
          🏎️ No Car Assigned
        </h2>

        {/* Message */}
        <p
          className="text-base mb-8 px-2"
          style={{ color: '#4B5563', lineHeight: '1.6' }}
        >
          Aapke paas abhi koi gadi assign nahi hai. Jab tak aapko gadi assign nahi hoti, aap koi ride nahi le sakte.
        </p>

        {/* Info Box */}
        <div
          className="rounded-2xl p-4 mb-8 flex items-center gap-3 text-left"
          style={{ backgroundColor: '#F3F4F6' }}
        >
          <div style={{ backgroundColor: '#3B82F6', color: 'white', minWidth: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>i</div>
          <p
            className="text-sm font-medium"
            style={{ color: '#374151' }}
          >
            Gadi assign karne ke liye admin se contact kijiye
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Contact Admin Button */}
          <button
            onClick={onContactAdmin}
            className="w-full py-4 px-6 rounded-2xl font-bold text-white flex items-center justify-center gap-3 transition-all active:scale-95 shadow-md"
            style={{
              backgroundColor: '#1E3A5F',
            }}
          >
            <FaPhone size={18} />
            Admin se Contact Karo
          </button>

          {/* Help Button */}
          <button
            onClick={onHelp}
            className="w-full py-4 px-6 rounded-2xl font-bold transition-all active:scale-95 border-2 flex items-center justify-center gap-3"
            style={{
              backgroundColor: 'white',
              color: '#1E3A5F',
              borderColor: '#1E3A5F'
            }}
          >
            <FaHeadset size={18} />
            Help
          </button>
        </div>

        {/* Footer Message */}
        <p
          className="text-xs mt-8 font-medium"
          style={{ color: '#9CA3AF' }}
        >
          Aapka profile complete hone ke baad admin aapko gadi assign karega
        </p>
      </div>
    </div>
  );
};

export default NoCarAssignedModal;
