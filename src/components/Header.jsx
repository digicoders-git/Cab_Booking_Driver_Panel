// src/components/Header.jsx
import { memo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { useAuth } from "../context/AuthContext";
import {
  FaCog,
  FaSun,
  FaMoon,
  FaPalette,
  FaFont,
  FaTimes,
  FaBriefcase,
  FaStar,
  FaGem,
  FaSquare,
  FaUser,
  FaCar,
  FaBell,
  FaPowerOff
} from "react-icons/fa";

const SettingsModal = ({
  isOpen,
  onClose,
  themeColors,
  palette,
  changePalette,
  toggleTheme,
  availablePalettes
}) => {
  // Use FontContext directly in SettingsModal
  const { currentFont, premiumFonts, changeFont } = useFont();

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Palette display names and icons
  const paletteInfo = {
    corporate: { label: "Professional", icon: FaBriefcase, desc: "Clean & formal" },
    luxury: { label: "Luxury", icon: FaStar, desc: "Premium & elegant" },
    modern: { label: "Modern", icon: FaGem, desc: "Fresh & vibrant" },
    minimal: { label: "Minimal", icon: FaSquare, desc: "Simple & clean" }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{
        backgroundColor: themeColors.mode === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm mx-auto p-4 rounded-xl shadow-2xl border max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
          boxShadow: `0 10px 25px -5px ${themeColors.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.15)'}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - Circular */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center hover:rotate-90 transition-all duration-300 border"
          style={{
            color: themeColors.textSecondary,
            backgroundColor: themeColors.background,
            borderColor: themeColors.mode === 'light' ? themeColors.primary : themeColors.border,
          }}
          aria-label="Close settings"
        >
          <FaTimes className="text-sm" />
        </button>

        {/* Modal Header */}

        {/* Settings Sections */}
        <div className="space-y-4">
          {/* Theme Section */}
          <div>
            <label
              className="flex items-center gap-2 text-xs font-medium mb-2"
              style={{ color: themeColors.text }}
            >
              <FaPalette className="text-sm" />
              Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={toggleTheme}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border transition-all duration-200 ${themeColors.mode === 'light' ? 'ring-1' : ''
                  }`}
                style={{
                  backgroundColor: themeColors.mode === 'light' ? themeColors.primary : themeColors.background,
                  borderColor: themeColors.mode === 'light' ? themeColors.primary : themeColors.border,
                  color: themeColors.mode === 'light' ? themeColors.onPrimary : themeColors.text,
                  ringColor: themeColors.primary,
                }}
              >
                <FaSun className="text-sm" />
                <span className="text-xs font-medium">Light</span>
              </button>
              <button
                onClick={toggleTheme}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border transition-all duration-200 ${themeColors.mode === 'dark' ? 'ring-1' : ''
                  }`}
                style={{
                  backgroundColor: themeColors.mode === 'dark' ? themeColors.primary : themeColors.background,
                  borderColor: themeColors.mode === 'dark' ? themeColors.primary : themeColors.border,
                  color: themeColors.mode === 'dark' ? themeColors.onPrimary : themeColors.text,
                  ringColor: themeColors.primary,
                }}
              >
                <FaMoon className="text-sm" />
                <span className="text-xs font-medium">Dark</span>
              </button>
            </div>
          </div>

          {/* Font Section */}
          <div>
            <label
              className="flex items-center gap-2 text-xs font-medium mb-2"
              style={{ color: themeColors.text }}
            >
              <FaFont className="text-sm" />
              Font
            </label>
            <div className="relative">
              <select
                value={currentFont.key}
                onChange={(e) => changeFont(e.target.value)}
                className="w-full p-2 rounded-lg border focus:outline-none focus:ring-1 transition-all duration-200 text-xs appearance-none cursor-pointer"
                style={{
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                  borderColor: themeColors.border,
                  focusRingColor: themeColors.primary
                }}
              >
                {Object.values(premiumFonts).map((font) => (
                  <option
                    key={font.key}
                    value={font.key}
                    style={{
                      backgroundColor: themeColors.background,
                      color: themeColors.text
                    }}
                  >
                    {font.label}
                  </option>
                ))}
              </select>
              <div
                className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                style={{ color: themeColors.textSecondary }}
              >
                <span className="text-xs">▼</span>
              </div>
            </div>
          </div>

          {/* Color Palette Section */}
          <div>
            <label
              className="flex items-center gap-2 text-xs font-medium mb-2"
              style={{ color: themeColors.text }}
            >
              <FaPalette className="text-sm" />
              Color Scheme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {availablePalettes.map((paletteKey) => {
                const IconComponent = paletteInfo[paletteKey]?.icon || FaPalette;
                return (
                  <button
                    key={paletteKey}
                    onClick={() => changePalette(paletteKey)}
                    className={`flex flex-col items-center p-2 rounded-lg border transition-all duration-200 group ${palette === paletteKey ? 'ring-1' : ''
                      }`}
                    style={{
                      backgroundColor: palette === paletteKey ? themeColors.primary : themeColors.background,
                      borderColor: palette === paletteKey ? themeColors.primary : themeColors.border,
                      color: palette === paletteKey ? themeColors.onPrimary : themeColors.text,
                      ringColor: themeColors.primary,
                    }}
                    title={paletteInfo[paletteKey]?.label || paletteKey}
                  >
                    <IconComponent
                      className="text-sm mb-1 group-hover:scale-110 transition-transform duration-200"
                    />
                    <span className="text-xs truncate w-full">
                      {paletteInfo[paletteKey]?.label || paletteKey}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t" style={{ borderColor: themeColors.border }}>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 p-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80 border"
              style={{
                backgroundColor: themeColors.background,
                color: themeColors.text,
                borderColor: themeColors.border
              }}
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="flex-1 p-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80"
              style={{
                backgroundColor: themeColors.primary,
                color: themeColors.onPrimary,
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Header = memo(({
  toggleSidebar,
  currentPageTitle,
  isOnline,
  onToggleOnline
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { themeColors, toggleTheme, palette, changePalette, availablePalettes } = useTheme();
  const { currentFont } = useFont();
  const { admin } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <header
        className="h-16 flex items-center justify-between px-4 border-b backdrop-blur-sm sticky top-0 z-40"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        <div className="flex items-center min-w-0 flex-1">
          <button
            onClick={toggleSidebar}
            className="lg:hidden mr-3 p-1.5 rounded-md hover:scale-110 transition-all duration-200"
            style={{
              color: themeColors.text,
              backgroundColor: themeColors.background
            }}
            aria-label="Open sidebar"
          >
            <span className="text-base">☰</span>
          </button>
          <h2
            className="text-sm font-semibold truncate"
            style={{
              color: themeColors.text,
              fontFamily: currentFont.family
            }}
          >
            {currentPageTitle}
          </h2>
        </div>

        {/* Right Side — Online/Offline + Notification + Profile Button */}
        <div className="flex items-center gap-3">
          {/* Online/Offline Toggle Button */}
          <button
            onClick={onToggleOnline}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all hover:shadow-md font-medium text-sm"
            style={{
              backgroundColor: isOnline ? '#10B981' : '#EF4444',
              borderColor: isOnline ? '#059669' : '#DC2626',
              color: '#FFFFFF'
            }}
            title={isOnline ? 'Click to go Offline' : 'Click to go Online'}
          >
            <FaPowerOff size={14} className={isOnline ? '' : 'animate-pulse'} />
            <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </button>
          
          {/* Notification Button */}
          <button
            onClick={() => navigate('/driver/notifications')}
            className="relative p-2 rounded-xl border transition-all hover:shadow-md"
            style={{
              backgroundColor: themeColors.background,
              borderColor: themeColors.border,
              color: themeColors.text
            }}
          >
            <FaBell size={16} />
          </button>
          <button
            onClick={() => navigate('/driver/profile')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all hover:shadow-md"
            style={{
              backgroundColor: themeColors.background,
              borderColor: themeColors.border,
              color: themeColors.text
            }}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
              {admin?.name?.charAt(0)?.toUpperCase() || <FaUser size={12} />}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold leading-tight" style={{ color: themeColors.text }}>
                {admin?.name || 'Driver'}
              </p>
              <p className="text-[10px] flex items-center gap-1" style={{ color: themeColors.textSecondary }}>
                <FaCar size={8} /> Driver
              </p>
            </div>
          </button>
        </div>
      </header>
    </>
  );
});

Header.displayName = 'Header';
export default Header;