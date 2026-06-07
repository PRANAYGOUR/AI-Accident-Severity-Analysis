import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UserUpload from './pages/UserUpload';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import './App.css';

// Protected Route Wrapper for Dashboard realism
const ProtectedAdmin = ({ children }) => {
  const isAuth = localStorage.getItem('adminAuth') === 'true';
  return isAuth ? children : <AdminLogin />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UserUpload />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin" element={
            <ProtectedAdmin>
                <AdminDashboard />
            </ProtectedAdmin>
        } />
      </Routes>
    </Router>
  );
}

export default App;
