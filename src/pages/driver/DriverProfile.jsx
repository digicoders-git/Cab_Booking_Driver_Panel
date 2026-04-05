// src/pages/driver/DriverProfile.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { driverService } from '../../api/driverApi';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import {
  FaUser, FaCar, FaPhone, FaEnvelope, FaIdCard, FaCamera,
  FaSave, FaArrowLeft, FaMapMarkerAlt, FaBuilding, FaTag,
  FaPalette, FaCalendarAlt, FaCheckCircle, FaShieldAlt,
  FaTachometerAlt, FaStar, FaMoneyBillWave
} from 'react-icons/fa';
import {
  User, Phone, Mail, MapPin, Navigation, Award,
  Shield, Car, Palette, Tag, Star, Calendar
} from 'lucide-react';

export default function DriverProfile() {
  const navigate = useNavigate();
  const { admin: driver, setLoginData, token } = useAuth();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carBrand, setCarBrand] = useState('');
  const [carColor, setCarColor] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [totalTrips, setTotalTrips] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [rating, setRating] = useState(0);
  
  // Document states
  const [rcPreview, setRcPreview] = useState(null);
  const [insurancePreview, setInsurancePreview] = useState(null);
  const [pucPreview, setPucPreview] = useState(null);
  const [selectedRcFile, setSelectedRcFile] = useState(null);
  const [selectedInsuranceFile, setSelectedInsuranceFile] = useState(null);
  const [selectedPucFile, setSelectedPucFile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await driverService.getProfile();
      const data = res?.driver || res || {};
      setProfile(data);

      setName(data.name || '');
      setPhone(data.phone || '');
      setCarNumber(data.carNumber || data.carDetails?.carNumber || '');
      setCarModel(data.carModel || data.carDetails?.carModel || '');
      setCarBrand(data.carBrand || data.carDetails?.carBrand || '');
      setCarColor(data.carColor || data.carDetails?.carColor || '');
      setLicenseNumber(data.licenseNumber || '');
      setAddress(data.address || '');
      setCity(data.city || '');
      setState(data.state || '');
      setPincode(data.pincode || '');
      setTotalTrips(data.totalTrips || 0);
      setTotalEarnings(data.totalEarnings || 0);
      setRating(data.rating || 0);
      setImagePreview(data.image ? `${import.meta.env.VITE_API_BASE_URL}/uploads/${data.image}` : null);
      
      // Set Document Previews
      const carDocs = data.carDetails?.carDocuments || {};
      setRcPreview(carDocs.rc ? `${import.meta.env.VITE_API_BASE_URL}/uploads/${carDocs.rc}` : null);
      setInsurancePreview(carDocs.insurance ? `${import.meta.env.VITE_API_BASE_URL}/uploads/${carDocs.insurance}` : null);
      setPucPreview(carDocs.puc ? `${import.meta.env.VITE_API_BASE_URL}/uploads/${carDocs.puc}` : null);
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'rc') {
        setSelectedRcFile(file);
        setRcPreview(reader.result);
      } else if (type === 'insurance') {
        setSelectedInsuranceFile(file);
        setInsurancePreview(reader.result);
      } else if (type === 'puc') {
        setSelectedPucFile(file);
        setPucPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('phone', phone);
      formData.append('carNumber', carNumber);
      formData.append('carModel', carModel);
      formData.append('carBrand', carBrand);
      formData.append('carColor', carColor);
      formData.append('licenseNumber', licenseNumber);
      formData.append('address', address);
      formData.append('city', city);
      formData.append('state', state);
      formData.append('pincode', pincode);
      if (selectedFile) formData.append('image', selectedFile);
      if (selectedRcFile) formData.append('rcImage', selectedRcFile);
      if (selectedInsuranceFile) formData.append('insuranceImage', selectedInsuranceFile);
      if (selectedPucFile) formData.append('pucImage', selectedPucFile);

      const res = await driverService.updateProfile(formData);
      if (res.success) {
        toast.success('Profile updated successfully!');
        setEditMode(false);
        fetchProfile();
        setLoginData({ ...driver, ...res.driver, token: driver?.token || token });
      }
    } catch (err) {
      toast.error(err?.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <FaCar className="text-blue-400" size={24} />
            </div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-4">
      <div className="max-w-8xl mx-auto">
        {/* Back Button */}


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden sticky top-6">
              {/* Cover Photo */}
              <div className="h-28 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative">
                <div className="absolute inset-0 bg-black/10" />
              </div>

              {/* Profile Image */}
              <div className="relative px-6 pb-6">
                <div className="flex justify-center -mt-14">
                  <div className="relative group">
                    <div className="w-28 h-28 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-white">
                      {imagePreview ? (
                        <img src={imagePreview} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                          <FaUser size={40} className="text-blue-500" />
                        </div>
                      )}
                    </div>
                    {editMode && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-2 -right-2 w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-blue-700 hover:scale-110 transition-all border-2 border-white"
                      >
                        <FaCamera size={14} />
                      </button>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageChange} accept="image/*" />
                  </div>
                </div>

                {/* Driver Info */}
                <div className="text-center mt-4">
                  <h2 className="text-xl font-bold text-gray-900">{name}</h2>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <FaStar className="text-yellow-500" size={14} />
                    <span className="text-sm font-semibold text-gray-700">{rating.toFixed(1)}</span>
                    <span className="text-xs text-gray-400">({totalTrips} trips)</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{profile?.email || ''}</p>
                  <p className="text-sm text-gray-500">{phone}</p>
                </div>

                {/* Status Badge */}
                <div className="mt-4 flex justify-center">
                  <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 ${profile?.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${profile?.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    {profile?.isOnline ? 'Online • Ready for rides' : 'Offline'}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <FaCar className="mx-auto text-blue-500 mb-1" size={18} />
                    <p className="text-xs text-gray-500">Total Trips</p>
                    <p className="text-lg font-bold text-gray-900">{totalTrips}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <FaMoneyBillWave className="mx-auto text-green-500 mb-1" size={18} />
                    <p className="text-xs text-gray-500">Earnings</p>
                    <p className="text-lg font-bold text-green-600">₹{totalEarnings.toLocaleString()}</p>
                  </div>
                </div>

                {/* License Info */}
                <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <FaIdCard size={14} className="text-blue-500" />
                    <span className="text-xs font-medium text-gray-600">License Number</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{licenseNumber || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Edit Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <User size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Update your personal and vehicle details</p>
                  </div>
                </div>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium text-sm shadow-md shadow-blue-200"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <button
                    onClick={() => { setEditMode(false); fetchProfile(); }}
                    className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium text-sm"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-8">
                {/* Personal Information Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-600 rounded-full" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                        <User size={12} /> Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={!editMode}
                        className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${editMode ? 'border-gray-300 focus:border-blue-500' : 'border-gray-200 bg-gray-50 text-gray-500'
                          }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                        <Phone size={12} /> Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={!editMode}
                        className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${editMode ? 'border-gray-300 focus:border-blue-500' : 'border-gray-200 bg-gray-50 text-gray-500'
                          }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                        <Mail size={12} /> Email
                      </label>
                      <input
                        type="email"
                        value={profile?.email || ''}
                        disabled
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                        <FaIdCard size={12} /> License Number
                      </label>
                      <input
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        disabled={!editMode}
                        className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${editMode ? 'border-gray-300 focus:border-blue-500' : 'border-gray-200 bg-gray-50 text-gray-500'
                          }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Vehicle Details Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-1 h-4 bg-purple-600 rounded-full" />
                    Vehicle Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                        <Tag size={12} /> Car Number
                      </label>
                      <input
                        type="text"
                        value={carNumber}
                        onChange={(e) => setCarNumber(e.target.value)}
                        disabled={!editMode}
                        className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all uppercase ${editMode ? 'border-gray-300 focus:border-blue-500' : 'border-gray-200 bg-gray-50 text-gray-500'
                          }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                        <Car size={12} /> Car Model
                      </label>
                      <input
                        type="text"
                        value={carModel}
                        onChange={(e) => setCarModel(e.target.value)}
                        disabled={!editMode}
                        className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50 text-gray-500'
                          }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                        <Car size={12} /> Car Brand
                      </label>
                      <input
                        type="text"
                        value={carBrand}
                        onChange={(e) => setCarBrand(e.target.value)}
                        disabled={!editMode}
                        className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50 text-gray-500'
                          }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                        <Palette size={12} /> Car Color
                      </label>
                      <input
                        type="text"
                        value={carColor}
                        onChange={(e) => setCarColor(e.target.value)}
                        disabled={!editMode}
                        className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50 text-gray-500'
                          }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-1 h-4 bg-green-600 rounded-full" />
                    Address Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                        <MapPin size={12} /> Full Address
                      </label>
                      <textarea
                        rows="2"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={!editMode}
                        className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50 text-gray-500'
                          }`}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">City</label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          disabled={!editMode}
                          className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50 text-gray-500'
                            }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">State</label>
                        <input
                          type="text"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          disabled={!editMode}
                          className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50 text-gray-500'
                            }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Pincode</label>
                        <input
                          type="text"
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                          disabled={!editMode}
                          className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50 text-gray-500'
                            }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documents Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-1 h-4 bg-orange-600 rounded-full" />
                    Vehicle Documents (Kagaj)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* RC Document */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-600">RC (Registration Certificate)</label>
                      <div className="relative group aspect-[4/3] rounded-xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
                        {rcPreview ? (
                          <img src={rcPreview} alt="RC" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center p-4">
                            <FaFileAlt className="mx-auto text-gray-300 mb-2" size={24} />
                            <p className="text-[10px] text-gray-400">No RC Uploaded</p>
                          </div>
                        )}
                        {editMode && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <label className="cursor-pointer bg-white text-gray-900 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xl flex items-center gap-2">
                              <FaCamera size={12} /> Change RC
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleDocumentChange(e, 'rc')} />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Insurance Document */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-600">Insurance Document</label>
                      <div className="relative group aspect-[4/3] rounded-xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
                        {insurancePreview ? (
                          <img src={insurancePreview} alt="Insurance" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center p-4">
                            <FaFileAlt className="mx-auto text-gray-300 mb-2" size={24} />
                            <p className="text-[10px] text-gray-400">No Insurance Uploaded</p>
                          </div>
                        )}
                        {editMode && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <label className="cursor-pointer bg-white text-gray-900 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xl flex items-center gap-2">
                              <FaCamera size={12} /> Change Insurance
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleDocumentChange(e, 'insurance')} />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PUC Document */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-600">PUC Certificate</label>
                      <div className="relative group aspect-[4/3] rounded-xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
                        {pucPreview ? (
                          <img src={pucPreview} alt="PUC" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center p-4">
                            <FaFileAlt className="mx-auto text-gray-300 mb-2" size={24} />
                            <p className="text-[10px] text-gray-400">No PUC Uploaded</p>
                          </div>
                        )}
                        {editMode && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <label className="cursor-pointer bg-white text-gray-900 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xl flex items-center gap-2">
                              <FaCamera size={12} /> Change PUC
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleDocumentChange(e, 'puc')} />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                {editMode && (
                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                      type="submit"
                      disabled={updating}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50"
                    >
                      {updating ? (
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <FaSave size={14} />
                      )}
                      Save Changes
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Quick Tips */}
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-5 border border-blue-100">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <FaShieldAlt className="text-blue-600" size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Security Tips</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Keep your profile information up to date for better ride matching.
                    Your contact details are only shared with passengers after ride confirmation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}