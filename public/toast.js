/**
 * Toast notification system
 */
class ToastNotification {
    constructor() {
        this.container = null;
        this.initContainer();
    }

    initContainer() {
        // Create container if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    }

    /**
     * Show a toast notification
     * @param {Object} options - Toast options
     * @param {string} options.type - 'success', 'error', 'warning', or 'info'
     * @param {string} options.title - Toast title
     * @param {string} options.message - Toast message
     * @param {number} options.duration - Duration in ms (default: 3000)
     */
    show(options) {
        const { type = 'info', title, message, duration = 6000 } = options;
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Get icon based on type
        const icon = this.getIcon(type);
        
        // Create toast content
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
        `;
        
        // Add pulse effect for error toasts
        if (type === 'error') {
            toast.classList.add('pulse');
        }
        
        // Add to container
        this.container.appendChild(toast);
        
        // Add close button functionality
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            this.removeToast(toast);
        });
        
        // Auto remove after duration
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
        
        return toast;
    }
    
    /**
     * Remove a toast element
     * @param {HTMLElement} toast - The toast element to remove
     */
    removeToast(toast) {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode === this.container) {
                this.container.removeChild(toast);
            }
        }, 300);
    }
    
    /**
     * Get icon based on toast type
     * @param {string} type - Toast type
     * @returns {string} HTML for the icon
     */
    getIcon(type) {
        switch (type) {
            case 'success':
                return '✅';
            case 'error':
                return '❌';
            case 'warning':
                return '⚠️';
            case 'info':
                return 'ℹ️';
            default:
                return 'ℹ️';
        }
    }
    
    /**
     * Show a success toast
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {number} duration - Duration in ms
     */
    success(title, message, duration) {
        return this.show({ type: 'success', title, message, duration });
    }
    
    /**
     * Show an error toast
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {number} duration - Duration in ms
     */
    error(title, message, duration) {
        return this.show({ type: 'error', title, message, duration });
    }
    
    /**
     * Show a warning toast
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {number} duration - Duration in ms
     */
    warning(title, message, duration) {
        return this.show({ type: 'warning', title, message, duration });
    }
    
    /**
     * Show an info toast
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {number} duration - Duration in ms
     */
    info(title, message, duration) {
        return this.show({ type: 'info', title, message, duration });
    }
}

// Create global toast instance
const toast = new ToastNotification(); 