// Dashboard.js
import React, { useEffect } from 'react';
import './AdminDashboard.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar, faDatabase } from '@fortawesome/free-solid-svg-icons';

const AdminDashboard = () => {
    useEffect(() => {
        // Tambahkan kelas pada body ketika komponen di-mount
        document.body.classList.add('dashboard-body');
        
        // Hapus kelas dari body ketika komponen di-unmount
        return () => {
            document.body.classList.remove('dashboard-body');
        };
    }, []);

    return (
        
        <div className="dashboard-container">
            <div className="dashboard-left">
            <img src="Logo berijalan 12.36x3.8 - Secondary.png" alt="Logo" className="logo" />
            <div className="dashboard-icons">
                    <FontAwesomeIcon icon={faChartBar} className="dashboard-icon" />
                    <span className="dashboard-text">Dashboard</span>
                </div>
                <div className="dashboard-icons">
                    <FontAwesomeIcon icon={faDatabase} className="dashboard-icon" />
                    <span className="dashboard-text">Data</span>
                </div>
            </div>
            <div className="dashboard-right">
                {/* Konten area kanan dashboard */}
            </div>
        </div>
    );
};

export default AdminDashboard;
