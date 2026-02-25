import { useState, useEffect } from 'react';
import { Globe, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { fetchSources } from '../services/api';
import ChromaGrid from '../components/ChromaGrid/ChromaGrid';

const TIER_COLORS = {
    VERIFIED: { border: '#10b981', gradient: 'linear-gradient(145deg, #10b981, #000)' },
    UNKNOWN: { border: '#f59e0b', gradient: 'linear-gradient(145deg, #f59e0b, #000)' },
    FLAGGED: { border: '#ef4444', gradient: 'linear-gradient(145deg, #ef4444, #000)' },
};

export default function Sources() {
    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSources()
            .then((data) => setSources(data.sources || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    // Map sources to ChromaGrid items format
    const chromaItems = sources.map((s) => {
        const tierInfo = TIER_COLORS[s.credibility_tier] || TIER_COLORS.UNKNOWN;
        const accuracy = (s.historical_accuracy * 100).toFixed(0);
        return {
            image: `https://logo.clearbit.com/${s.domain}`,
            title: s.name,
            subtitle: `${s.source_type} • Accuracy: ${accuracy}% • ${s.article_count} signals`,
            handle: s.domain,
            borderColor: tierInfo.border,
            gradient: tierInfo.gradient,
            url: s.domain ? `https://${s.domain}` : null,
        };
    });

    return (
        <div className="page-container">
            <div className="page-header animate-in">
                <h1>Source Registry</h1>
                <p>Credibility profiles and accuracy tracking for all signal sources</p>
            </div>

            <div className="animate-in" style={{ marginTop: '1rem' }}>
                <ChromaGrid
                    items={chromaItems}
                    columns={3}
                    radius={280}
                    damping={0.45}
                />
            </div>
        </div>
    );
}
