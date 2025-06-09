export class ToastManager {
    private queue: { username: string; message: string }[];
    private isShowing: boolean;
    private duration: number;
    private fadeOutDuration: number;

    constructor(config: { duration?: number; fadeOutDuration?: number } = {}) {
        this.queue = [];
        this.isShowing = false;
        this.duration = config.duration || 2000;
        this.fadeOutDuration = config.fadeOutDuration || 300;
    }

    private createToastElement(username: string, message: string): HTMLElement {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';

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
        const { username, message } = this.queue.shift()!;

        const toast = this.createToastElement(username, message);

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

    public addToQueue(username: string, message: string): void {
        this.queue.push({ username, message });
        this.showNextToast();
    }

    // Legacy method for backward compatibility
    public async showToast(username: string, message: string): Promise<void> {
        this.addToQueue(username, message);
    }
}

const toastManager = new ToastManager();

// Export toast functionality to global window object for compatibility
declare global {
    interface Window {
        chatToast: {
            addToQueue: (username: string, message: string) => void;
        };
    }
}

window.chatToast = {
    addToQueue: (username: string, message: string) => {
        toastManager.addToQueue(username, message);
    }
};

export default toastManager;
