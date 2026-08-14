import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ShieldCheck, Zap, Users, MapPin } from 'lucide-react';

const CIRCULAR_METRICS = [
    {
        percentage: 92,
        title: "Response Time Reduction",
        description: "Direct routing to municipal authorities reduces resolution latency from 14 days down to under 2 hours."
    },
    {
        percentage: 89,
        title: "Classification Accuracy",
        description: "Zero misrouting of reports using high-fidelity DistilBERT multi-class text taxonomy classifiers."
    },
    {
        percentage: 87,
        title: "Auto-Resolution Rate",
        description: "Civic hazards are auto-verified, assigned, and flagged without human administrator intervention."
    },
    {
        percentage: 83,
        title: "Citizen Feedback Score",
        description: "Positive public response rating based on verified geo-tagged proof-of-resolution transparency."
    }
];

const STAT_NUMBERS = [
    {
        value: "14d ➔ 2h",
        label: "Response Latency Reduction",
        icon: Zap
    },
    {
        value: "15,000+",
        label: "Civic Issues Resolved",
        icon: CheckCircle2
    },
    {
        value: "124 Sectors",
        label: "Urban Districts Covered",
        icon: MapPin
    }
];

const ProjectHighlights = () => {
    return (
        <section className="highlights-section" id="highlights">
            <div className="highlights-inner">
                {/* Header */}
                <div className="section-head" style={{ marginBottom: '60px' }}>
                    <div className="mn-tag-row" style={{ justifyContent: 'center' }}>
                        <span className="mn-badge">IMPACT // METRICS</span>
                        <span className="mn-badge-secondary">[ BENCHMARKS ]</span>
                    </div>
                    <h2 className="section-title">Measurable Civic Impact</h2>
                    <p className="section-subtitle">
                        Proven benchmarks achieved across pilot deployments and simulated municipal sectors.
                    </p>
                </div>

                {/* Circular Metrics Grid */}
                <div className="circles-grid">
                    {CIRCULAR_METRICS.map((item, idx) => {
                        const radius = 50;
                        const circumference = 2 * Math.PI * radius;
                        const offset = circumference - (item.percentage / 100) * circumference;

                        return (
                            <motion.div 
                                key={idx}
                                className="circle-metric-card"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: idx * 0.1 }}
                            >
                                <div className="svg-circle-box">
                                    <svg width="120" height="120" className="progress-ring">
                                        {/* Background Track */}
                                        <circle 
                                            className="progress-ring-track"
                                            stroke="rgba(255, 255, 255, 0.05)"
                                            strokeWidth="8"
                                            fill="transparent"
                                            r={radius}
                                            cx="60"
                                            cy="60"
                                        />
                                        {/* Colored Progress Fill */}
                                        <motion.circle 
                                            className="progress-ring-fill"
                                            stroke="#A881FE"
                                            strokeWidth="8"
                                            strokeDasharray={circumference}
                                            initial={{ strokeDashoffset: circumference }}
                                            whileInView={{ strokeDashoffset: offset }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 1.2, delay: idx * 0.15, ease: "easeOut" }}
                                            strokeLinecap="round"
                                            fill="transparent"
                                            r={radius}
                                            cx="60"
                                            cy="60"
                                        />
                                    </svg>
                                    <span className="circle-percentage-text">{item.percentage}%</span>
                                </div>
                                <h3 className="circle-card-title">{item.title}</h3>
                                <p className="circle-card-desc">{item.description}</p>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Horizontal Numeric Stats Row */}
                <div className="stats-number-row">
                    {STAT_NUMBERS.map((stat, idx) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div 
                                key={idx}
                                className="stat-number-card"
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: idx * 0.15 }}
                            >
                                <div className="stat-num-header">
                                    <div className="stat-icon-wrapper">
                                        <Icon size={20} className="text-accent" />
                                    </div>
                                    <span className="stat-num-value">{stat.value}</span>
                                </div>
                                <span className="stat-num-label">{stat.label}</span>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default ProjectHighlights;
