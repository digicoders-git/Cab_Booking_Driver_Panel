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
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ backgroundColor: themeColors.danger + '20' }}
          >
            <FaCar size={40} style={{ color: themeColors.danger }} />
          </div>
        </div>

        {/* Title */}
        <h2
          className="text-2xl font-bold mb-3"
          style={{ color: themeColors.text }}
        >
          🚗 No Car Assigned
        </h2>

        {/* Message */}
        <p
          className="text-sm mb-6"
          style={{ color: themeColors.textSecondary }}
        >
          Aapke paas abhi koi gadi assign nahi hai. Jab tak aapko gadi assign nahi hoti, aap koi ride nahi le sakte.
        </p>

        {/* Info Box */}
        <div
          className="rounded-xl p-4 mb-6"
          style={{ backgroundColor: themeColors.primary + '10' }}
        >
          <p
            className="text-xs font-medium"
            style={{ color: themeColors.primary }}
          >
            ℹ️ Gadi assign karne ke liye admin se contact kijiye
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Contact Admin Button */}
          <button
            onClick={onContactAdmin}
            className="w-full py-3 px-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg"
            style={{
              backgroundColor: themeColors.primary,
              color: themeColors.onPrimary
            }}
          >
            <FaPhone size={16} />
            Admin se Contact Karo
          </button>

          {/* Help Button */}
          <button
            onClick={onHelp}
            className="w-full py-3 px-4 rounded-xl font-semibold transition-all hover:shadow-lg"
            style={{
              backgroundColor: themeColors.background,
              color: themeColors.primary,
              border: `2px solid ${themeColors.primary}`
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <FaHeadset size={16} />
              Help
            </div>
          </button>
        </div>

        {/* Footer Message */}
        <p
          className="text-xs mt-6"
          style={{ color: themeColors.textSecondary }}
        >
          Aapka profile complete hone ke baad admin aapko gadi assign karega
        </p>
      </div>
    </div>
  );
};

export default NoCarAssignedModal;
