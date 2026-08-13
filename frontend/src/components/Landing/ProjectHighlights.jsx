import React from 'react';
import { motion } from 'framer-motion';

const HIGHLIGHTS = [
    {
        metric: "100%",
        title: "Software-Driven",
        description: "Zero dependency on proprietary field sensors. Operates on real-time open geospatial feeds and automated NLP pipelines."
    },
    {
        metric: "30-Min",
        title: "Autonomous Cycle",
        description: "Background scheduler continuously executes full Ingest -> Neural Sentiment -> Semantic Clustering cycles 24/7."
    },
    {
        metric: "< 5s",
        title: "Inference Latency",
        description: "Sub-second NLP batch classification with DistilBERT on GPU and instant automated routing notices."
    },
    {
        metric: "95%+",
        title: "Classification Accuracy",
        description: "High-certainty municipal department categorization preventing bureaucratic misrouting."
    }
];

const ProjectHighlights = () => {
    return (
        <section className="highlights-section" id="highlights">
            <div className="highlights-inner">
                {/* Left: Sticky Header */}
                <div className="highlights-left">
                    <div className="mn-tag-row">
                        <span className="mn-badge">METRICS // BENCHMARKS</span>
                    </div>
                    <h2 className="highlights-big-title">
                        Platform <br />
                        <span>Highlights</span>
                    </h2>
                    <p className="highlights-sub">
                        Real-time telemetry and benchmarks verified across active urban deployments.
                    </p>
                </div>

                {/* Right: Asymmetric Cards Grid */}
                <div className="highlights-grid">
                    {HIGHLIGHTS.map((item, idx) => (
                        <motion.div 
                            key={idx} 
                            className="highlight-card"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                        >
                            <h3 className="highlight-metric">{item.metric}</h3>
                            <h4 className="highlight-item-title">{item.title}</h4>
                            <p className="highlight-item-desc">{item.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ProjectHighlights;
