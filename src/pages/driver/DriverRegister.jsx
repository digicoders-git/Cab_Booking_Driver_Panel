import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { driverService } from '../../api/driverApi';
import { toast } from 'sonner';
import {
  FaCar, FaUser, FaEnvelope, FaLock, FaPhone, FaIdCard,
  FaMapMarkerAlt, FaArrowRight, FaArrowLeft, FaUpload,
  FaCheckCircle, FaCamera, FaFileAlt, FaShieldAlt
} from 'react-icons/fa';

const STEPS = ['Personal Info', 'Documents', 'Bank Details', 'Car Details', 'Documents Upload'];

const InputField = ({ label, icon: Icon, error, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />}
      <input
        className={`w-full ${Icon ? 'pl-9' : 'pl-4'} pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${error ? 'border-red-400' : 'border-gray-300'}`}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

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

const initialForm = {
  // Personal
  name: '', email: '', phone: '', password: '', confirmPassword: '',
  // Documents
  licenseNumber: '', licenseExpiry: '', aadhar: '', pan: '',
  address: '', city: '', state: '', pincode: '',
  // Bank Details
  accountNumber: '', ifscCode: '', accountHolderName: '', bankName: '',
  // Car Details
  carNumber: '', carModel: '', carBrand: '', carType: '', seatCapacity: '', carColor: '',
  manufacturingYear: '', insuranceExpiry: '', permitExpiry: '', pucExpiry: '',
  // Files
  image: null, rcImage: null, insuranceImage: null, pucImage: null, permitImage: null,
};

export default function DriverRegister() {
  const navigate = useNavigate();
  const { setLoginData } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [carCategories, setCarCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Fetch car categories on component mount
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
    
    // Agar carType select kiya toh seat capacity auto fill karo
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
    }
    
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // Validation per step
  const validate = () => {
    const errs = {};
    if (step === 0) {
      if (!form.name.trim()) errs.name = 'Name required';
      if (!form.email.trim()) errs.email = 'Email required';
      else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
      if (!form.phone.trim()) errs.phone = 'Phone required';
      else if (!/^\d{10}$/.test(form.phone)) errs.phone = '10 digit phone number';
      if (!form.password) errs.password = 'Password required';
      else if (form.password.length < 6) errs.password = 'Min 6 characters';
      if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    }
    if (step === 1) {
      if (!form.licenseNumber.trim()) errs.licenseNumber = 'License number required';
      if (!form.licenseExpiry) errs.licenseExpiry = 'License expiry required';
      if (!form.aadhar.trim()) errs.aadhar = 'Aadhar required';
      else if (!/^\d{12}$/.test(form.aadhar)) errs.aadhar = '12 digit Aadhar number';
      if (!form.pan.trim()) errs.pan = 'PAN required';
      else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan.toUpperCase())) errs.pan = 'Invalid PAN format';
      if (!form.address.trim()) errs.address = 'Address required';
      if (!form.city.trim()) errs.city = 'City required';
      if (!form.state.trim()) errs.state = 'State required';
      if (!form.pincode.trim()) errs.pincode = 'Pincode required';
      if (!form.image) errs.image = 'Profile photo required';
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
      if (!form.rcImage) errs.rcImage = 'RC document required';
      if (!form.insuranceImage) errs.insuranceImage = 'Insurance document required';
      if (!form.insuranceExpiry) errs.insuranceExpiry = 'Insurance expiry required';
      if (!form.permitImage) errs.permitImage = 'Permit document required';
      if (!form.permitExpiry) errs.permitExpiry = 'Permit expiry required';
      if (!form.pucImage) errs.pucImage = 'PUC document required';
      if (!form.pucExpiry) errs.pucExpiry = 'PUC expiry required';
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
      // Personal
      fd.append('name', form.name);
      fd.append('email', form.email);
      fd.append('phone', form.phone);
      fd.append('password', form.password);
      // Documents
      fd.append('licenseNumber', form.licenseNumber);
      fd.append('licenseExpiry', form.licenseExpiry);
      fd.append('aadhar', form.aadhar);
      fd.append('pan', form.pan.toUpperCase());
      fd.append('address', form.address);
      fd.append('city', form.city);
      fd.append('state', form.state);
      fd.append('pincode', form.pincode);
      // Car
      fd.append('carNumber', form.carNumber);
      fd.append('carModel', form.carModel);
      fd.append('carBrand', form.carBrand);
      fd.append('carType', form.carType);
      fd.append('seatCapacity', form.seatCapacity);
      fd.append('carColor', form.carColor);
      fd.append('manufacturingYear', form.manufacturingYear);
      fd.append('insuranceExpiry', form.insuranceExpiry);
      fd.append('permitExpiry', form.permitExpiry);
      fd.append('pucExpiry', form.pucExpiry);
      // Bank
      fd.append('accountNumber', form.accountNumber);
      fd.append('ifscCode', form.ifscCode);
      fd.append('accountHolderName', form.accountHolderName);
      fd.append('bankName', form.bankName);
      // Files
      fd.append('image', form.image);
      fd.append('rcImage', form.rcImage);
      fd.append('insuranceImage', form.insuranceImage);
      fd.append('permitImage', form.permitImage);
      fd.append('pucImage', form.pucImage);

      const res = await driverService.register(fd);

      if (res.success) {
        // Auto login after registration
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
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-1 flex-shrink-0">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Driver Registration</h1>
              <p className="text-blue-100 text-xs">Cab Booking Panel</p>
            </div>
          </div>

          {/* Step Indicator */}
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

        {/* Form Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">

          {/* Step 0: Personal Info */}
          {step === 0 && (
            <div className="space-y-4">
              <InputField label="Full Name" name="name" icon={FaUser} placeholder="Vivek Kumar" value={form.name} onChange={handleChange} error={errors.name} />
              <InputField label="Email Address" name="email" icon={FaEnvelope} type="email" placeholder="driver@example.com" value={form.email} onChange={handleChange} error={errors.email} />
              <InputField label="Phone Number" name="phone" icon={FaPhone} placeholder="9988776655" value={form.phone} onChange={handleChange} error={errors.phone} maxLength={10} />
              <InputField label="Password" name="password" icon={FaLock} type="password" placeholder="Min 6 characters" value={form.password} onChange={handleChange} error={errors.password} />
              <InputField label="Confirm Password" name="confirmPassword" icon={FaLock} type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={handleChange} error={errors.confirmPassword} />
            </div>
          )}

          {/* Step 1: Documents */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField label="License Number" name="licenseNumber" icon={FaIdCard} placeholder="UP32-DL-123456" value={form.licenseNumber} onChange={handleChange} error={errors.licenseNumber} />
                <InputField label="License Expiry" name="licenseExpiry" type="date" value={form.licenseExpiry} onChange={handleChange} error={errors.licenseExpiry} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Aadhar Number" name="aadhar" icon={FaShieldAlt} placeholder="123443215678" value={form.aadhar} onChange={handleChange} error={errors.aadhar} maxLength={12} />
                <InputField label="PAN Number" name="pan" icon={FaIdCard} placeholder="ABCDE1234F" value={form.pan} onChange={handleChange} error={errors.pan} maxLength={10} />
              </div>
              <InputField label="Address" name="address" icon={FaMapMarkerAlt} placeholder="123, Street Road" value={form.address} onChange={handleChange} error={errors.address} />
              <div className="grid grid-cols-3 gap-3">
                <InputField label="City" name="city" placeholder="Lucknow" value={form.city} onChange={handleChange} error={errors.city} />
                <InputField label="State" name="state" placeholder="UP" value={form.state} onChange={handleChange} error={errors.state} />
                <InputField label="Pincode" name="pincode" placeholder="226001" value={form.pincode} onChange={handleChange} error={errors.pincode} maxLength={6} />
              </div>
              <FileUpload label="Profile Photo" name="image" value={form.image} onChange={handleChange} error={errors.image} />
            </div>
          )}

          {/* Step 2: Bank Details */}
          {step === 2 && (
            <div className="space-y-4">
              <InputField label="Account Holder Name" name="accountHolderName" placeholder="Vivek Kumar" value={form.accountHolderName} onChange={handleChange} error={errors.accountHolderName} />
              <InputField label="Account Number" name="accountNumber" placeholder="123456789012" value={form.accountNumber} onChange={handleChange} error={errors.accountNumber} />
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Bank Name" name="bankName" placeholder="SBI" value={form.bankName} onChange={handleChange} error={errors.bankName} />
                <InputField label="IFSC Code" name="ifscCode" placeholder="SBIN0001234" value={form.ifscCode} onChange={handleChange} error={errors.ifscCode} maxLength={11} />
              </div>
            </div>
          )}

          {/* Step 3: Car Details */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Car Number" name="carNumber" icon={FaCar} placeholder="UP32-AB-1234" value={form.carNumber} onChange={handleChange} error={errors.carNumber} />
                <InputField label="Car Model" name="carModel" placeholder="Swift DZire" value={form.carModel} onChange={handleChange} error={errors.carModel} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Car Brand" name="carBrand" placeholder="Maruti" value={form.carBrand} onChange={handleChange} error={errors.carBrand} />
                <InputField label="Car Color" name="carColor" placeholder="White" value={form.carColor} onChange={handleChange} error={errors.carColor} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Manufacturing Year" name="manufacturingYear" type="number" placeholder="2024" value={form.manufacturingYear} onChange={handleChange} error={errors.manufacturingYear} min="2000" max={new Date().getFullYear()} />
                {/* Car Type Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Car Type (Category)</label>
                  <select
                    name="carType"
                    value={form.carType}
                    onChange={handleChange}
                    disabled={loadingCategories}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                      errors.carType ? 'border-red-400' : 'border-gray-300'
                    } ${loadingCategories ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                  >
                    <option value="">{loadingCategories ? 'Loading categories...' : 'Select a car type'}</option>
                    {carCategories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name} ({category.seatCapacity} seats)
                      </option>
                    ))}
                  </select>
                  {errors.carType && <p className="text-xs text-red-500 mt-1">{errors.carType}</p>}
                </div>
              </div>
              <div className="hidden">
                 <InputField label="Seat Capacity" name="seatCapacity" value={form.seatCapacity} readOnly />
              </div>
              {carCategories.length > 0 && form.carType && (
                <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                  {(() => {
                    const selected = carCategories.find(c => c._id === form.carType);
                    return selected ? (
                      <div className="text-xs text-green-700">
                        <p className="font-medium mb-1">✅ {selected.name} Selected</p>
                        <p>Seats: {selected.seatCapacity} | Base Fare: ₹{selected.baseFare} | Rate: ₹{selected.privateRatePerKm}/km</p>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
              {carCategories.length === 0 && !loadingCategories && (
                <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                  <p className="text-xs text-yellow-700 font-medium">⚠️ No car categories available. Please contact admin.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Documents Upload & Expiry */}
          {step === 4 && (
            <div className="space-y-4">
              <FileUpload label="RC Document" name="rcImage" value={form.rcImage} onChange={handleChange} error={errors.rcImage} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUpload label="Insurance Document" name="insuranceImage" value={form.insuranceImage} onChange={handleChange} error={errors.insuranceImage} />
                <InputField label="Insurance Expiry" name="insuranceExpiry" type="date" value={form.insuranceExpiry} onChange={handleChange} error={errors.insuranceExpiry} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUpload label="Permit Document" name="permitImage" value={form.permitImage} onChange={handleChange} error={errors.permitImage} />
                <InputField label="Permit Expiry" name="permitExpiry" type="date" value={form.permitExpiry} onChange={handleChange} error={errors.permitExpiry} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUpload label="PUC Certificate" name="pucImage" value={form.pucImage} onChange={handleChange} error={errors.pucImage} />
                <InputField label="PUC Expiry" name="pucExpiry" type="date" value={form.pucExpiry} onChange={handleChange} error={errors.pucExpiry} />
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 0 && (
            <button onClick={back} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium flex items-center justify-center gap-2 text-sm">
              <FaArrowLeft size={12} /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium flex items-center justify-center gap-2 text-sm">
              Next <FaArrowRight size={12} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-medium flex items-center justify-center gap-2 text-sm disabled:opacity-50">
              {loading ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <><FaCheckCircle size={14} /> Submit Registration</>
              )}
            </button>
          )}
        </div>

        {/* Login Link */}
        <p className="text-center text-xs text-gray-500 pb-4">
          Already registered?{' '}
          <button onClick={() => navigate('/driver/login')} className="text-blue-600 hover:underline font-medium">
            Login here
          </button>
        </p>
      </div>
    </div>
  );
}
