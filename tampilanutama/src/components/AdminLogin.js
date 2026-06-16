import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminLogin.css';
import AdminDashboard from './AdminDashboard'; // Import the AdminDashboard component

const AdminLogin = ({ onLoginSuccess }) => {
  const [credentials, setCredentials] = useState({ npk: '', password: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate(); // Hook to navigate programmatically

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Simulate authentication (replace with actual authentication logic)
    if (credentials.npk === '201210078' && credentials.password === 'softwareproject') {
      // Successful login
      onLoginSuccess(); // Notify the parent component about the successful login
      navigate('/admin/dashboard'); // Navigate to the dashboard
    } else {
      // Failed login
      setErrorMessage('Invalid NPK or password');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prevCredentials) => ({
      ...prevCredentials,
      [name]: value,
    }));
  };

  return (
    <div className="admin-login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <img src="/bevaicon.png" alt="Card Image" className="admin_img" />
        <input
          type="number"
          className="npk-input"
          placeholder="NPK"
          name="npk"
          value={credentials.npk}
          onChange={handleChange}
        />
        <input
          type="password"
          className="form-input"
          placeholder="Password"
          name="password"
          value={credentials.password}
          onChange={handleChange}
        />
        <button type="submit" className="login-button">
          Login
        </button>
        <p className="error-message">{errorMessage}</p>
      </form>
    </div>
  );
};

export default AdminLogin;
