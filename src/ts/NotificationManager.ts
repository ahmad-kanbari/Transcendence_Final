import api from './api';
import components from './components';
import utils from './utils';
import { CONFIG } from './constants';
import toastManager from './toastManager';
// import notificationManager from './NotificationManager';

// Declare socket.io global
declare const io: any;

interface NotificationManagerElementRefs {

    // Notification elements
    notificationBell: HTMLElement | null;
    notificationBadge: HTMLElement | null;
    generalNotifications: HTMLElement | null;
    messageNotifications: HTMLElement | null;
    bellBtn: HTMLElement | null;
    mailboxBtn: HTMLElement | null;

}

class NotificationManager {
    private socketService: any = null;
    private elements: NotificationManagerElementRefs = {} as NotificationManagerElementRefs;
    private initialized: boolean = false;
    private notificationCount: number = 0;
    private mailboxNotificationCount: number = 0;
    private baseURL: string = CONFIG.baseURL || '';

    constructor() {
        // Initialize socket connection
        if (typeof io !== 'undefined') {
            this.socketService = io(CONFIG.socketURL, { withCredentials: true });
            this.init();
        }
    }
    

        init(): void {
            
            setTimeout(() => {
                this.getElements();
                this.setupNotificationEventListeners();
                // this.setupSocketHandlers(); 
                this.initializeNotifications();
        
            }, 100);
            console.log('NotificationManager initialized');
    }

        private getElements(): void {
            this.elements = {
        
                // Notification elements
                notificationBell: document.getElementById('notificationBell') as HTMLElement | null,
                notificationBadge: document.getElementById('notificationBadge') as HTMLElement | null,
                generalNotifications: document.getElementById('generalNotifications') as HTMLElement | null,
                messageNotifications: document.getElementById('messageNotifications') as HTMLElement | null,
                bellBtn: document.getElementById('bellBtn') as HTMLElement | null,
                mailboxBtn: document.getElementById('mailboxBtn') as HTMLElement | null,
                
            };
    }

    private async setupNotificationEventListeners(): Promise<void> {
        // Bell button event listener
        if (this.elements.bellBtn) {
            this.elements.bellBtn.addEventListener('click', async (e) => {
                 e.preventDefault();
                 e.stopPropagation();
                const visible = this.elements.generalNotifications?.style.display === 'block';
                
                if (this.elements.generalNotifications) {
                    this.elements.generalNotifications.style.display = visible ? 'none' : 'block';
                }
                
                if (this.elements.messageNotifications) {
                    this.elements.messageNotifications.style.display = 'none';
                }

                if (!visible) {
                    try {
                        // Mark notifications as opened
                        await api.markNotificationsAsOpened('others');
                        // await api.fetchWithAutoRefresh(`${this.baseURL}/notifications/others`, {
                        //     method: "PATCH",
                        //     credentials: "include",
                        // });
            
                        this.notificationCount = 0;
                        if (this.elements.bellBtn) {
                            this.elements.bellBtn.setAttribute('data-count', '0');
                        }
                    } catch (error) {
                        console.error('Error marking notifications as opened:', error);
                    }
                }

                // Load and render notifications
                try {
                    const page = 1;
                    const limit = 5;
                    const notifications = await api.getNotifications('others', page, limit);
                    if (this.elements.generalNotifications) {
                        this.renderNotificationList(this.elements.generalNotifications, notifications);
                    }
                } catch (error) {
                    console.error('Error loading notifications:', error);
                }
            });
        }

        // Mailbox button event listener
        if (this.elements.mailboxBtn) {
            this.elements.mailboxBtn.addEventListener('click', async (e) => {
                 e.preventDefault();
                    e.stopPropagation();
                const visible = this.elements.messageNotifications?.style.display === 'block';
                
                if (this.elements.messageNotifications) {
                    this.elements.messageNotifications.style.display = visible ? 'none' : 'block';
                }
                
                if (this.elements.generalNotifications) {
                    this.elements.generalNotifications.style.display = 'none';
                }


                // Load and render message notifications
                try {
                    const page = 1;
                    const limit = 5;
                    const notifications = await api.getNotifications('messages', page, limit);
                    if (this.elements.messageNotifications) {
                        this.renderNotificationList(this.elements.messageNotifications, notifications);
                    }
                } catch (error) {
                    console.error('Error loading message notifications:', error);
                }
            });
        }
    }


    private renderNotificationList(container: HTMLElement, notifications: any[]): void {
        container.innerHTML = '';
        
        if (notifications.length === 0) {
            container.innerHTML = '<em style="color: #999; padding: 10px; display: block;">No notifications</em>';
            return;
        }

        notifications.forEach((notification: any) => {
            const div = document.createElement('div');
            div.className = 'notification';
            div.style.cssText = 'padding: 10px; border-bottom: 1px solid #333; cursor: pointer;';
            
            const time = new Date(notification.created_at).toLocaleString();
            div.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">${notification.type || 'Notification'}</div>
                <div style="margin-bottom: 5px;">${notification.message || notification.content}</div>
                <div style="font-size: 11px; color: #999;">${time}</div>
            `;
            
            container.appendChild(div);
        });
    }

    // ===== NOTIFICATION SYSTEM =====
    private addNotification(message: string): void {
        if (!this.elements.generalNotifications) return;

        const placeholder = this.elements.generalNotifications.querySelector("em");
        if (placeholder) placeholder.remove();

        const div = document.createElement("div");
        div.classList.add("notification");
        div.textContent = message;
        
        if (this.elements.generalNotifications.firstChild) {
            this.elements.generalNotifications.insertBefore(
                div,
                this.elements.generalNotifications.firstChild
            );
        } else {
            this.elements.generalNotifications.appendChild(div);
        }

        this.notificationCount++;
        if (this.elements.bellBtn) {
            this.elements.bellBtn.setAttribute("data-count", this.notificationCount.toString());
        }
    }

    private async initializeNotificationCounter(): Promise<void> {
        try {
            const page = 1;
            const limit = 5;
            // const notifications = await api.getNotifications('others', page, limit);
            const res = await api.fetchWithAutoRefresh(
			`${this.baseURL}/notifications/others?page=${page}&limit=${limit}`,
			{ credentials: "include" }
		);
            if (!res .ok) throw new Error("Failed to fetch notifications");
            const notifications = await res.json();
            this.notificationCount = notifications.filter((n: any) => n.is_opened === 0).length;
            if (this.elements.bellBtn) {
                this.elements.bellBtn.setAttribute("data-count", this.notificationCount.toString());
            }
        } catch (error) {
            console.error("Error initializing notification counter:", error);
        }
    }

    private async initializeMailboxNotificationCounter(): Promise<void> {
        try {
            const page = 1;
            const limit = 5;
            // const notifications = await api.getNotifications('messages', page, limit);
            const res = await api.fetchWithAutoRefresh(
			`${this.baseURL}/notifications/messages?page=${page}&limit=${limit}`,
			{ credentials: "include" }, 
        
		);
		if (!res.ok) throw new Error("Failed to fetch mailbox notifications");

		const notifications = await res.json();
            this.mailboxNotificationCount = notifications.filter((n: any) => n.is_read === 0).length;
            if (this.elements.mailboxBtn) {
                this.elements.mailboxBtn.setAttribute("data-count", this.mailboxNotificationCount.toString());
            }
        } catch (error) {
            console.error("Error initializing mailbox notification counter:", error);
        }
    }

    private async initializeNotifications(): Promise<void> {
        await Promise.all([
            this.initializeNotificationCounter(),
            this.initializeMailboxNotificationCounter()
        ]);
    }    

    private updateMailboxNotificationCount(): void {
        if (this.elements.mailboxBtn) {
            this.elements.mailboxBtn.setAttribute('data-count', this.mailboxNotificationCount.toString());
        }
    }

    public updateMailboxCount(count: number): void {
        this.mailboxNotificationCount = count;
        this.updateMailboxNotificationCount();
    }

    private initializeParticles(): void {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;

        const particleCount = 20;
        particlesContainer.innerHTML = ''; // Clear existing particles
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 10 + 's';
            particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
            
            // Random colors
            const colors = ['var(--cyber-blue)', 'var(--cyber-pink)', 'var(--cyber-purple)', 'var(--cyber-green)'];
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            
            particlesContainer.appendChild(particle);
        }
    }


}

const notificationManager = new NotificationManager();

// Make chat available globally for button onclick handlers
declare global {
    interface Window {
        notificationManager: NotificationManager;
    }
}
window.notificationManager = notificationManager;

export default notificationManager;