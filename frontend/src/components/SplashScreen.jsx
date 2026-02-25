import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen({ onComplete }) {
    const [exiting, setExiting] = useState(false);

    const handleAnimationComplete = () => {
        setTimeout(() => {
            setExiting(true);
            setTimeout(() => onComplete(), 800);
        }, 600);
    };

    return (
        <AnimatePresence>
            {!exiting ? (
                <motion.div
                    key="splash"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'radial-gradient(ellipse at center, #0a0e1a 0%, #020408 70%, #000 100%)',
                        overflow: 'hidden',
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Ambient glow rings */}
                    <div style={{
                        position: 'absolute',
                        width: '600px',
                        height: '600px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
                        animation: 'pulseGlow 4s ease-in-out infinite',
                    }} />
                    <div style={{
                        position: 'absolute',
                        width: '400px',
                        height: '400px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
                        animation: 'pulseGlow 4s ease-in-out infinite 1s',
                    }} />

                    {/* Main brand text */}
                    <motion.h1
                        initial={{
                            scale: 15,
                            opacity: 0,
                            filter: 'blur(40px)',
                            letterSpacing: '1.5em',
                        }}
                        animate={{
                            scale: 1,
                            opacity: 1,
                            filter: 'blur(0px)',
                            letterSpacing: '0.2em',
                        }}
                        exit={{
                            scale: 1.1,
                            filter: 'blur(20px)',
                            opacity: 0,
                        }}
                        transition={{
                            duration: 2.8,
                            ease: [0.16, 1, 0.3, 1],
                        }}
                        onAnimationComplete={handleAnimationComplete}
                        style={{
                            fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #06b6d4)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                            textTransform: 'uppercase',
                            userSelect: 'none',
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        JanNetra
                    </motion.h1>

                    {/* Tagline */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 0.6, y: 0 }}
                        transition={{ delay: 2.2, duration: 1, ease: 'easeOut' }}
                        style={{
                            position: 'absolute',
                            bottom: '38%',
                            fontSize: '0.85rem',
                            color: '#94a3b8',
                            letterSpacing: '0.3em',
                            textTransform: 'uppercase',
                            fontWeight: 300,
                        }}
                    >
                        AI-Powered Visual Intelligence
                    </motion.p>

                    {/* Bottom loading bar */}
                    <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 3.2, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            position: 'absolute',
                            bottom: '30%',
                            width: '180px',
                            height: '2px',
                            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                            transformOrigin: 'left',
                            borderRadius: '2px',
                        }}
                    />

                    <style>{`
                        @keyframes pulseGlow {
                            0%, 100% { transform: scale(1); opacity: 0.5; }
                            50% { transform: scale(1.15); opacity: 1; }
                        }
                    `}</style>
                </motion.div>
            ) : (
                <motion.div
                    key="splash-exit"
                    initial={{ opacity: 1 }}
                    animate={{
                        opacity: 0,
                        scale: 1.05,
                        filter: 'blur(20px)',
                    }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'radial-gradient(ellipse at center, #0a0e1a 0%, #020408 70%, #000 100%)',
                    }}
                >
                    <h1 style={{
                        fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #06b6d4)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                    }}>
                        JanNetra
                    </h1>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
