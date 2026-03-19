import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Initial theme check: localStorage -> System Preference -> 'dark' (default)
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('app-theme');
        if (saved) return saved;
        
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return 'dark';
    });

    useEffect(() => {
        // Apply theme to document element
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            // We use 'dark' as default or explicit attribute
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        
        localStorage.setItem('app-theme', theme);
        
        // Add a temporary class to disable transitions during theme switch 
        // if we want to avoid "flash", but the user explicitly asked for 200-300ms transitions.
        // So we keep transitions enabled.
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
