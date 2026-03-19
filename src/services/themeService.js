import { state } from '../utils/state';

export function setTheme(theme) {
    document.documentElement.classList.remove('dark', 'sepia');
    if (theme !== 'light') document.documentElement.classList.add(theme);
    localStorage.setItem('mylib_theme', theme);
}

export function setAccent(color) {
    const colors = {
        blue: '#3b82f6', rose: '#f43f5e', emerald: '#10b981', amber: '#f59e0b', violet: '#8b5cf6'
    };
    const primary = colors[color] || colors.blue;
    document.documentElement.style.setProperty('--primary-color', primary);
    localStorage.setItem('mylib_accent', color);
}

export function initTheme() {
    const savedTheme = localStorage.getItem('mylib_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else if (savedTheme === 'sepia') {
        document.documentElement.classList.add('sepia');
    }
    setAccent(localStorage.getItem('mylib_accent') || 'blue');
}
