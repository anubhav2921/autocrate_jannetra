import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Cpu, Flame, Layers, FileCheck, ArrowUpRight } from 'lucide-react';

const FEATURES = [
    {
        id: "feat-1",
        num: "01",
        title: "100% Software-Driven Ingestion",
        description: "Bypasses expensive physical sensor hardware. JanNetra connects directly to open intelligence feeds, news APIs, and social streams to monitor real-time municipal health continuously.",
        highlight: "Zero Hardware Costs",
        icon: Cpu,
        tags: ["GDELT Stream", "Reddit API", "Open Ingestion"]
    },
    {
        id: "feat-2",
        num: "02",
        title: "Neural Anger & Tension Dynamics",
        description: "Measures emotional intensity on a 0-10 calibrated scale. Identifies escalating civil frustration days before traditional bureaucratic channels even record the complaint.",
        highlight: "Early Warning Alarm",
        icon: Flame,
        tags: ["Anger Heuristics", "DistilBERT", "Tension Meter"]
    },
    {
        id: "feat-3",
        num: "03",
        title: "3-Stage Fake News & Disinfo Armor",
        description: "Examines clickbait headlines, source uncertainty, missing attributions, and aggressive capital shouting to filter out viral rumors and protect municipal stability.",
        highlight: "Multi-Vector Defense",
        icon: ShieldCheck,
        tags: ["Clickbait Scoring", "Source Trust", "Disinfo Filter"]
    },
    {
        id: "feat-4",
        num: "04",
        title: "Automated Governance Risk Index (GRI)",
        description: "Synthesizes source reliability (30%), fake news resistance (25%), fact-check grounding (20%), and viral spread rate (10%) into an unalterable composite score.",
        highlight: "Weighted Governance Index",
        icon: Layers,
        tags: ["5-Pillar Score", "Priority Queue", "Audit Trail"]
    },
    {
        id: "feat-5",
        num: "05",
        title: "Verifiable Citations & Proof of Work",
        description: "Every alert contains cryptographic source hashes and paragraph citations. Citizens and leaders can inspect before-and-after photo verification on fixed resolutions.",
        highlight: "Absolute Accountability",
        icon: FileCheck,
        tags: ["Citation Tracing", "Photo Auditing", "Public Ledger"]
    }
];

const StackingFeatures = () => {
    return (
        <section className="stacking-features-section" id="differentiators">
            <div className="features-inner">
                {/* Section Header */}
                <div className="features-header">
                    <div className="mn-tag-row">
                        <span className="mn-badge">CAPABILITIES // CORE</span>
                        <span className="mn-badge-secondary">[ 5 KEY DIFFERENTIATORS ]</span>
                    </div>
                    <h2 className="features-title">
                        Engineered for <span>Uncompromised Governance</span>
                    </h2>
                    <p className="features-subtitle">
                        Explore the cutting-edge AI architecture that powers JanNetra's civic intelligence platform.
                    </p>
                </div>

                {/* Cards Grid / Stack */}
                <div className="features-grid">
                    {FEATURES.map((feat, idx) => {
                        const Icon = feat.icon;
                        return (
                            <motion.div 
                                key={feat.id} 
                                className="feature-card"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                            >
                                <div className="feat-card-top">
                                    <span className="feat-num">{feat.num} //</span>
                                    <div className="feat-icon-box">
                                        <Icon size={20} />
                                    </div>
                                </div>

                                <h3 className="feat-title">{feat.title}</h3>
                                <p className="feat-desc">{feat.description}</p>

                                <div className="feat-tags">
                                    {feat.tags.map((t, i) => (
                                        <span key={i} className="feat-tag-pill">{t}</span>
                                    ))}
                                </div>

                                <div className="feat-footer">
                                    <span className="feat-highlight">{feat.highlight}</span>
                                    <ArrowUpRight size={18} className="feat-arrow" />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default StackingFeatures;
