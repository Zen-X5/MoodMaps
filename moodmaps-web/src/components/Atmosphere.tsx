'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- ROMANTIC: Petal Effect ---
const RomanticPetals = () => {
    const petals = Array.from({ length: 40 });
    return (
        <>
            {petals.map((_, i) => {
                const delay = Math.random() * 10;
                const duration = 8 + Math.random() * 8;
                // Spawn more in the center area
                const left = 30 + Math.random() * 40;
                const size = 8 + Math.random() * 12;
                const rotation = Math.random() * 360;
                return (
                    <motion.div
                        key={i}
                        initial={{ y: -50, x: `${left}vw`, rotate: rotation, opacity: 0, scale: 0.5 }}
                        animate={{
                            y: '110vh',
                            x: `${left + (Math.random() * 40 - 20) + (i % 2 === 0 ? 10 : -10)}vw`,
                            rotate: rotation + 1440,
                            opacity: [0, 1, 1, 0],
                            scale: [0.5, 1, 1, 0.5]
                        }}
                        transition={{ duration, repeat: Infinity, delay, ease: "linear" }}
                        style={{
                            position: 'fixed',
                            width: size,
                            height: size,
                            background: 'radial-gradient(circle at 30% 30%, #f9a8d4 0%, #ec4899 100%)',
                            borderRadius: '50% 0 50% 50%',
                            boxShadow: '0 4px 10px rgba(236, 72, 153, 0.2)',
                            zIndex: 10,
                            pointerEvents: 'none',
                            filter: 'blur(0.5px)'
                        }}
                    />
                );
            })}
        </>
    );
};

// --- LONELY: Persistent Rain ---
const LonelyRain = () => {
    const drops = Array.from({ length: 150 });
    return (
        <>
            {drops.map((_, i) => {
                const delay = Math.random() * 2;
                const duration = 0.4 + Math.random() * 0.3;
                const left = 10 + Math.random() * 80;
                const height = 40 + Math.random() * 60;
                return (
                    <motion.div
                        key={i}
                        initial={{ y: -100, x: `${left}vw`, opacity: 0 }}
                        animate={{ y: '110vh', opacity: [0, 0.6, 0.6, 0] }}
                        transition={{ duration, repeat: Infinity, delay, ease: "linear" }}
                        style={{
                            position: 'fixed',
                            width: '1px',
                            height: `${height}px`,
                            background: 'linear-gradient(to bottom, transparent, rgba(147, 197, 253, 0.6))',
                            zIndex: 10,
                            pointerEvents: 'none',
                            filter: 'blur(1px)'
                        }}
                    />
                );
            })}
        </>
    );
};

// --- CHILL: Ambient Bokeh Orbs ---
const ChillBokeh = () => {
    const particles = Array.from({ length: 20 });
    return (
        <>
            {/* Background Soft Glow */}
            <motion.div
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 10, repeat: Infinity }}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'radial-gradient(circle at 50% 50%, rgba(20, 184, 166, 0.1) 0%, transparent 80%)',
                    zIndex: 5,
                }}
            />
            {particles.map((_, i) => {
                const delay = Math.random() * 15;
                const duration = 20 + Math.random() * 15;
                const left = 20 + Math.random() * 60;
                const top = 20 + Math.random() * 60;
                const size = 150 + Math.random() * 300;
                return (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.8, x: `${left}vw`, y: `${top}vh` }}
                        animate={{
                            opacity: [0, 0.25, 0.25, 0],
                            scale: [0.8, 1.4, 1.4, 0.8],
                            x: `${left + (Math.random() * 15 - 7.5)}vw`,
                            y: `${top + (Math.random() * 15 - 7.5)}vh`
                        }}
                        transition={{ duration, repeat: Infinity, delay, ease: "easeInOut" }}
                        style={{
                            position: 'fixed',
                            width: size,
                            height: size,
                            background: 'radial-gradient(circle, rgba(45, 212, 191, 0.25) 0%, transparent 70%)',
                            borderRadius: '50%',
                            filter: 'blur(60px)',
                            zIndex: 9,
                            pointerEvents: 'none',
                        }}
                    />
                );
            })}
        </>
    );
};

// --- NOSTALGIC: Vintage Film ---
const NostalgicGrain = () => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(245, 158, 11, 0.08)',
            zIndex: 41,
            pointerEvents: 'none',
            filter: 'sepia(0.5)'
        }}
    >
        {/* Moving Scratches / Grain Simulation */}
        <div className="grain-overlay" />
        <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 50%, transparent 20%, rgba(69, 26, 3, 0.3) 100%)',
        }} />
        <style jsx>{`
      .grain-overlay {
        position: absolute;
        inset: -100%;
        background-image: url("https://www.transparenttextures.com/patterns/film-grain.png");
        opacity: 0.2;
        animation: grain 0.5s steps(3) infinite;
      }
      @keyframes grain {
        0% { transform: translate(0, 0); }
        33% { transform: translate(-5%, -5%); }
        66% { transform: translate(5%, 5%); }
      }
    `}</style>
    </motion.div>
);

// --- UNSAFE: Glitchy Danger ---
const UnsafeAlert = () => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
            position: 'fixed',
            inset: 0,
            zIndex: 41,
            pointerEvents: 'none',
        }}
    >
        <motion.div
            animate={{
                boxShadow: [
                    'inset 0 0 100px rgba(239, 44, 44, 0.4)',
                    'inset 0 0 200px rgba(239, 44, 44, 0.7)',
                    'inset 0 0 100px rgba(239, 44, 44, 0.4)'
                ]
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: 'absolute', inset: 0 }}
        />
        <motion.div
            animate={{ opacity: [0, 0.05, 0] }}
            transition={{ duration: 0.2, repeat: Infinity, repeatDelay: Math.random() * 5 }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(239, 44, 44, 0.1)' }}
        />
    </motion.div>
);

interface AtmosphereProps {
    mood: string | null;
}

const Atmosphere: React.FC<AtmosphereProps> = ({ mood }) => {
    return (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 40 }}>
            <AnimatePresence mode="wait">
                {mood === 'romantic' && <motion.div key="rom" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><RomanticPetals /></motion.div>}
                {mood === 'lonely' && <motion.div key="lon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><LonelyRain /></motion.div>}
                {mood === 'chill' && <motion.div key="chi" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ChillBokeh /></motion.div>}
                {mood === 'nostalgic' && <motion.div key="nos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><NostalgicGrain /></motion.div>}
                {mood === 'unsafe' && <motion.div key="uns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><UnsafeAlert /></motion.div>}
            </AnimatePresence>
        </div>
    );
};

export default Atmosphere;
