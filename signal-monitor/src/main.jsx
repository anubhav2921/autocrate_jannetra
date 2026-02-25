import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ProblemProvider } from './context/ProblemContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <ProblemProvider>
                <App />
            </ProblemProvider>
        </BrowserRouter>
    </React.StrictMode>
)
