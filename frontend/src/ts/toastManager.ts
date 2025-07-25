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
                top: calc(env(safe-area-inset-top, 0px) + 60px);
                right: max(20px, env(safe-area-inset-right, 20px));
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
                box-sizing: border-box;
                margin: 0;
                display: flex;
                flex-direction: column;
                word-wrap: break-word;
                text-overflow: ellipsis;
                overflow: hidden;
                color-scheme: light dark;
            }

            .toast-notification.show {
                opacity: 1;
                transform: translateX(0);
                transition: opacity 0.3s ease-out, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                will-change: transform, opacity;
                backface-visibility: hidden;
            }

            .toast-notification .header {
                font-weight: 600;
                margin-bottom: 8px;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                text-overflow: ellipsis;
                overflow: hidden;
                max-width: 100%;
            }

            .toast-notification .message {
                font-size: 13px;
                line-height: 1.4;
                opacity: 0.9;
                overflow-wrap: break-word;
                word-break: break-word;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
            }

            /* Toast type styles with dark mode support */
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
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .toast-notification {
                    background-color: rgba(20, 20, 30, 0.9);
                }
                
                .toast-notification .message {
                    color: rgba(255, 255, 255, 0.9);
                }
                
                .toast-notification.toast-info {
                    background-color: rgba(5, 217, 232, 0.15);
                    box-shadow: 0 4px 12px rgba(5, 217, 232, 0.25);
                }
                
                .toast-notification.toast-warning {
                    background-color: rgba(249, 200, 14, 0.15);
                    box-shadow: 0 4px 12px rgba(249, 200, 14, 0.25);
                }
                
                .toast-notification.toast-error {
                    background-color: rgba(255, 42, 109, 0.15);
                    box-shadow: 0 4px 12px rgba(255, 42, 109, 0.25);
                }
                
                .toast-notification.toast-success {
                    background-color: rgba(45, 226, 230, 0.15);
                    box-shadow: 0 4px 12px rgba(45, 226, 230, 0.25);
                }
                
                .toast-notification.toast-default {
                    background-color: rgba(157, 78, 221, 0.15);
                    box-shadow: 0 4px 12px rgba(157, 78, 221, 0.25);
                }
            }

            /* High contrast mode and accessibility support */
            body.high-contrast .toast-notification {
                background-color: #000000 !important;
                color: #ffffff !important;
                border: 2px solid #ffffff !important;
                box-shadow: 0 0 0 3px #ffffff !important;
                outline: 1px solid #000000 !important;
            }
            
            body.high-contrast .toast-notification .header {
                color: #ffffff !important;
                border-bottom: 1px solid #ffffff !important;
                padding-bottom: 5px;
                margin-bottom: 8px;
            }
            
            @media (prefers-reduced-motion: reduce) {
                .toast-notification {
                    transition: opacity 0.1s linear !important;
                    transform: none !important;
                }
                
                .toast-notification.show {
                    transform: none !important;
                }
            }

            /* RTL support */
            .rtl .toast-notification {
                right: auto;
                left: 20px;
                transform: translateX(-100%);
                border-left: none;
                border-right: 4px solid;
            }

            .rtl .toast-notification.show {
                transform: translateX(0);
            }
            
            .rtl .toast-notification .header,
            .rtl .toast-notification .message {
                text-align: right;
                direction: rtl;
            }

            /* Responsive design for all screen sizes */
            @media (max-width: 1024px) {
                .toast-notification {
                    right: 18px;
                    left: auto;
                    min-width: 280px;
                    max-width: 350px;
                    font-size: 14px;
                }

                .rtl .toast-notification {
                    right: auto;
                    left: 18px;
                }
            }

            @media (max-width: 768px) {
                .toast-notification {
                    right: 15px;
                    left: 15px;
                    min-width: auto;
                    max-width: none;
                    width: calc(100% - 30px);
                    padding: 14px;
                    top: 55px;
                }

                .rtl .toast-notification {
                    right: 15px;
                    left: 15px;
                    border-right-width: 4px;
                }

                .toast-notification .header {
                    font-size: 13.5px;
                }
            }
            
            @media (max-width: 480px) {
                .toast-notification {
                    right: 10px;
                    left: 10px;
                    width: calc(100% - 20px);
                    padding: 12px;
                    top: 50px;
                    border-radius: 6px;
                }

                .toast-notification .header {
                    font-size: 13px;
                    margin-bottom: 6px;
                }

                .toast-notification .message {
                    font-size: 12px;
                    line-height: 1.3;
                }

                .rtl .toast-notification {
                    right: 10px;
                    left: 10px;
                    border-right-width: 3px;
                }
            }
            
            @media (max-width: 375px) {
                .toast-notification {
                    top: 45px;
                    padding: 10px 12px;
                    border-radius: 5px;
                }
                
                .toast-notification .header {
                    font-size: 12px;
                    margin-bottom: 5px;
                }
                
                .toast-notification .message {
                    font-size: 11px;
                }
            }
            
            @media (max-width: 320px) {
                .toast-notification {
                    top: 40px;
                    padding: 8px 10px;
                    border-left-width: 3px;
                }
                
                .toast-notification .header {
                    letter-spacing: 0.3px;
                }
            }
            
            /* Support for very small devices */
            @media (max-width: 240px) {
                .toast-notification {
                    right: 5px;
                    left: 5px;
                    width: calc(100% - 10px);
                    padding: 6px 8px;
                    border-left-width: 2px;
                }
            }
            
            /* Landscape orientation support */
            @media (orientation: landscape) and (max-height: 500px) {
                .toast-notification {
                    top: 20px;
                    max-width: 320px;
                    padding: 10px 12px;
                }
                
                .toast-notification .header {
                    font-size: 12px;
                    margin-bottom: 4px;
                }
                
                .toast-notification .message {
                    font-size: 11px;
                    line-height: 1.2;
                }
                
                .rtl .toast-notification {
                    left: 10px;
                    right: auto;
                }
            }
            
            /* Foldable devices and unusual screen ratios */
            @media screen and (max-aspect-ratio: 13/20) {
                .toast-notification {
                    right: 10px;
                    left: 10px;
                    width: calc(100% - 20px);
                    max-width: none;
                }
            }
        `;
        
        document.head.appendChild(styleSheet);
    }

    private createToastElement(username: string, message: string, type: ToastType = 'default'): HTMLElement {
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        // Add data attributes for potential JavaScript targeting
        toast.dataset.type = type;

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
        
        // Request animation frame for smoother animation
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.add('show');
            });
        });

        // Handle toast display duration
        await new Promise(resolve => setTimeout(resolve, this.duration));

        // Remove the show class to trigger fade out animation
        toast.classList.remove('show');
        
        // Wait for the fade out animation to complete
        await new Promise(resolve => {
            // Use transitionend event if supported
            const onTransitionEnd = () => {
                toast.removeEventListener('transitionend', onTransitionEnd);
                resolve(undefined);
            };
            
            toast.addEventListener('transitionend', onTransitionEnd);
            
            // Fallback to timeout in case transitionend doesn't fire
            setTimeout(() => {
                toast.removeEventListener('transitionend', onTransitionEnd);
                resolve(undefined);
            }, this.fadeOutDuration + 50);
        });

        // Remove the toast from the DOM
        toast.remove();
        this.isShowing = false;
        
        // Show next toast if any
        this.showNextToast();
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