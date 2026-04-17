import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { FontProvider } from './context/FontContext.jsx'

// 🔥 Firebase Service Worker Register karo (Background notifications ke liye ZAROORI hai)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('✅ Firebase SW registered:', registration.scope);
    })
    .catch((err) => {
      console.error('❌ Firebase SW registration failed:', err);
    });
}

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <ThemeProvider>
      <FontProvider>
        <App />
      </FontProvider>
    </ThemeProvider>
  </AuthProvider>
)