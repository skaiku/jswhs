/**
 * Toast notification system
 */
class Toast {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
        this.activeToasts = new Set();
    }

    show(options = {}) {
        const {
            title = '',
            message = '',
            type = 'default',
            duration = 3000,
            action = null
        } = options;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');

        // Create toast content with shadcn/ui style structure
        const content = `
            <div class="toast-content-wrapper">
                ${this.getIconForType(type)}
                <div class="toast-content">
                    ${title ? `<h3 class="toast-title">${title}</h3>` : ''}
                    ${message ? `<p class="toast-message">${message}</p>` : ''}
                </div>
                ${action ? `
                    <button class="toast-action" onclick="${action.onClick}">
                        ${action.label}
                    </button>
                ` : ''}
                <button class="toast-close" aria-label="Close">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor"/>
                    </svg>
                </button>
            </div>
            <div class="toast-progress"></div>
        `;

        toast.innerHTML = content;
        
        // Track this toast in our active toasts set
        this.activeToasts.add(toast);

        // Add event listener for close button with improved handling
        const closeButton = toast.querySelector('.toast-close');
        closeButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dismiss(toast);
        });
        
        // Also add click handler on the entire toast to make it dismissible
        toast.addEventListener('click', (e) => {
            // Only dismiss if the click wasn't on an action button
            if (!e.target.closest('.toast-action')) {
                this.dismiss(toast);
            }
        });

        // Add to container
        this.container.appendChild(toast);

        // Trigger enter animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto dismiss
        if (duration > 0) {
            toast.autoCloseTimer = setTimeout(() => {
                this.dismiss(toast);
            }, duration);
        }

        return toast;
    }

    dismiss(toast) {
        // Skip if toast is already being dismissed
        if (toast.classList.contains('hide')) {
            return;
        }
        
        // Clear any existing auto close timer
        if (toast.autoCloseTimer) {
            clearTimeout(toast.autoCloseTimer);
            toast.autoCloseTimer = null;
        }
        
        // Mark as hiding
        toast.classList.add('hide');
        
        // Use both animationend and a timeout as fallback
        const removeToast = () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
                this.activeToasts.delete(toast);
            }
        };
        
        // Set up animation end listener
        const animationEndHandler = () => {
            removeToast();
            toast.removeEventListener('animationend', animationEndHandler);
        };
        
        toast.addEventListener('animationend', animationEndHandler);
        
        // Fallback timeout in case the animation event doesn't fire
        setTimeout(removeToast, 500);
    }

    getIconForType(type) {
        const icons = {
            success: `
                <div class="toast-icon toast-icon-success">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <path d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z" fill="currentColor"/>
                    </svg>
                </div>
            `,
            error: `
                <div class="toast-icon toast-icon-error">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor"/>
                    </svg>
                </div>
            `,
            warning: `
                <div class="toast-icon toast-icon-warning">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <path d="M8.4449 0.608765C8.0183 -0.107015 6.9817 -0.107015 6.5551 0.608765L0.161018 11.3368C-0.275182 12.0675 0.252372 13 1.10592 13H13.8941C14.7476 13 15.2752 12.0675 14.839 11.3368L8.4449 0.608765ZM7.5 1.94868L13.4772 12H1.52276L7.5 1.94868ZM7 7.5V5.5C7 5.22386 7.22386 5 7.5 5C7.77614 5 8 5.22386 8 5.5V7.5C8 7.77614 7.77614 8 7.5 8C7.22386 8 7 7.77614 7 7.5ZM7 10V9C7 8.72386 7.22386 8.5 7.5 8.5C7.77614 8.5 8 8.72386 8 9V10C8 10.2761 7.77614 10.5 7.5 10.5C7.22386 10.5 7 10.2761 7 10Z" fill="currentColor"/>
                    </svg>
                </div>
            `,
            info: `
                <div class="toast-icon toast-icon-info">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <path d="M7.5 1C6.11929 1 5 2.11929 5 3.5C5 4.88071 6.11929 6 7.5 6C8.88071 6 10 4.88071 10 3.5C10 2.11929 8.88071 1 7.5 1ZM6 3.5C6 2.67157 6.67157 2 7.5 2C8.32843 2 9 2.67157 9 3.5C9 4.32843 8.32843 5 7.5 5C6.67157 5 6 4.32843 6 3.5ZM7.5 7C6.67157 7 6 7.67157 6 8.5V12.5C6 13.3284 6.67157 14 7.5 14C8.32843 14 9 13.3284 9 12.5V8.5C9 7.67157 8.32843 7 7.5 7Z" fill="currentColor"/>
                    </svg>
                </div>
            `,
            default: ''
        };

        return icons[type] || icons.default;
    }

    success(message, title = '') {
        return this.show({ type: 'success', message, title });
    }

    error(message, title = '') {
        return this.show({ type: 'error', message, title });
    }

    warning(message, title = '') {
        return this.show({ type: 'warning', message, title });
    }

    info(message, title = '') {
        return this.show({ type: 'info', message, title });
    }
    
    // Method to dismiss all toasts
    dismissAll() {
        this.activeToasts.forEach(toast => {
            this.dismiss(toast);
        });
    }
}

// Initialize toast
const toast = new Toast();

// Add global keyboard handler to dismiss toasts with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        toast.dismissAll();
    }
}); 