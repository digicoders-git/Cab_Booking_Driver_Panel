import { useState, useEffect, useRef, forwardRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { driverService } from '../../api/driverApi';
import { toast } from 'sonner';
import {
  FaCar, FaUser, FaEnvelope, FaLock, FaPhone, FaIdCard,
  FaMapMarkerAlt, FaArrowRight, FaArrowLeft, FaUpload,
  FaCheckCircle, FaShieldAlt
} from 'react-icons/fa';

const STEPS = ['Personal Info', 'Documents', 'Bank Details', 'Car Details', 'Documents Upload'];

const InputField = forwardRef(({ label, icon: Icon, error, ...props }, ref) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />}
      <input
        ref={ref}
        className={`w-full ${Icon ? 'pl-9' : 'pl-4'} pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${error ? 'border-red-400' : 'border-gray-300'}`}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
));

const FileUpload = ({ label, name, accept = 'image/*', value, onChange, error }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <label className={`flex items-center gap-3 p-3 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50 ${error ? 'border-red-400' : 'border-gray-300'} ${value ? 'border-green-400 bg-green-50' : ''}`}>
      <input type="file" name={name} accept={accept} className="hidden" onChange={onChange} />
      {value ? (
        <>
          <FaCheckCircle className="text-green-500 text-lg flex-shrink-0" />
          <span className="text-sm text-green-700 truncate">{value.name}</span>
        </>
      ) : (
        <>
          <FaUpload className="text-gray-400 text-lg flex-shrink-0" />
          <span className="text-sm text-gray-500">Click to upload {label}</span>
        </>
      )}
    </label>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

export default function DriverRegister() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setLoginData } = useAuth();
  const [step, setStep] = useState(0);

  // Check if we are in Edit/Resubmit mode from Login page
  const prefill = location.state?.prefillData || null;
  const isEditMode = !!prefill;

  const initialForm = {
    // Personal
    name: prefill?.name || '',
    email: prefill?.email || '',
    phone: prefill?.phone || '',
    password: '',
    confirmPassword: '',
    // Documents
    licenseNumber: prefill?.licenseNumber || '',
    licenseExpiry: prefill?.licenseExpiry ? prefill.licenseExpiry.substring(0, 10) : '',
    aadhar: prefill?.aadharNumber || '',
    pan: prefill?.panNumber || '',
    address: prefill?.address || '',
    city: prefill?.city || '',
    state: prefill?.state || '',
    pincode: prefill?.pincode || '',
    // Bank Details
    accountNumber: prefill?.bankDetails?.accountNumber || '',
    ifscCode: prefill?.bankDetails?.ifscCode || '',
    accountHolderName: prefill?.bankDetails?.accountHolderName || '',
    bankName: prefill?.bankDetails?.bankName || '',
    // Car Details
    carNumber: prefill?.carDetails?.carNumber || '',
    carModel: prefill?.carDetails?.carModel || '',
    carBrand: prefill?.carDetails?.carBrand || '',
    carType: prefill?.carDetails?.carType || '',
    seatCapacity: prefill?.carDetails?.seatCapacity || '',
    carColor: prefill?.carDetails?.carColor || '',
    manufacturingYear: prefill?.carDetails?.manufacturingYear || '',
    insuranceExpiry: prefill?.carDetails?.insuranceExpiry ? prefill.carDetails.insuranceExpiry.substring(0, 10) : '',
    permitExpiry: prefill?.carDetails?.permitExpiry ? prefill.carDetails.permitExpiry.substring(0, 10) : '',
    pucExpiry: prefill?.carDetails?.pucExpiry ? prefill.carDetails.pucExpiry.substring(0, 10) : '',
    // Files (Always null for security)
    image: null, rcImage: null, insuranceImage: null, pucImage: null, permitImage: null,
    aadharFile: null, panFile: null, // New file fields
    addressLatitude: prefill?.addressLatitude || null,
    addressLongitude: prefill?.addressLongitude || null
  };

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [carCategories, setCarCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isAddressSelected, setIsAddressSelected] = useState(false);
  const addressRef = useRef(null);

  useEffect(() => {
    if (step === 1 && addressRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(addressRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'in' }
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) return;

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        // Extract address components
        let city = '', state = '';
        place.address_components.forEach(comp => {
          if (comp.types.includes('locality')) city = comp.long_name;
          if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
        });

        setForm(prev => ({
          ...prev,
          address: place.formatted_address,
          city: city || prev.city,
          state: state || prev.state,
          addressLatitude: lat,
          addressLongitude: lng
        }));
        setIsAddressSelected(true);
      });
    }
  }, [step]);

  useEffect(() => {
    fetchCarCategories();
  }, []);

  const fetchCarCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await driverService.getCarCategories();
      if (response.success && response.categories) {
        setCarCategories(response.categories);
      }
    } catch (err) {
      console.error('Failed to fetch car categories:', err);
      toast.error('Failed to load car categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'carType' && value) {
      const selectedCategory = carCategories.find(cat => cat._id === value);
      if (selectedCategory) {
        setForm(prev => ({
          ...prev,
          [name]: value,
          seatCapacity: selectedCategory.seatCapacity.toString()
        }));
      } else {
        setForm(prev => ({ ...prev, [name]: files ? files[0] : value }));
      }
    } else {
      setForm(prev => ({ ...prev, [name]: files ? files[0] : value }));
      if (name === 'address') setIsAddressSelected(false);
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (step === 0) {
      if (!form.name.trim()) errs.name = 'Name required';
      if (!form.email.trim()) errs.email = 'Email required';
      else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
      if (!form.phone.trim()) errs.phone = 'Phone required';
      else if (!/^\d{10}$/.test(form.phone)) errs.phone = '10 digit phone number';
      
      if (!isEditMode) {
        if (!form.password) errs.password = 'Password required';
        else if (form.password.length < 6) errs.password = 'Min 6 characters';
        if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
      }
    }
    if (step === 1) {
      if (!form.licenseNumber.trim()) errs.licenseNumber = 'License number required';
      if (!form.licenseExpiry) errs.licenseExpiry = 'License expiry required';
      if (!form.aadhar.trim()) errs.aadhar = 'Aadhar required';
      if (!form.pan.trim()) errs.pan = 'PAN required';
      if (!form.address.trim()) errs.address = 'Address required';
      else if (!isAddressSelected) errs.address = 'Please select address from suggestions';
      if (!form.city.trim()) errs.city = 'City required';
      if (!form.state.trim()) errs.state = 'State required';
      if (!isEditMode && !form.image) errs.image = 'Profile photo required';
    }
    if (step === 2) {
      if (!form.accountNumber.trim()) errs.accountNumber = 'Account number required';
      if (!form.ifscCode.trim()) errs.ifscCode = 'IFSC code required';
      if (!form.accountHolderName.trim()) errs.accountHolderName = 'Account holder name required';
      if (!form.bankName.trim()) errs.bankName = 'Bank name required';
    }
    if (step === 3) {
      if (!form.carNumber.trim()) errs.carNumber = 'Car number required';
      if (!form.carModel.trim()) errs.carModel = 'Car model required';
      if (!form.carBrand.trim()) errs.carBrand = 'Car brand required';
      if (!form.carType.trim()) errs.carType = 'Car type required';
      if (!form.seatCapacity) errs.seatCapacity = 'Seat capacity required';
      if (!form.carColor.trim()) errs.carColor = 'Car color required';
      if (!form.manufacturingYear) errs.manufacturingYear = 'Manufacturing year required';
    }
    if (step === 4) {
      if (!isEditMode) {
        if (!form.rcImage) errs.rcImage = 'RC document required';
        if (!form.insuranceImage) errs.insuranceImage = 'Insurance document required';
        if (!form.insuranceExpiry) errs.insuranceExpiry = 'Insurance expiry required';
        if (!form.permitImage) errs.permitImage = 'Permit document required';
        if (!form.permitExpiry) errs.permitExpiry = 'Permit expiry required';
        if (!form.pucImage) errs.pucImage = 'PUC document required';
        if (!form.pucExpiry) errs.pucExpiry = 'PUC expiry required';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => { if (validate()) setStep(s => s + 1); };
  const back = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      Object.keys(form).forEach(key => {
        if (form[key]) {
          // Map special fields for backend
          if (key === 'aadhar') fd.append('aadharNumber', form[key]);
          else if (key === 'pan') fd.append('panNumber', form[key].toUpperCase());
          else if (key === 'aadharFile') fd.append('aadhar', form[key]);
          else if (key === 'panFile') fd.append('pan', form[key]);
          else fd.append(key, form[key]);
        }
      });

      const res = isEditMode 
        ? await driverService.resubmitDocuments(fd)
        : await driverService.register(fd);

      if (res.success) {
        if (!isEditMode) {
          const driverObj = res.driver || {};
          setLoginData({
            adminId: form.email,
            name: driverObj.name || form.name,
            id: driverObj._id || '1',
            token: res.token || '',
            role: 'Driver',
            ...driverObj,
          });
          toast.success('Registration successful! Waiting for admin approval.');
          navigate('/dashboard');
        } else {
          toast.success('Documents updated and resubmitted successfully!');
          navigate('/login');
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">

        {/* Header */}
        <div className={`bg-gradient-to-r ${isEditMode ? 'from-indigo-600 to-blue-600' : 'from-blue-600 to-purple-600'} p-6 text-white`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-1 flex-shrink-0">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{isEditMode ? 'Edit & Resubmit' : 'Driver Registration'}</h1>
              <p className="text-blue-100 text-xs">Cab Booking Panel {isEditMode && '(Review Mode)'}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${i < step ? 'bg-green-400 text-white' : i === step ? 'bg-white text-blue-600' : 'bg-white/30 text-white'}`}>
                  {i < step ? <FaCheckCircle size={14} /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${i < step ? 'bg-green-400' : 'bg-white/30'}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-blue-100 text-xs mt-2">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {step === 0 && (
            <div className="space-y-4">
              <InputField label="Full Name" name="name" icon={FaUser} value={form.name} onChange={handleChange} error={errors.name} />
              <InputField label="Email Address" name="email" icon={FaEnvelope} type="email" value={form.email} onChange={handleChange} error={errors.email} readOnly={isEditMode} />
              <InputField label="Phone Number" name="phone" icon={FaPhone} value={form.phone} onChange={handleChange} error={errors.phone} maxLength={10} />
              {!isEditMode && (
                <>
                  <InputField label="Password" name="password" icon={FaLock} type="password" value={form.password} onChange={handleChange} error={errors.password} />
                  <InputField label="Confirm Password" name="confirmPassword" icon={FaLock} type="password" value={form.confirmPassword} onChange={handleChange} error={errors.confirmPassword} />
                </>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField label="License Number" name="licenseNumber" icon={FaIdCard} value={form.licenseNumber} onChange={handleChange} error={errors.licenseNumber} />
                <InputField label="License Expiry" name="licenseExpiry" type="date" value={form.licenseExpiry} onChange={handleChange} error={errors.licenseExpiry} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Aadhar Number" name="aadhar" icon={FaShieldAlt} value={form.aadhar} onChange={handleChange} error={errors.aadhar} maxLength={12} />
                <InputField label="PAN Number" name="pan" icon={FaIdCard} value={form.pan} onChange={handleChange} error={errors.pan} maxLength={10} />
              </div>
              <InputField 
                ref={addressRef}
                label="Home Address" 
                name="address" 
                icon={FaMapMarkerAlt} 
                value={form.address} 
                onChange={handleChange} 
                error={errors.address} 
                placeholder="Type your address..."
              />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="City" name="city" value={form.city} onChange={handleChange} error={errors.city} />
                <InputField label="State" name="state" value={form.state} onChange={handleChange} error={errors.state} />
              </div>
              <FileUpload label={isEditMode ? 'Update Profile Photo (Optional)' : 'Profile Photo'} name="image" value={form.image} onChange={handleChange} error={errors.image} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <InputField label="Account Holder Name" name="accountHolderName" value={form.accountHolderName} onChange={handleChange} error={errors.accountHolderName} />
              <InputField label="Account Number" name="accountNumber" value={form.accountNumber} onChange={handleChange} error={errors.accountNumber} />
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Bank Name" name="bankName" value={form.bankName} onChange={handleChange} error={errors.bankName} />
                <InputField label="IFSC Code" name="ifscCode" value={form.ifscCode} onChange={handleChange} error={errors.ifscCode} maxLength={11} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Car Number" name="carNumber" icon={FaCar} value={form.carNumber} onChange={handleChange} error={errors.carNumber} />
                <InputField label="Car Model" name="carModel" value={form.carModel} onChange={handleChange} error={errors.carModel} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Car Brand" name="carBrand" value={form.carBrand} onChange={handleChange} error={errors.carBrand} />
                <InputField label="Car Color" name="carColor" value={form.carColor} onChange={handleChange} error={errors.carColor} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Manufacturing Year" name="manufacturingYear" type="number" value={form.manufacturingYear} onChange={handleChange} error={errors.manufacturingYear} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Car Type</label>
                  <select name="carType" value={form.carType} onChange={handleChange} className="w-full px-4 py-2.5 border rounded-xl bg-white text-sm">
                    <option value="">Select a car type</option>
                    {carCategories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <FileUpload label="RC Document" name="rcImage" value={form.rcImage} onChange={handleChange} error={errors.rcImage} />
              <div className="grid grid-cols-2 gap-4">
                <FileUpload label="Insurance Doc" name="insuranceImage" value={form.insuranceImage} onChange={handleChange} error={errors.insuranceImage} />
                <InputField label="Expiry" name="insuranceExpiry" type="date" value={form.insuranceExpiry} onChange={handleChange} error={errors.insuranceExpiry} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FileUpload label="Permit Doc" name="permitImage" value={form.permitImage} onChange={handleChange} error={errors.permitImage} />
                <InputField label="Expiry" name="permitExpiry" type="date" value={form.permitExpiry} onChange={handleChange} error={errors.permitExpiry} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FileUpload label="PUC Doc" name="pucImage" value={form.pucImage} onChange={handleChange} error={errors.pucImage} />
                <InputField label="Expiry" name="pucExpiry" type="date" value={form.pucExpiry} onChange={handleChange} error={errors.pucExpiry} />
              </div>
              {isEditMode && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  <FileUpload label="Update Aadhar Doc" name="aadharFile" value={form.aadharFile} onChange={handleChange} />
                  <FileUpload label="Update PAN Doc" name="panFile" value={form.panFile} onChange={handleChange} />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {step > 0 && (
            <button onClick={back} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl flex items-center justify-center gap-2 text-sm">
              <FaArrowLeft size={12} /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="flex-1 py-3 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2 text-sm">
              Next <FaArrowRight size={12} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className={`flex-1 py-3 bg-gradient-to-r ${isEditMode ? 'from-green-600 to-green-700' : 'from-blue-600 to-blue-700'} text-white rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-50`}>
              {loading ? 'Processing...' : (isEditMode ? 'Submit Changes' : 'Submit Registration')}
            </button>
          )}
        </div>

        {!isEditMode && step === 0 && (
          <div className="px-6 pb-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-blue-600 font-bold hover:underline"
              >
                Login here
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
