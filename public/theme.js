/**
 * Theme switcher functionality
 */
(function() {
    // Check for saved theme preference or use user's system preference
    function getInitialTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme;
        }
        
        // Check if user prefers dark mode
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        
        // Default to light theme
        return 'light';
    }
    
    // Apply theme to document
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        localStorage.setItem('theme', theme);
    }
    
    // Toggle between light and dark theme
    function toggleTheme() {
        const currentTheme = localStorage.getItem('theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
        
        // Show toast notification
        if (typeof toast !== 'undefined') {
            toast.info(`${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode activated`);
        }
    }
    
    // Initialize theme when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        // Apply initial theme
        const initialTheme = getInitialTheme();
        applyTheme(initialTheme);
        
        // Set up click listener for theme toggle button
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }
    });
})(); 