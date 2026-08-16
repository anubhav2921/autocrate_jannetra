import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function CommandCenter() {
    const { user, signOut } = useAuth();

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Command Center (District Admin)</h1>
            <p>Welcome, admin {user?.email}</p>
            <p>Here you can view district-wide analytics and manage sector officers.</p>
            <button 
                onClick={signOut}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
                Log Out
            </button>
        </div>
    );
}
