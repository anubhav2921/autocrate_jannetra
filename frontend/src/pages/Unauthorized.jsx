import React from 'react';
import { Link } from 'react-router-dom';

export default function Unauthorized() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
            <h1 className="text-4xl font-bold mb-4 text-red-500">403 - Unauthorized</h1>
            <p className="mb-8">You do not have permission to access this page.</p>
            <Link 
                to="/"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
                Return to Dashboard
            </Link>
        </div>
    );
}
