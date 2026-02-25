import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ProblemContext = createContext()

const API_BASE = '/api/signal-problems'

export function ProblemProvider({ children }) {
    const [problems, setProblems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchProblems = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch(API_BASE)
            if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
            const data = await res.json()
            setProblems(data)
            setError(null)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchProblems()
    }, [fetchProblems])

    const resolveProblem = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/${id}/resolve`, { method: 'PATCH' })
            if (!res.ok) throw new Error(`Failed to resolve: ${res.status}`)
            // Re-fetch to get updated status from DB
            await fetchProblems()
        } catch (err) {
            setError(err.message)
        }
    }

    const getStatus = (id) => {
        const p = problems.find((prob) => prob.id === id)
        return p ? p.status : 'Pending'
    }

    return (
        <ProblemContext.Provider value={{ problems, loading, error, resolveProblem, getStatus }}>
            {children}
        </ProblemContext.Provider>
    )
}

export function useProblems() {
    const ctx = useContext(ProblemContext)
    if (!ctx) throw new Error('useProblems must be used within ProblemProvider')
    return ctx
}
