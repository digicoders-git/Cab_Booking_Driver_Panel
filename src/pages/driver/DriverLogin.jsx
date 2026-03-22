import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { driverService } from '../../api/driverApi';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { FaCar, FaEnvelope, FaLock, FaArrowRight } from 'react-icons/fa';

export default function DriverLogin() {
  const navigate = useNavigate();
  const { setLoginData } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await driverService.login(email, password);
      // Fallback in case backend uses 'user' key instead of 'driver'
      const driverObj = res.driver || res.user || {};
      if (res.success || res.token) {
        localStorage.setItem('driverToken', res.token);
        localStorage.setItem('driverData', JSON.stringify(driverObj));
        setLoginData({
          adminId: email,
          name: driverObj.name || "Driver",
          id: driverObj._id || "1",
          token: res.token,
          role: "Driver",
          ...driverObj
        });
        toast.success('Login successful!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaCar className="text-3xl text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Login</h1>
          <p className="text-sm text-gray-500 mt-1">Access your driver dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="driver@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                Login <FaArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <button onClick={() => navigate('/driver/register')} className="text-blue-600 hover:underline">
            Register here
          </button>
        </p>
      </div>
    </div>
  );
}
