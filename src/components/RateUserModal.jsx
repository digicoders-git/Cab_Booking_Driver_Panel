import React, { useState } from 'react';
import { FaStar, FaTimes, FaSpinner } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { driverService } from '../api/driverApi';

const RateUserModal = ({ isOpen, onClose, bookingId, onSuccess }) => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [review, setReview] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (rating === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Rating Required',
                text: 'Please select at least 1 star for the passenger.',
                confirmButtonColor: '#3B82F6'
            });
            return;
        }

        setIsSubmitting(true);
        
        try {
            const response = await driverService.rateUser(bookingId, rating, review);
            
            if (response.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Thank You!',
                    text: 'Your feedback for the passenger has been submitted.',
                    confirmButtonColor: '#10B981'
                });
                if (onSuccess) onSuccess();
                onClose();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: response.message || 'Something went wrong!',
                });
            }
        } catch (error) {
            console.error('Rating submission error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Could not connect to the server.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md relative shadow-2xl transform transition-all">
                
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors bg-gray-100 p-2 rounded-full hover:bg-gray-200"
                >
                    <FaTimes />
                </button>

                <div className="text-center mb-6 mt-2">
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Rate Passenger</h2>
                    <p className="text-sm text-gray-500">How was your experience with this rider?</p>
                </div>

                <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="transition-transform hover:scale-110 focus:outline-none"
                        >
                            <FaStar 
                                size={40} 
                                className={`transition-colors duration-200 ${(hoverRating || rating) >= star ? 'text-yellow-400 drop-shadow-sm' : 'text-gray-200'}`} 
                            />
                        </button>
                    ))}
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
                        Review (Optional)
                    </label>
                    <textarea
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                        placeholder="Share your experience..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none h-24 text-sm"
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-all text-sm"
                    >
                        Skip
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-[2] bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                    >
                        {isSubmitting ? (
                            <><FaSpinner className="animate-spin" /> Submitting...</>
                        ) : (
                            'Submit Feedback'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RateUserModal;
