import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { driverService } from '../../api/driverApi';
import { toast } from 'sonner';
import {
  FaCar, FaUser, FaEnvelope, FaLock, FaPhone, FaIdCard,
  FaMapMarkerAlt, FaArrowRight, FaArrowLeft, FaUpload,
  FaCheckCircle, FaShieldAlt
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

export default function DriverResubmit() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const prefill = location.state?.prefillData || {};
  
  const [form, setForm] = useState({
    email: location.state?.email || prefill.email || '',
    name: prefill.name || '',
    phone: prefill.phone || '',
    licenseNumber: prefill.licenseNumber || '',
    licenseExpiry: prefill.licenseExpiry ? prefill.licenseExpiry.substring(0, 10) : '',
    aadharNumber: prefill.aadharNumber || '',
    panNumber: prefill.panNumber || '',
    aadhar: '', // File fields stay empty for re-upload
    pan: '',
    address: prefill.address || '',
    city: prefill.city || '',
    state: prefill.state || '',
    pincode: prefill.pincode || '',
    accountNumber: prefill.bankDetails?.accountNumber || '',
    ifscCode: prefill.bankDetails?.ifscCode || '',
    accountHolderName: prefill.bankDetails?.accountHolderName || '',
    bankName: prefill.bankDetails?.bankName || '',
    carNumber: prefill.carDetails?.carNumber || '',
    carModel: prefill.carDetails?.carModel || '',
    carBrand: prefill.carDetails?.carBrand || '',
    carType: prefill.carDetails?.carType || '',
    seatCapacity: prefill.carDetails?.seatCapacity || '',
    carColor: prefill.carDetails?.carColor || '',
    manufacturingYear: prefill.carDetails?.manufacturingYear || '',
    insuranceExpiry: prefill.carDetails?.insuranceExpiry ? prefill.carDetails.insuranceExpiry.substring(0, 10) : '',
    permitExpiry: prefill.carDetails?.permitExpiry ? prefill.carDetails.permitExpiry.substring(0, 10) : '',
    pucExpiry: prefill.carDetails?.pucExpiry ? prefill.carDetails.pucExpiry.substring(0, 10) : '',
    image: null, rcImage: null, insuranceImage: null, pucImage: null, permitImage: null
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [carCategories, setCarCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

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
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (step === 0) {
      if (!form.email.trim()) errs.email = 'Email required for identification';
      if (!form.name.trim()) errs.name = 'Name required';
      if (!form.phone.trim()) errs.phone = 'Phone required';
    }
    if (step === 1) {
      if (!form.licenseNumber.trim()) errs.licenseNumber = 'License number required';
      if (!form.licenseExpiry) errs.licenseExpiry = 'License expiry required';
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
        if (form[key]) fd.append(key, form[key]);
      });

      const res = await driverService.resubmitDocuments(fd);

      if (res.success) {
        toast.success('Documents resubmitted successfully! Waiting for admin approval.');
        navigate('/driver/login');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Resubmission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 text-white">
          <h1 className="text-2xl font-bold mb-1">Re-submit Documents</h1>
          <p className="text-indigo-100 text-sm opacity-80">Update your details to get approved</p>
          
          <div className="flex items-center gap-2 mt-6">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-white' : 'bg-white/20'}`} />
            ))}
          </div>
          <p className="text-xs mt-3 font-medium uppercase tracking-wider text-indigo-200">
            Step {step + 1}: {STEPS[step]}
          </p>
        </div>

        <div className="p-8 max-h-[60vh] overflow-y-auto">
          {step === 0 && (
            <div className="space-y-6">
              <InputField label="Identity Email" name="email" icon={FaEnvelope} value={form.email} onChange={handleChange} error={errors.email} readOnly={!!location.state?.email} />
              <InputField label="Full Name" name="name" icon={FaUser} value={form.name} onChange={handleChange} error={errors.name} />
              <InputField label="Phone Number" name="phone" icon={FaPhone} value={form.phone} onChange={handleChange} error={errors.phone} maxLength={10} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <InputField label="License Number" name="licenseNumber" icon={FaIdCard} value={form.licenseNumber} onChange={handleChange} error={errors.licenseNumber} />
                <InputField label="License Expiry" name="licenseExpiry" type="date" value={form.licenseExpiry} onChange={handleChange} error={errors.licenseExpiry} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Aadhar Number" name="aadharNumber" icon={FaShieldAlt} value={form.aadharNumber} onChange={handleChange} error={errors.aadharNumber} maxLength={12} />
                <InputField label="PAN Number" name="panNumber" icon={FaIdCard} value={form.panNumber} onChange={handleChange} error={errors.panNumber} maxLength={10} />
              </div>
              <InputField label="Address" name="address" icon={FaMapMarkerAlt} value={form.address} onChange={handleChange} error={errors.address} />
              <div className="grid grid-cols-2 gap-4">
                <InputField label="City" name="city" value={form.city} onChange={handleChange} error={errors.city} />
                <InputField label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} error={errors.pincode} maxLength={6} />
              </div>
              <FileUpload label="Profile Image" name="image" value={form.image} onChange={handleChange} error={errors.image} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <InputField label="Account Holder" name="accountHolderName" value={form.accountHolderName} onChange={handleChange} />
              <InputField label="Account Number" name="accountNumber" value={form.accountNumber} onChange={handleChange} />
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Bank Name" name="bankName" value={form.bankName} onChange={handleChange} />
                <InputField label="IFSC Code" name="ifscCode" value={form.ifscCode} onChange={handleChange} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Car Number" name="carNumber" icon={FaCar} value={form.carNumber} onChange={handleChange} />
                <InputField label="Car Model" name="carModel" value={form.carModel} onChange={handleChange} />
              </div>
              <select name="carType" value={form.carType} onChange={handleChange} className="w-full p-3 border rounded-xl bg-gray-50 text-sm">
                <option value="">Select Category</option>
                {carCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <FileUpload label="RC Book" name="rcImage" value={form.rcImage} onChange={handleChange} />
              <FileUpload label="Insurance" name="insuranceImage" value={form.insuranceImage} onChange={handleChange} />
              <FileUpload label="Permit" name="permitImage" value={form.permitImage} onChange={handleChange} />
              <FileUpload label="PUC" name="pucImage" value={form.pucImage} onChange={handleChange} />
              <div className="grid grid-cols-2 gap-4">
                <FileUpload label="Aadhar Document" name="aadhar" value={form.aadhar} onChange={handleChange} />
                <FileUpload label="PAN Document" name="pan" value={form.pan} onChange={handleChange} />
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-gray-50 flex gap-4">
          {step > 0 && (
            <button onClick={back} className="flex-1 py-4 border border-gray-200 text-gray-600 rounded-2xl hover:bg-white transition-all font-semibold flex items-center justify-center gap-2">
              <FaArrowLeft /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all font-semibold flex items-center justify-center gap-2">
              Next Step <FaArrowRight />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className="flex-1 py-4 bg-green-600 text-white rounded-2xl hover:bg-green-700 shadow-lg shadow-green-100 transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit Update'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
