import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Activity, 
    Zap, 
    Shield, 
    AlertTriangle, 
    Globe, 
    TrendingUp, 
    ArrowUpRight,
    Command,
    Radio,
    Layers,
    Cpu
} from 'lucide-react';
import '../assets/styles/pulse.css';

const PulseDashboard = () => {
    const [vitality, setVitality] = useState(84);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
        const interval = setInterval(() => {
            setVitality(prev => Math.min(100, Math.max(0, prev + (Math.random() - 0.5) * 4)));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.3
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
        }
    };

    return (
        <div className="pulse-page">
            {/* Background Elements */}
            <div className="pulse-bg-mesh"></div>
            <div className="pulse-noise"></div>
            
            <motion.div 
                className="pulse-container"
                variants={containerVariants}
                initial="hidden"
                animate={isLoaded ? "visible" : "hidden"}
            >
                {/* Header Section - Asymmetric */}
                <header className="pulse-header">
                    <motion.div variants={itemVariants} className="header-left">
                        <span className="scout-tag">SYSTEM STATUS: OPERATIONAL</span>
                        <h1 className="display-title">Governance <br/><span className="accent-text">Intelligence</span></h1>
                    </motion.div>
                    <motion.div variants={itemVariants} className="header-right">
                        <div className="header-stat">
                            <span className="stat-label">UPTIME</span>
                            <span className="stat-value">99.98%</span>
                        </div>
                        <div className="header-stat">
                            <span className="stat-label">SIGNALS</span>
                            <span className="stat-value">4.2K/H</span>
                        </div>
                    </motion.div>
                </header>

                {/* Hero Section - The Pulse */}
                <section className="pulse-hero">
                    <motion.div variants={itemVariants} className="pulse-orb-container">
                        <div className="pulse-orb">
                            <div className="orb-inner"></div>
                            <div className="orb-glow"></div>
                            <div className="orb-content">
                                <Activity className="orb-icon" />
                                <span className="orb-number">{vitality.toFixed(1)}</span>
                                <span className="orb-label">VITALITY INDEX</span>
                            </div>
                        </div>
                        {/* Orbiting Elements */}
                        <div className="orbit orbit-1"></div>
                        <div className="orbit orbit-2"></div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="hero-description">
                        <div className="desc-card">
                            <Radio className="card-icon neon-cyan" />
                            <h3>Neural Aggregator</h3>
                            <p>Real-time processing of 124 decentralized signal nodes across the northern sector.</p>
                            <div className="card-link">VIEW NODES <ArrowUpRight /></div>
                        </div>
                    </motion.div>
                </section>

                {/* Grid-Breaking Stats */}
                <div className="pulse-grid">
                    <motion.div variants={itemVariants} className="grid-item large-card">
                        <div className="card-header">
                            <Layers className="card-icon neon-purple" />
                            <span>REGIONAL DENSITY</span>
                        </div>
                        <div className="density-chart">
                            {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                                <motion.div 
                                    key={i} 
                                    className="bar" 
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    transition={{ delay: 1 + i * 0.1, duration: 1 }}
                                />
                            ))}
                        </div>
                        <div className="card-footer">
                            <span>NORTH: HIGH</span>
                            <span>SOUTH: NOMINAL</span>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="grid-item info-card">
                        <div className="card-header">
                            <Zap className="card-icon neon-yellow" />
                            <span>RECENT ANOMALIES</span>
                        </div>
                        <div className="anomaly-list">
                            <div className="anomaly-item">
                                <div className="anomaly-dot critical"></div>
                                <div className="anomaly-text">
                                    <strong>Signal Dropout</strong>
                                    <span>Sector 7G — 12:45</span>
                                </div>
                            </div>
                            <div className="anomaly-item">
                                <div className="anomaly-dot warning"></div>
                                <div className="anomaly-text">
                                    <strong>Latency Spike</strong>
                                    <span>Sector 3B — 12:42</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="grid-item data-card">
                        <div className="card-header">
                            <Cpu className="card-icon neon-blue" />
                            <span>CORES</span>
                        </div>
                        <div className="core-display">
                            <div className="core-temp">42°C</div>
                            <div className="core-load">24%</div>
                        </div>
                    </motion.div>
                </div>

                {/* Floating Bottom Nav / Action */}
                <motion.div 
                    variants={itemVariants} 
                    className="pulse-footer"
                >
                    <div className="footer-content">
                        <div className="footer-tag">
                            <Command size={14} /> SYSTEM CMD LINE
                        </div>
                        <div className="footer-marquee">
                            <span>DEPLOYING PATCH 4.0.1...</span>
                            <span>OPTIMIZING SIGNAL GAIN...</span>
                            <span>RECALIBRATING SENSORS...</span>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
            
            {/* Overlay Scanline Effect */}
            <div className="pulse-scanline"></div>
        </div>
    );
};

export default PulseDashboard;
