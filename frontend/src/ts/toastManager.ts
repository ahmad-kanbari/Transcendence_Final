export type ToastType = 'info' | 'warning' | 'error' | 'success' | 'default';

export interface ToastConfig {
    duration?: number;
    fadeOutDuration?: number;
}

export interface ToastMessage {
    username: string;
    message: string;
    type?: ToastType;
}

export class ToastManager {
    private queue: ToastMessage[];
    private isShowing: boolean;
    private duration: number;
    private fadeOutDuration: number;

    constructor(config: ToastConfig = {}) {
        this.queue = [];
        this.isShowing = false;
        this.duration = config.duration || 3000;
        this.fadeOutDuration = config.fadeOutDuration || 300;
        this.injectStyles();
    }

    private injectStyles(): void {
        // Check if styles already exist
        if (document.getElementById('toast-manager-styles')) return;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'toast-manager-styles';
        styleSheet.textContent = `
            .toast-notification {
                position: fixed;
                top: 60px;
                right: 20px;
                min-width: 300px;
                max-width: 400px;
                padding: 16px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                z-index: 9999;
                font-family: 'Orbitron', sans-serif;
                border-left: 4px solid;
            }

            .toast-notification.show {
                opacity: 1;
                transform: translateX(0);
            }

            .toast-notification .header {
                font-weight: 600;
                margin-bottom: 8px;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .toast-notification .message {
                font-size: 13px;
                line-height: 1.4;
                opacity: 0.9;
            }

            /* Toast type styles */
            .toast-notification.toast-info {
                background-color: rgba(5, 217, 232, 0.1);
                border-left-color: #05D9E8;
                color: #05D9E8;
                box-shadow: 0 4px 12px rgba(5, 217, 232, 0.2);
            }

            .toast-notification.toast-warning {
                background-color: rgba(249, 200, 14, 0.1);
                border-left-color: #F9C80E;
                color: #F9C80E;
                box-shadow: 0 4px 12px rgba(249, 200, 14, 0.2);
            }

            .toast-notification.toast-error {
                background-color: rgba(255, 42, 109, 0.1);
                border-left-color: #FF2A6D;
                color: #FF2A6D;
                box-shadow: 0 4px 12px rgba(255, 42, 109, 0.2);
            }

            .toast-notification.toast-success {
                background-color: rgba(45, 226, 230, 0.1);
                border-left-color: #2DE2E6;
                color: #2DE2E6;
                box-shadow: 0 4px 12px rgba(45, 226, 230, 0.2);
            }

            .toast-notification.toast-default {
                background-color: rgba(157, 78, 221, 0.1);
                border-left-color: #9D4EDD;
                color: #9D4EDD;
                box-shadow: 0 4px 12px rgba(157, 78, 221, 0.2);
            }

            /* High contrast mode support */
            body.high-contrast .toast-notification {
                background-color: #000000 !important;
                color: #ffffff !important;
                border: 2px solid #ffffff !important;
            }

            /* RTL support */
            .rtl .toast-notification {
                right: auto;
                left: 20px;
                transform: translateX(-100%);
            }

            .rtl .toast-notification.show {
                transform: translateX(0);
            }

            /* Mobile responsive */
            @media (max-width: 480px) {
                .toast-notification {
                    right: 10px;
                    left: 10px;
                    min-width: auto;
                    max-width: none;
                }

                .rtl .toast-notification {
                    right: 10px;
                    left: 10px;
                }
            }
        `;
        
        document.head.appendChild(styleSheet);
    }

    private createToastElement(username: string, message: string, type: ToastType = 'default'): HTMLElement {
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;

        const header = document.createElement('div');
        header.className = 'header';
        header.textContent = username;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.textContent = message;

        toast.appendChild(header);
        toast.appendChild(messageDiv);
        document.body.appendChild(toast);

        return toast;
    }

    private async showNextToast(): Promise<void> {
        if (this.isShowing || this.queue.length === 0) return;

        this.isShowing = true;
        const { username, message, type = 'default' } = this.queue.shift()!;

        const toast = this.createToastElement(username, message, type);

        // Trigger reflow to ensure transition works
        void toast.offsetWidth;
        toast.classList.add('show');

        await new Promise(resolve => setTimeout(resolve, this.duration));

        toast.classList.remove('show');
        await new Promise(resolve => setTimeout(resolve, this.fadeOutDuration));

        toast.remove();
        this.isShowing = false;
        this.showNextToast(); // Show next toast if any
    }

    public addToQueue(username: string, message: string, type: ToastType = 'default'): void {
        this.queue.push({ username, message, type });
        this.showNextToast();
    }

    // Legacy method for backward compatibility
    public async showToast(username: string, message: string, type: ToastType = 'default'): Promise<void> {
        this.addToQueue(username, message, type);
    }

    // Convenience methods for different toast types
    public info(username: string, message: string): void {
        this.addToQueue(username, message, 'info');
    }

    public warning(username: string, message: string): void {
        this.addToQueue(username, message, 'warning');
    }

    public error(username: string, message: string): void {
        this.addToQueue(username, message, 'error');
    }

    public success(username: string, message: string): void {
        this.addToQueue(username, message, 'success');
    }

    // Clear all pending toasts
    public clearQueue(): void {
        this.queue = [];
    }

    // Get queue length
    public getQueueLength(): number {
        return this.queue.length;
    }
}

const toastManager = new ToastManager();

// Export toast functionality to global window object for compatibility
declare global {
    interface Window {
        chatToast: {
            addToQueue: (username: string, message: string, type?: ToastType) => void;
            info: (username: string, message: string) => void;
            warning: (username: string, message: string) => void;
            error: (username: string, message: string) => void;
            success: (username: string, message: string) => void;
            clearQueue: () => void;
        };
    }
}

window.chatToast = {
    addToQueue: (username: string, message: string, type: ToastType = 'default') => {
        toastManager.addToQueue(username, message, type);
    },
    info: (username: string, message: string) => {
        toastManager.info(username, message);
    },
    warning: (username: string, message: string) => {
        toastManager.warning(username, message);
    },
    error: (username: string, message: string) => {
        toastManager.error(username, message);
    },
    success: (username: string, message: string) => {
        toastManager.success(username, message);
    },
    clearQueue: () => {
        toastManager.clearQueue();
    }
};

export default toastManager;