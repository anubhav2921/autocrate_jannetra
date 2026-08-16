import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function CitizenDashboard() {
    const { user, signOut } = useAuth();

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Citizen Dashboard</h1>
            <p>Welcome, {user?.email}</p>
            <p>Here you can submit social media posts or tickets.</p>
            <button 
                onClick={signOut}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
                Log Out
            </button>
        </div>
    );
}
