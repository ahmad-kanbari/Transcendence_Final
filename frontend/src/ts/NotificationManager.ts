import api from './api';
import components from './components';
import utils from './utils';
import { CONFIG } from './constants';
import toastManager from './toastManager';
import chat from './chat';
import pages from './pages';
import app from './app';
import friendProfile from './friendProfileData';
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
    private elements: NotificationManagerElementRefs = {} as NotificationManagerElementRefs;
    public initialized: boolean = false;
    private notificationCount: number = 0;
    private mailboxNotificationCount: number = 0;
    private baseURL: string = CONFIG.baseURL || '';
    private pendingStatusChanges: {[userId: string]: NodeJS.Timeout} = {};
    private chatListUpdateTimeout: NodeJS.Timeout | null = null;

    constructor() {
        // Don't auto-initialize here, let the app call init when ready
    }
    
    // Check socket connection status periodically
    private startSocketHealthCheck(): void {
        setInterval(() => {
            if (!app.socketService) {
                console.warn('NotificationManager: Socket service not available during health check');
                return;
            }
            
            if (!app.socketService.connected && app.state && app.state.isAuthenticated) {
                console.log('NotificationManager: Socket disconnected but user authenticated, attempting to reconnect');
                app.socketService.connect();
            }
            
            // If connected but event handlers might be missing, reinitialize them
            if (app.socketService.connected && this.initialized) {
                console.log('NotificationManager: Socket health check - ensuring event handlers are attached');
                this.reinitializeSocketHandlers();
            }
        }, 2000); // Check every 30 seconds
    }

    init(): void {
        if (this.initialized) return;
        
        console.log('NotificationManager: Starting initialization...');
        this.retryInitialization();
        
        // Setup global event listener to handle app state changes
        document.addEventListener('appStateChanged', () => {
            console.log('NotificationManager: App state changed, reinitializing socket handlers');
            this.reinitializeSocketHandlers();
        });
        
        // Listen for socket connection events
        document.addEventListener('socketConnected', (event: any) => {
            console.log(`NotificationManager: Socket connected event received, socket ID: ${event.detail.socketId}`);
            if (this.initialized) {
                console.log('NotificationManager: Reinitializing socket handlers after socket connection');
                this.reinitializeSocketHandlers();
            }
        });
        
        // Start socket health check to ensure connection and handlers are maintained
        this.startSocketHealthCheck();
    }

    retryInitialization(attempts: number = 0): void {
        const maxAttempts = 10;
        const delay = 200 + (attempts * 100); // Progressive delay
        
        setTimeout(() => {
            this.getElements();
            
            // Check if essential elements are found
            if (this.elements.bellBtn && this.elements.mailboxBtn) {
                console.log('NotificationManager: Elements found, setting up...');
                this.setupNotificationEventListeners();
                this.setupSocketHandlers();
                this.initializeNotifications();
                this.initialized = true;
                console.log('NotificationManager: Successfully initialized');
            } else if (attempts < maxAttempts) {
                console.log(`NotificationManager: Elements not found, retrying... (${attempts + 1}/${maxAttempts})`);
                this.retryInitialization(attempts + 1);
            } else {
                console.warn('NotificationManager: Failed to find required elements after maximum attempts');
            }
        }, delay);
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

        // ENHANCED VERSION: With click outside to close
        if (this.elements.bellBtn) {
            this.elements.bellBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const isCurrentlyVisible = this.elements.generalNotifications?.style.display === 'block';
                
                // Close message notifications
                if (this.elements.messageNotifications) {
                    this.elements.messageNotifications.style.display = 'none';
                }
                
                if (isCurrentlyVisible) {
                    // Close notifications
                    this.closeGeneralNotifications();
                } else {
                    // Open notifications
                    await this.openGeneralNotifications();
                }
            });
            
            // Add click outside listener to close notifications
            document.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                
                // Check if click is outside bell button and notifications
                if (!target.closest('#bellBtn') && 
                    !target.closest('#generalNotifications') &&
                    this.elements.generalNotifications?.style.display === 'block') {
                    this.closeGeneralNotifications();
                }
                
                // Same for message notifications
                if (!target.closest('#mailboxBtn') && 
                    !target.closest('#messageNotifications') &&
                    this.elements.messageNotifications?.style.display === 'block') {
                    this.closeMessageNotifications();
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
                    const limit = 8;
                    const notifications = await api.getNotifications('messages', page, limit);
                    if (this.elements.messageNotifications) {
                        this.renderNotificationList(this.elements.messageNotifications, notifications, 'messages');
                    }
                } catch (error) {
                    console.error('Error loading message notifications:', error);
                }
            });
        }
    }

    // HELPER METHODS for the enhanced version
    private closeGeneralNotifications(): void {
        if (this.elements.generalNotifications) {
            this.elements.generalNotifications.style.display = 'none';
        }
    }

    private closeMessageNotifications(): void {
        if (this.elements.messageNotifications) {
            this.elements.messageNotifications.style.display = 'none';
        }
    }

    private async openGeneralNotifications(): Promise<void> {
        if (!this.elements.generalNotifications) return;
        
        try {
            // Show dropdown with loading state
            this.elements.generalNotifications.style.display = 'block';
            this.elements.generalNotifications.innerHTML = 
                '<div style="padding: 10px; color: #999; text-align: center;">Loading notifications...</div>';
            
            // Load notifications
            const notifications = await api.getNotifications('others', 1, 5);
            
            // Render notifications
            this.renderNotificationList(this.elements.generalNotifications, notifications, 'others');
            
            // Mark as opened and reset count
            await api.markNotificationsAsOpened('others');
            this.notificationCount = 0;
            
            if (this.elements.bellBtn) {
                this.elements.bellBtn.setAttribute('data-count', '0');
            }
            // this.initializeNotificationCounter();
        } catch (error) {
            console.error('Error opening general notifications:', error);
            
            if (this.elements.generalNotifications) {
                this.elements.generalNotifications.innerHTML = 
                    '<div style="color: #f44336; padding: 10px; text-align: center;">' +
                    'Error loading notifications<br>' +
                    '<button onclick="window.notificationManager.openGeneralNotificationsPublic()" ' +
                    'style="margin-top: 5px; padding: 5px 10px; background: #333; color: white; border: none; border-radius: 3px; cursor: pointer;">' +
                    'Retry</button>' +
                    '</div>';
            }
        }
    }

    // Make openGeneralNotifications public so it can be called from the retry button
    public async openGeneralNotificationsPublic(): Promise<void> {
        return this.openGeneralNotifications();
    }

    private renderNotificationList(container: HTMLElement, notifications: any[], type: "messages" | "others"): void {
    container.innerHTML = '';
    
    if (notifications.length === 0) {
        container.innerHTML = '<em style="color: #999; padding: 10px; display: block;">No notifications</em>';
        return;
    }
    
    notifications.forEach((notification: any) => {
        const div = document.createElement('div');
        div.className = 'notification';
        div.style.cssText = 'padding: 10px; border-bottom: 1px solid #333; cursor: pointer; transition: background-color 0.2s;';
        
        // Add hover effect
        div.addEventListener('mouseenter', () => {
            div.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        });
        div.addEventListener('mouseleave', () => {
            div.style.backgroundColor = 'transparent';
        });
        
        const time = new Date(notification.created_at).toLocaleString();
        div.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">${notification.type || 'Notification'}</div>
            <div style="margin-bottom: 5px;">${notification.message || notification.content}</div>
            <div style="font-size: 11px; color: #999;">${time}</div>
        `;
        
        // Handle click based on notification type
        div.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                if (type === 'messages') {
                    // For message notifications, open the specific chat
                    await this.handleMessageNotificationClick(notification, e);
                } else {
                    // For other notifications, navigate to chat page
                    await this.handleGeneralNotificationClick(notification);
                }
                
                // Hide the notification dropdown after clicking
                if (this.elements.generalNotifications) {
                    this.elements.generalNotifications.style.display = 'none';
                }
                if (this.elements.messageNotifications) {
                    this.elements.messageNotifications.style.display = 'none';
                }
                
            } catch (error) {
                console.error('Error handling notification click:', error);
            }
        });
        
        container.appendChild(div);
    });
}

private async handleMessageNotificationClick(notification: any, e: Event): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    try {
        
        // Get the sender ID from the notification
        const senderId = notification.sender_id || notification.from_user_id;
        
        if (!senderId) {
            console.error('No sender ID found in message notification:', notification);
            return;
        }
        
        // Check if there's an existing chat with this sender
        const existingChatRes = await api.fetchWithAutoRefresh(
            `${this.baseURL}/chats/between/${senderId}`,
            { credentials: 'include' }
        );
        
        if (existingChatRes.ok) {
    
            const chatData = await existingChatRes.json();
            const chatId = chatData.chat_id;
        
            // Navigate to chat page if not already there
            if (window.location.pathname !== '/chat') {
  
                window.history.pushState({}, '',  `/chat?chatId=${chatId}`);
                pages.showPage('chat');
            
                       // Wait for chat page to initialize, then join room
  
                    // await
                    await chat.loadChats();
                    // await
                     await chat.forceJoinRoom(chatId);
             
                
                    await api.fetchWithAutoRefresh(
                    `${this.baseURL}/notifications/messages/by-chat/${chatId}`,
                    {
                        method: 'PATCH',
                        credentials: 'include',
                    }
                );
                
                // // Update mailbox notification count
                // this.mailboxNotificationCount = Math.max(0, this.mailboxNotificationCount - 1);
                // this.updateMailboxNotificationCount();
                notificationManager.initializeMailboxNotificationCounter();
                // notificationManager.decrementMailboxCount();
                return;
       
                // return;
            }
            console.log('Already on chat page, loading chat with ID:', chatId);
            // If already on chat page, load chats and join the specific chat
            await chat.loadChats();
            await chat.forceJoinRoom(chatId);
            
            // Mark this specific chat's messages as read
            try {
                await api.fetchWithAutoRefresh(
                    `${this.baseURL}/notifications/messages/by-chat/${chatId}`,
                    {
                        method: 'PATCH',
                        credentials: 'include',
                    }
                );
                
                // // Update mailbox notification count
                // this.mailboxNotificationCount = Math.max(0, this.mailboxNotificationCount - 1);
                // this.updateMailboxNotificationCount();
                notificationManager.decrementMailboxCount();

                
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
            
            // components.showToast('success', 'Chat Opened', 'Opened chat from notification', 2000);
            // toastManager.success(app.getUsername(), 'Opened chat from notification');
            
        } else {
            console.error('Chat not found for sender:', senderId);
            // components.showToast('error', 'Chat Error', 'Could not find chat with this user', 3000);
            // toastManager.error(app.getUsername(), 'Could not find chat with this user');
        }
        
    } catch (error) {
        console.error('Error handling message notification:', error);
        // components.showToast('error', 'Error', 'Failed to open chat', 3000);
        // toastManager.error(app.getUsername(), 'Failed to open chat');
    }
}

private async handleGeneralNotificationClick(notification: any): Promise<void> {
    try {
        // Navigate to chat page if not already there
        if (window.location.pathname !== '/chat') {
            console.log('Navigating to chat page from notification');
            // window.location.href = `/chat`;
            // Ensure the chat page is shown
            window.history.pushState({}, '', '/chat');
      
            pages.showPage('chat');
        
            return;
        }
        
        // If already on chat page, just show a toast
        components.showToast('info', 'Notification', 'You are already on the chat page', 2000);
        
        // Mark the notification as read if it has an ID
        if (notification.id) {
            try {
                await api.fetchWithAutoRefresh(
                    `${this.baseURL}/notifications/${notification.id}/read`,
                    {
                        method: 'PATCH',
                        credentials: 'include',
                    }
                );
                
                // Update bell notification count
                this.notificationCount = Math.max(0, this.notificationCount - 1);
                if (this.elements.bellBtn) {
                    this.elements.bellBtn.setAttribute('data-count', this.notificationCount.toString());
                }
                
            } catch (error) {
                console.error('Error marking notification as read:', error);
            }
        }
        
    } catch (error) {
        console.error('Error handling general notification:', error);
    }
}

    // Remove existing socket handlers to prevent duplicate event handlers
    public removeSocketHandlers(): void {
        if (!app.socketService) return;
        
        console.log('NotificationManager: Removing socket event handlers');
        app.socketService.off('newMessage');
        app.socketService.off('messageReceivedInform');
        app.socketService.off('friendRequestInform');
        app.socketService.off('friendRequestAccept');
        app.socketService.off('userStatusChange');
    }
    
    // Public method to reinitialize socket handlers after reconnection
    public reinitializeSocketHandlers(): void {
        console.log('NotificationManager: Reinitializing socket handlers');
        
        if (!app.socketService) {
            console.log('NotificationManager: Socket service not available, cannot reinitialize handlers');
            return;
        }
        
        if (!app.socketService.connected) {
            console.log('NotificationManager: Socket not connected, will reinitialize when connected');
            // Set up a one-time listener for connection
            app.socketService.once('connect', () => {
                console.log('NotificationManager: Socket reconnected, now setting up handlers');
                if (this.initialized) {
                    this.setupSocketHandlers();
                }
            });
            return;
        }
        
        if (this.initialized) {
            console.log(`NotificationManager: Setting up socket handlers for socket ${app.socketService.id}`);
            this.setupSocketHandlers();
        } else {
            console.log('NotificationManager: Not initialized, skipping handler reinitialization');
        }
    }

    private setupSocketHandlers(): void {
    
        if (!app.socketService) {
            console.log('NotificationManager: Socket service not available, skipping setup');
            return;
        }
        console.log("NotificationManager: Setting up socket handlers with socket:", app.socketService.id);
        
        // Remove any existing event listeners before adding new ones to prevent duplicates
        this.removeSocketHandlers();
        
        console.log('NotificationManager: Attaching newMessage handler');
        app.socketService.on('newMessage', (message: any) => {
            console.log("NotificationManager: newMessage event received", message);
            //when you send new message it will emit into two sockets to sender and reciver
            //if you are outside the chat room you will not get notified by this event but you will get notified by messageReceivedInform
            toastManager.info(app.getUsername(), `New message from ${message.from_user?.username || 'User'}: ${message.content}`);
            
            // Convert both IDs to strings for comparison to avoid type mismatch
            const messageId = message.chat_id?.toString();
            const currentId = chat.currentChatId?.toString();
            
            console.log('New message received:', message);
            console.log('Current chat ID:', currentId, 'Received chat ID:', messageId);
            
            // Check if we're in the chat room this message belongs to
            if (messageId && currentId && messageId === currentId) {
                console.log(`New message in current chat ${currentId}:`, message);
                chat.appendMessage(message);
            } else {
                // If not in the chat room, increment the mailbox notification count
                notificationManager.incrementMailboxCount();
            }
            
            // Always reload the chat list to show the most recent messages
            chat.debouncedReloadChats();
        });
        
        // Handle message notifications
        app.socketService.on('messageReceivedInform', async (data: any) => {
            console.log('NotificationManager: messageReceivedInform event received', data);
            //the one out side the chat will get messageReceivedInform but the user inside the chat will get newMessage
            //this will emit when a message has been received and you are not in the chat  and if you are in the chat you will not get notified by this event
            toastManager.info(app.getUsername(), `New message from ${data.username}: ${data.message}`);
            
            // Only show toast if not in the current chat
            console.log('NotificationManager: Message received info:', data);
            console.log('NotificationManager: Current chat ID:', chat.currentChatId, 'Received chat ID:', data.chatId);
            
            if (!chat.currentChatId || chat.currentChatId.toString() != data.chatId) {
                toastManager.addToQueue(data.username, data.message);
            }
            console.log('Current chat ID:', chat.currentChatId, 'Received chat ID:', data.chatId);
            if ((data.chatId == chat.currentChatId)) {
                console.log(`New emmiting message in current chat ${chat.currentChatId}:`, data);
                chat.appendMessage(data);
        //         // return; // Ignore messages not in current chat
            }else {
                // notificationManager.incrementMailboxCount();
                notificationManager.initializeMailboxNotificationCounter();
            }
            // chat.debouncedReloadChats(); // Use debounced reload
            setTimeout(async () : Promise<void> => {  
                await chat.reloadChats(); 
            }, 100); // Reload chats after a short delay to ensure UI updates
             // Reload chats to update message counts
            // Update mailbox notification count for message notifications
            try {
                // const page = 1;
                // const limit = 50;
                // const notifications = await api.getNotifications('messages', page, limit);
                // const uniqueSenders = new Set(
                //     notifications.filter((n: any) => !n.is_read).map((n: any) => n.sender_id)
                // );
                
                // this.mailboxNotificationCount = uniqueSenders.size;
                // this.mailboxNotificationCount = notifications.filter((n: any) => n.is_read === 0).length;
                // this.updateMailboxCount(this.mailboxNotificationCount);
                if (this.elements.mailboxBtn) {
                    this.elements.mailboxBtn.setAttribute('data-count', this.mailboxNotificationCount.toString());
                }
                
                // if (this.elements.messageNotifications) {
                //     this.renderNotificationList(this.elements.messageNotifications, notifications, 'messages');
                // }
            } catch (error) {
                console.error('Error updating message notifications:', error);
            }
     
        });


        // Handle friend requests - Add more robust error handling and debugging
        console.log('NotificationManager: Attaching friendRequestInform handler');
        app.socketService.on('friendRequestInform', (data: any) => {
            try {
                console.log('NotificationManager: Received friendRequestInform event:', data);
                
                // Show detailed debug info
                if (data) {
                    console.log(`Friend request from user ID: ${data.fromUserId || 'unknown'}`);
                    console.log(`Message content: "${data.message || 'No message'}""`);
                }
                
                // Display notification to user
                toastManager.info('Friend Request', data.message || 'You received a friend request');
                
                // Add to notifications panel
                if (data.message) {
                    this.addNotification(data.message);
                }
                
                // Refresh friend data in chat
                chat.loadFriendData();
            } catch (error) {
                console.error('Error handling friendRequestInform event:', error);
            }
        });

        console.log('NotificationManager: Attaching friendRequestAccept handler');
        app.socketService.on('friendRequestAccept', (data: any) => {
            try {
                console.log('NotificationManager: Received friendRequestAccept event:', data);
                
                // Show detailed debug info
                if (data) {
                    console.log(`Friend request accepted by user ID: ${data.fromUserId || 'unknown'}`);
                    console.log(`Message content: "${data.message || 'No message'}""`);
                }
                
                // Display notification to user
                toastManager.info('Friend Request', data.message || 'Your friend request was accepted');
                
                // Add to notifications panel
                if (data.message) {
                    this.addNotification(data.message);
                }
                
                // Refresh friend data in chat
                chat.loadFriendData();
            } catch (error) {
                console.error('Error handling friendRequestAccept event:', error);
            }
        });

        // Optimized userStatusChange handler with grace period for offline status
        console.log('NotificationManager: Attaching userStatusChange handler');
        app.socketService.on("userStatusChange", (data: any) => {
            console.log("Status change event received:", data);
            
            // If this is an OFFLINE status change, delay processing it to prevent flicker
            if (!data.isOnline) {
                console.log(`Adding grace period for offline status of user ${data.userId}`);
                
                // Cancel any existing pending status change for this user
                if (this.pendingStatusChanges[data.userId]) {
                    console.log(`Clearing existing pending status change for user ${data.userId}`);
                    clearTimeout(this.pendingStatusChanges[data.userId]);
                }
                
                // Create a new timeout for this offline status change
                this.pendingStatusChanges[data.userId] = setTimeout(() => {
                    console.log(`Grace period expired for user ${data.userId}, applying offline status`);
                    // Apply the offline status after the grace period
                    this.applyUserStatusChange(data);
                    // Remove from pending changes
                    delete this.pendingStatusChanges[data.userId];

              
                     chat.loadChats();
                     
                }, 3000); // 3 second grace period
            } else {
                // If this is an ONLINE status, cancel any pending offline status change
                if (this.pendingStatusChanges[data.userId]) {
                    console.log(`Cancelling pending offline status change for user ${data.userId}`);
                    clearTimeout(this.pendingStatusChanges[data.userId]);
                    delete this.pendingStatusChanges[data.userId];
                }
                
                // Apply online status immediately
                this.applyUserStatusChange(data);
            }
        });
    }
    // ===== NOTIFICATION SYSTEM =====
    private addNotification(message: string): void {
        console.log(`NotificationManager: Adding notification with message: "${message}"`);
        
        if (!this.elements.generalNotifications) {
            console.warn('NotificationManager: Cannot add notification - generalNotifications element not found');
            return;
        }

        try {
            // Remove placeholder if it exists
            const placeholder = this.elements.generalNotifications.querySelector("em");
            if (placeholder) placeholder.remove();

            // Create notification element
            const div = document.createElement("div");
            div.classList.add("notification");
            
            // Add some basic styling
            div.style.padding = "10px";
            div.style.margin = "5px 0";
            div.style.borderBottom = "1px solid #333";
            
            // Set message content
            div.textContent = message;
            
            // Add timestamp
            const timestamp = document.createElement("div");
            timestamp.style.fontSize = "11px";
            timestamp.style.color = "#999";
            timestamp.style.marginTop = "5px";
            timestamp.textContent = new Date().toLocaleTimeString();
            div.appendChild(timestamp);
            
            // Add to notification panel at the top
            if (this.elements.generalNotifications.firstChild) {
                this.elements.generalNotifications.insertBefore(
                    div,
                    this.elements.generalNotifications.firstChild
                );
            } else {
                this.elements.generalNotifications.appendChild(div);
            }

            // Increment notification count and update badge
            // this.notificationCount++;
            // this.updateBellBadge();
            this.initializeNotificationCounter();
            console.log(`NotificationManager: Notification added successfully, count: ${this.notificationCount}`);
        } catch (error) {
            console.error('NotificationManager: Error adding notification:', error);
        }
    }

    private async initializeNotificationCounter(): Promise<void> {
        try {
             console.log('NotificationManager initialized in the console');
            const page = 1;
            const limit = 10;
            // const notifications = await api.getNotifications('others', page, limit);
            const res = await api.fetchWithAutoRefresh(
			`${this.baseURL}/notifications/others?page=${page}&limit=${limit}`,
			{ credentials: "include" }
		);
            if (!res .ok) {
                // toastManager.showToast("Error", `Failed to fetch notifications ${res}`);
                throw new Error("Failed to fetch notifications")
            };
            const notifications = await res.json();
            this.notificationCount = notifications.filter((n: any) => n.is_opened === 0).length;
            if (this.elements.bellBtn) {
                console.log('Setting notification count:', this.notificationCount);
                this.elements.bellBtn.setAttribute("data-count", this.notificationCount.toString());
            }
        } catch (error) {
            console.error("Error initializing notification counter:", error);
        }
    }

    private async initializeMailboxNotificationCounter(): Promise<void> {
        try {
            const page = 1;
            const limit = 7;
            // const notifications = await api.getNotifications('messages', page, limit);
            const res = await api.fetchWithAutoRefresh(
			`${this.baseURL}/notifications/messages?page=${page}&limit=${limit}`,
			{ credentials: "include" }, 
        
		);
		if (!res.ok) throw new Error("Failed to fetch mailbox notifications");

		const notifications = await res.json();
        console.log('Mailbox notifications:', notifications);
            this.mailboxNotificationCount = notifications.filter((n: any) => n.is_read === 0).length;
            console.log('Mailbox notification count:', this.mailboxNotificationCount);
            if (this.elements.mailboxBtn) {
                console.log('Setting mailbox notification count:', this.mailboxNotificationCount);
                this.elements.mailboxBtn.setAttribute("data-count", this.mailboxNotificationCount.toString());
            }
        } catch (error) {
            console.error("Error initializing mailbox notification counter:", error);
        }
    }

    async initializeNotifications(): Promise<void> {
        console.log('NotificationManager: Initializing notifications');
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

    // Add these methods to your NotificationManager class

public incrementNotificationCount(): void {
    this.notificationCount++;
    this.updateBellBadge();
}

public decrementNotificationCount(): void {
    this.notificationCount = Math.max(0, this.notificationCount - 1);
    this.updateBellBadge();
}

public incrementMailboxCount(): void {
    this.mailboxNotificationCount++;
    this.updateMailboxBadge();
}

public decrementMailboxCount(): void {
    this.mailboxNotificationCount = Math.max(0, this.mailboxNotificationCount - 1);
    this.updateMailboxBadge();
}

private updateBellBadge(): void {
    if (this.elements.bellBtn) {
        this.elements.bellBtn.setAttribute('data-count', this.notificationCount.toString());
    }
}

private updateMailboxBadge(): void {
    if (this.elements.mailboxBtn) {
        this.elements.mailboxBtn.setAttribute('data-count', this.mailboxNotificationCount.toString());
    }
}

// Make this method public so Chat can call it
public getNotificationCount(): number {
    return this.notificationCount;
}

public getMailboxCount(): number {
    return this.mailboxNotificationCount;
}

// Handle applying user status changes
private applyUserStatusChange(data: any): void {
    // Update single friend in the list instead of reloading entire list
    if (chat && chat.elements && chat.elements.friendsList) {
        // Find the specific friend element in the list by userId
        const friendItem = chat.elements.friendsList.querySelector(`li[data-user-id="${data.userId}"]`) as HTMLElement | null;
        
        if (friendItem) {
            // Update status indicator
            const statusIndicator = friendItem.querySelector('.online-status') as HTMLElement | null;
            
            if (statusIndicator) {
                // Update status class
                statusIndicator.classList.remove('online', 'offline');
                statusIndicator.classList.add(data.isOnline ? 'online' : 'offline');
                
                // Update status color and animation
                statusIndicator.style.backgroundColor = data.isOnline ? '#4CAF50' : '#757575';
                statusIndicator.setAttribute('title', data.isOnline ? 'Online' : 'Offline');
                
                if (data.isOnline) {
                    statusIndicator.style.boxShadow = '0 0 6px rgba(76, 175, 80, 0.6)';
                    statusIndicator.style.animation = 'pulse-green 2s infinite';
                } else {
                    statusIndicator.style.boxShadow = '';
                    statusIndicator.style.animation = '';
                }
            }
            
            // Update or remove the online dot
            let onlineDot = friendItem.querySelector('.online-dot') as HTMLElement | null;
            
            if (data.isOnline) {
                if (!onlineDot) {
                    onlineDot = document.createElement('span');
                    onlineDot.className = 'online-dot';
                    onlineDot.style.color = '#4CAF50';
                    onlineDot.style.fontSize = '10px';
                    onlineDot.style.marginLeft = '5px';
                    onlineDot.textContent = '●';
                    
                    // Find the username element's parent and insert the dot after the username
                    const usernameElement = friendItem.querySelector('.friend-username');
                    if (usernameElement) {
                        usernameElement.insertAdjacentElement('afterend', onlineDot);
                    }
                }
            } else if (onlineDot) {
                onlineDot.remove();
            }
            
            console.log(`Updated status for friend ${data.userId} to ${data.isOnline ? 'online' : 'offline'}`);
        } else {
            console.log(`Friend element with userId ${data.userId} not found in the list`);
        }
    }
    
    // Update chat list status indicators without reloading the entire list
    if (chat && chat.elements && chat.elements.chatRows) {
        // Since we don't have direct user ID mapping in chat rows, we'll use a more efficient approach
        // We'll store the userId in a data attribute when we update, so subsequent updates are faster
        const chatRows = chat.elements.chatRows.querySelectorAll('.chat-row, .chatRow');
        
        chatRows.forEach((chatRow) => {
            const chatRowElement = chatRow as HTMLElement;
            const statusIndicator = chatRowElement.querySelector('.online-status') as HTMLElement | null;
            
            if (statusIndicator) {
                // Check if this chat row has the user ID stored (from previous updates)
                const storedUserId = chatRowElement.dataset.participantId;
                
                if (storedUserId === data.userId.toString()) {
                    console.log(`Updating chat row status for user ${data.userId}`);
                    
                    // Update the status indicator directly
                    const statusColor = data.isOnline ? '#2DE2E6' : '#666';
                    const statusTitle = data.isOnline ? 'Online' : 'Offline';
                    const statusGlow = data.isOnline ? '0 0 5px rgba(45, 226, 230, 0.8)' : '';
                    
                    statusIndicator.style.backgroundColor = statusColor;
                    statusIndicator.style.boxShadow = statusGlow;
                    statusIndicator.setAttribute('title', statusTitle);
                    
                    // Add a subtle animation for status changes
                    if (data.isOnline) {
                        statusIndicator.style.animation = 'pulse-cyan 2s infinite';
                    } else {
                        statusIndicator.style.animation = '';
                    }
                }
            }
        });
    }
    
    // Instead of always reloading, only reload chat list very infrequently since we're doing targeted updates
    // This significantly reduces the number of API calls and DOM rebuilds
    if (data.isOnline || data.isDelayedOffline) {
        console.log(`Scheduling infrequent chat list refresh for user ${data.userId} status change to ${data.isOnline ? 'online' : 'offline'} ${data.isDelayedOffline ? '(after grace period)' : ''}`);
        
        // Use a much longer delay since we're doing targeted updates above
        if (this.chatListUpdateTimeout) {
            clearTimeout(this.chatListUpdateTimeout);
        }
        
        this.chatListUpdateTimeout = setTimeout(async () => {
            // Only do a full reload occasionally to catch any missed updates
            console.log('Performing periodic chat list refresh to sync any missed changes');
            await chat.loadChats();
            this.chatListUpdateTimeout = null;
        }, 10000); // Wait 10 seconds and debounce - much less frequent since we have targeted updates
    } else {
        console.log(`Skipping chat list reload for user ${data.userId} - offline status change blocked by grace period`);
    }
    
    // Update friend profile if we're viewing it
    if (friendProfile) {
        // If this status change is for the user we're currently viewing
        if (parseInt(friendProfile.friendData.id) === data.userId) {
            console.log("Updating status for current profile user");
            friendProfile.friendData.isOnline = data.isOnline;
            friendProfile.refreshFriendProfile();
        }
    }
}

// ===== NOTIFICATION SYSTEM =====
   

    // Public method to test if socket handlers are working correctly
    public testSocketHandlers(): void {
        console.log('NotificationManager: Testing socket handlers');
        
        if (!app.socketService) {
            console.error('NotificationManager: Socket service not available, cannot test handlers');
            toastManager.error('Socket Test', 'Socket service not available');
            return;
        }
        
        if (!app.socketService.connected) {
            console.error('NotificationManager: Socket not connected, cannot test handlers');
            toastManager.error('Socket Test', 'Socket not connected');
            return;
        }
        
        // Check if handlers are attached by looking at the internal listeners
        const hasNewMessageHandler = app.socketService.hasListeners('newMessage');
        const hasFriendRequestInformHandler = app.socketService.hasListeners('friendRequestInform');
        const hasFriendRequestAcceptHandler = app.socketService.hasListeners('friendRequestAccept');
        
        console.log(`Socket handler test:
            - newMessage handlers: ${hasNewMessageHandler ? 'YES' : 'NO'}
            - friendRequestInform handlers: ${hasFriendRequestInformHandler ? 'YES' : 'NO'}
            - friendRequestAccept handlers: ${hasFriendRequestAcceptHandler ? 'YES' : 'NO'}
        `);
        
        // If any handlers are missing, reinitialize
        if (!hasNewMessageHandler || !hasFriendRequestInformHandler || !hasFriendRequestAcceptHandler) {
            console.log('NotificationManager: Some handlers missing, reinitializing');
            this.reinitializeSocketHandlers();
            toastManager.warning('Socket Test', 'Some handlers were missing, reinitialized');
        } else {
            toastManager.success('Socket Test', 'All socket handlers are properly attached');
        }
        
        // Test socket with local echo
        console.log('NotificationManager: Emitting local test event');
        app.socketService.emit('testSocketConnection', { timestamp: new Date().toISOString() });
    }
}

const notificationManager = new NotificationManager();

// Make notificationManager available globally for debugging and button onclick handlers
declare global {
    interface Window {
        notificationManager: NotificationManager;
        testSocketConnection: () => void; // Easy access to socket connection test
    }
}
window.notificationManager = notificationManager;

// Add test socket connection function to global scope for easier debugging
window.testSocketConnection = () => {
    console.log('Manual socket connection test triggered');
    if (notificationManager.initialized) {
        notificationManager.testSocketHandlers();
    } else {
        console.error('NotificationManager not initialized yet');
        alert('NotificationManager not initialized yet');
    }
};

export default notificationManager;
