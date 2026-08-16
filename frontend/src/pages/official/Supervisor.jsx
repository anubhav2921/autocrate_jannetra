import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Supervisor() {
    const { user, signOut } = useAuth();

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Supervisor Dashboard (Sector Officer)</h1>
            <p>Welcome, officer {user?.email}</p>
            <p>Here you can view and manage tickets in your sector.</p>
            <button 
                onClick={signOut}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
                Log Out
            </button>
        </div>
    );
}
