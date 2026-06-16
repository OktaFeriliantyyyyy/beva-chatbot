// App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import BevaCard from './components/BevaCard';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [isLoggedIn, setLoggedIn] = useState(false);

  const handleLoginSuccess = () => {
    setLoggedIn(true);
  };

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/admin/login" element={<AdminLogin onLoginSuccess={handleLoginSuccess} />} />
          <Route
            path="/admin/dashboard"
            element={
              isLoggedIn ? (
                <AdminDashboard />
              ) : (
                // If not logged in, navigate to the login page
                <Navigate to="/admin/login" />
              )
            }
          />
          <Route path="/" element={<BevaCard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
