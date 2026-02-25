import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ProblemDetail from './pages/ProblemDetail'

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/problem/:id" element={<ProblemDetail />} />
        </Routes>
    )
}
