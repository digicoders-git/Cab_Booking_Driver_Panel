import React, { useState, useEffect, useRef } from 'react';
import { driverService } from '../../api/driverApi';
import { toast } from 'sonner';
import { FaMapMarkerAlt, FaTimesCircle, FaLocationArrow, FaCheckCircle } from 'react-icons/fa';

const DestinationFilter = () => {
  const [loading, setLoading] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [activeDestination, setActiveDestination] = useState(null);
  const [filterCount, setFilterCount] = useState(0);
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    address: ''
  });
  const inputRef = useRef(null);

  const fetchProfile = async () => {
    try {
      const res = await driverService.getProfile();
      if (res.success && res.driver) {
        if (res.driver.destinationFilterActive && res.driver.preferredDestination) {
          setActiveDestination(res.driver.preferredDestination);
        } else {
          setActiveDestination(null);
        }
        setFilterCount(res.driver.destinationFilterCount || 0);
      }
    } catch (err) {
      console.error("Error fetching profile", err);
    }
  };

  useEffect(() => {
    fetchProfile();
    
    if (!window.google) return;
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['geocode', 'establishment'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        setFormData((prev) => ({
          ...prev,
          address: place.formatted_address || place.name || prev.address,
          latitude: place.geometry.location.lat().toString(),
          longitude: place.geometry.location.lng().toString()
        }));
      }
    });
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsFetchingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
            address: 'My Current Location'
          });
          setIsFetchingLocation(false);
          toast.success("Location updated!");
        },
        (error) => {
          setIsFetchingLocation(false);
          if (error.code === error.TIMEOUT) {
             toast.error("Location request timed out. Please enter manually.");
          } else {
             toast.error("Error getting location: " + error.message);
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
    }
  };

  const handleSetDestination = async (e) => {
    e.preventDefault();
    if (!formData.latitude || !formData.longitude) {
      toast.error('Latitude and Longitude are required.');
      return;
    }

    try {
      setLoading(true);
      const res = await driverService.setDestinationFilter({
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        address: formData.address || 'Custom Location'
      });
      if (res.success) {
        toast.success(`Destination set! Used ${res.destinationFilterCount}/4 today.`);
        fetchProfile(); // Refresh UI
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error setting destination');
    } finally {
      setLoading(false);
    }
  };

  const handleClearDestination = async () => {
    try {
      setLoading(true);
      const res = await driverService.clearDestinationFilter();
      if (res.success) {
        toast.success(res.message || 'Destination filter cleared.');
        setFormData({ latitude: '', longitude: '', address: '' });
        fetchProfile(); // Refresh UI
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error clearing destination');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FaMapMarkerAlt className="text-blue-200" />
              Home-Bound Rides
            </h1>
            <p className="mt-3 text-blue-100 max-w-xl text-sm sm:text-base">
              Set a preferred destination up to 4 times a day. We'll only send you rides heading in that general direction.
            </p>
          </div>
          <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
            <FaMapMarkerAlt size={150} />
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {activeDestination && (
            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-4">
              <FaCheckCircle className="text-green-500 text-xl mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-green-900">Active Destination Filter</h3>
                <p className="text-green-800 mt-1 text-sm">{activeDestination.address}</p>
                <p className="text-green-700 text-xs mt-2 font-medium bg-green-100 inline-block px-2 py-1 rounded">
                  Filter Uses Today: {filterCount}/4
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSetDestination} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Destination Address</label>
                <input
                  type="text"
                  name="address"
                  ref={inputRef}
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g. Noida Sector 62"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Latitude *</label>
                <input
                  type="number"
                  step="any"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  placeholder="e.g. 28.6139"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Longitude *</label>
                <input
                  type="number"
                  step="any"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  placeholder="e.g. 77.2090"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>
            
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isFetchingLocation}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isFetchingLocation ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600"></div>
                    Fetching...
                  </>
                ) : (
                  <>
                    <FaLocationArrow /> Use Current Location
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-70 shadow-md shadow-blue-500/20 cursor-pointer"
              >
                {loading ? 'Processing...' : <><FaMapMarkerAlt /> {activeDestination ? 'Update Destination' : 'Set Destination'}</>}
              </button>
              {activeDestination && (
                <button
                  type="button"
                  onClick={handleClearDestination}
                  disabled={loading}
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-70 border border-red-200 cursor-pointer"
                >
                  <FaTimesCircle /> Clear Filter
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DestinationFilter;
