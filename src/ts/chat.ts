import api from './api';
import components from './components';
import utils from './utils';
import { CONFIG } from './constants';
import toastManager from './toastManager';
// import notificationManager from './NotificationManager';

// Declare socket.io global
declare const io: any;

interface ChatElements {
    // Chat specific elements
    chatRows: HTMLElement | null;
    messageBox: HTMLElement | null;
    messageInput: HTMLInputElement | null;
    sendBtn: HTMLElement | null;
    chatHeader: HTMLElement | null;
    
    // Friend management elements
    userSearch: HTMLInputElement | null;
    userSearchResults: HTMLElement | null;
    userSearchInput: HTMLInputElement | null;
    userSearchResultsChat: HTMLElement | null;
    incomingRequests: HTMLElement | null;
    outgoingRequests: HTMLElement | null;
    friendsList: HTMLElement | null;
    
    // Notification elements
    notificationBell: HTMLElement | null;
    notificationBadge: HTMLElement | null;
    generalNotifications: HTMLElement | null;
    messageNotifications: HTMLElement | null;
    bellBtn: HTMLElement | null;
    mailboxBtn: HTMLElement | null;
    
    // Dashboard elements
    showDashboard: HTMLElement | null;
    closeDashboard: HTMLElement | null;
    dashboardView: HTMLElement | null;
    totalFriends: HTMLElement | null;
    activeChats: HTMLElement | null;
    messagesToday: HTMLElement | null;
    onlineFriends: HTMLElement | null;
}

class Chat {
    private socketService: any = null;
    private elements: ChatElements = {} as ChatElements;
    private currentChatId: number | null = null;
    private currentUserId: number | null = null;
    private initialized: boolean = false;
    private notificationCount: number = 0;
    private mailboxNotificationCount: number = 0;
    private messagesCount: number = 0;
    private baseURL: string = CONFIG.baseURL || '';
    private chatReloadTimeout: any = null;

    constructor() {
        // Initialize socket connection
        if (typeof io !== 'undefined') {
            this.socketService = io(CONFIG.socketURL, { withCredentials: true });
            this.setupBaseSocketHandlers();
        }
    }

    init(): void {
        if (this.initialized) return;

        // Listen for page changes
        document.addEventListener('pageShown', (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail.page === 'chat') {
                this.initializeChatPage();
            }
        });

        this.initialized = true;
    }

    private setupBaseSocketHandlers(): void {
        if (!this.socketService) return;

        this.socketService.on('connect', () => {
            console.log('Chat socket connected');
            if (this.elements.chatRows) {
                this.loadChats();
                this.loadFriendData();
                this.handleURLChatId();
            }
        });

        this.socketService.on('disconnect', () => {
            console.log('Chat socket disconnected');
        });
    }

    private initializeChatPage(): void {
        setTimeout(() => {
            this.getElements();
            this.setupEventListeners();
            this.setupSocketHandlers();
            this.initializeParticles();
            this.loadChats();
            this.loadFriendData();
            this.initializeNotifications();
            this.updateDashboardStats();
        }, 100);
    }

    private getElements(): void {
        this.elements = {
            // Chat specific elements
            chatRows: document.getElementById('chatRows'),
            messageBox: document.getElementById('messageBox'),
            messageInput: document.getElementById('messageInput') as HTMLInputElement,
            sendBtn: document.getElementById('sendBtn'),
            chatHeader: document.getElementById('chatHeader'),
            
            // Friend management elements
            userSearch: document.getElementById('userSearch') as HTMLInputElement,
            userSearchResults: document.getElementById('userSearchResults'),
            userSearchInput: document.getElementById('userSearchInput') as HTMLInputElement,
            userSearchResultsChat: document.getElementById('userSearchResultsChat'),
            incomingRequests: document.getElementById('incomingRequests'),
            outgoingRequests: document.getElementById('outgoingRequests'),
            friendsList: document.getElementById('friendsList'),
            
            // Notification elements
            notificationBell: document.getElementById('notificationBell'),
            notificationBadge: document.getElementById('notificationBadge'),
            generalNotifications: document.getElementById('generalNotifications'),
            messageNotifications: document.getElementById('messageNotifications'),
            bellBtn: document.getElementById('bellBtn'),
            mailboxBtn: document.getElementById('mailboxBtn'),
            
            // Dashboard elements
            showDashboard: document.getElementById('showDashboard'),
            closeDashboard: document.getElementById('closeDashboard'),
            dashboardView: document.getElementById('dashboardView'),
            totalFriends: document.getElementById('totalFriends'),
            activeChats: document.getElementById('activeChats'),
            messagesToday: document.getElementById('messagesToday'),
            onlineFriends: document.getElementById('onlineFriends'),
        };
    }

    private setupEventListeners(): void {
        // Send message
        //how to load chat problem
        if (this.elements.sendBtn) {     
            this.elements.sendBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.sendMessage()
            }
        );
        }

        if (this.elements.messageInput) {
            this.elements.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Friend search (sidebar)
        if (this.elements.userSearch) {
            this.elements.userSearch.addEventListener('input', () => this.handleFriendSearch());
        }

        // Chat search
        if (this.elements.userSearchInput) {
            this.elements.userSearchInput.addEventListener('input', () => this.handleChatSearch());
        }

        // Dashboard
        if (this.elements.showDashboard) {
            this.elements.showDashboard.addEventListener('click', () => this.showDashboard());
        }

        if (this.elements.closeDashboard) {
            this.elements.closeDashboard.addEventListener('click', () => this.hideDashboard());
        }

        // Setup notification event listeners
        this.setupNotificationEventListeners();

        // Escape key for dashboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.dashboardView?.classList.contains('active')) {
                this.hideDashboard();
            }
        });

        
    }

    private setupSocketHandlers(): void {
        if (!this.socketService) return;

        // Handle new messages
        this.socketService.on('newMessage', (message: any) => {
            if (message.chat_id === this.currentChatId) {
                this.appendMessage(message);
            }
            this.loadChats(); // Refresh chat list
            this.messagesCount++;
            this.updateDashboardStats();
        });

        // Handle message notifications
        this.socketService.on('messageReceivedInform', async (data: any) => {
            // Only show toast if not in the current chat
            if (!this.currentChatId || this.currentChatId.toString() !== data.chatId?.toString()) {
                toastManager.addToQueue(data.username, data.message);
            }

            // Update mailbox notification count for message notifications
            try {
                const page = 1;
                const limit = 50;
                const notifications = await api.getNotifications('messages', page, limit);
                const uniqueSenders = new Set(
                    notifications.filter((n: any) => !n.is_read).map((n: any) => n.sender_id)
                );
                
                this.mailboxNotificationCount = uniqueSenders.size;
                if (this.elements.mailboxBtn) {
                    this.elements.mailboxBtn.setAttribute('data-count', this.mailboxNotificationCount.toString());
                }
                
                if (this.elements.messageNotifications) {
                    this.renderNotificationList(this.elements.messageNotifications, notifications);
                }
            } catch (error) {
                console.error('Error updating message notifications:', error);
            }
        });

        // Handle friend requests
        this.socketService.on('friendRequestInform', (data: any) => {
            toastManager.addToQueue('Friend Request', data.message);
            this.addNotification(data.message);
            this.loadFriendData();
        });

        this.socketService.on('friendRequestAccept', (data: any) => {
            toastManager.addToQueue('Friend Request', data.message);
            this.addNotification(data.message);
            this.loadFriendData();
        });
    }

    // ===== CHAT FUNCTIONALITY =====
    private async loadChats(): Promise<void> {
        if (!this.elements.chatRows) return;

        try {
            const chats = await api.getChats();
            this.renderChatList(chats);
        } catch (error) {
            console.error('Error loading chats:', error);
        }
    }

    private async renderChatList(chats: any[]): Promise<void> {
        if (!this.elements.chatRows) return;

        this.elements.chatRows.innerHTML = '';

        if (chats.length === 0) {
            this.elements.chatRows.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">No chats yet</div>';
            return;
        }

        for (const chat of chats) {
            try {
                const user = await api.getUserById(chat.participantId.toString());
                if (!user || !user.success) continue;

                const chatRow = document.createElement('div');
                chatRow.className = 'chat-row';
                chatRow.role = 'listitem';
                chatRow.dataset.chatId = chat.chat_id.toString();
                
                chatRow.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="online-status"></span>
                        <span>${user.data?.username || 'Unknown User'}</span>
                    </div>
                    <div style="font-size: 12px; color: #999; margin-top: 5px;">Click to open chat</div>
                `;

                if (this.currentChatId === chat.chat_id) {
                    chatRow.classList.add('active');
                }

                chatRow.addEventListener('click', () => this.selectChat(chat.chat_id));
                this.elements.chatRows.appendChild(chatRow);
            } catch (error) {
                console.error('Error rendering chat:', error);
            }
        }
    }

    private async selectChat(chatId: number): Promise<void> {
        await this.joinRoom(chatId);
        
        // Update chat header
        if (this.elements.chatHeader) {
            this.elements.chatHeader.textContent = 'Online chat...';
        }
        
        // Mark notifications as read
        try {
            await api.markChatNotificationsAsRead(chatId.toString());
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
        
        // Update URL
        const url = new URL(window.location.href);
        url.searchParams.set('chatId', chatId.toString());
        window.history.pushState({}, '', url);
    }

    private async joinRoom(chatId: number): Promise<void> {
        // Get current user if not set
        if (this.currentUserId === null) {
            await this.loadCurrentUser();
        }

        // Leave current room
        if (this.currentChatId !== null && this.socketService) {
            this.socketService.emit('leaveRoom', this.currentChatId);
        }

        this.currentChatId = chatId;

        // Update UI
        document.querySelectorAll('.chat-row').forEach(row => {
            row.classList.remove('active');
        });

        const activeRow = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (activeRow) {
            activeRow.classList.add('active');
        }

        // Clear and load messages
        this.clearMessages();
        
        if (this.socketService) {
            this.socketService.emit('joinRoom', chatId);
        }

        // Update header
        if (this.elements.chatHeader) {
            this.elements.chatHeader.textContent = 'Chat Active';
        }

        try {
            const messages = await api.getChatMessages(chatId.toString());
            messages.forEach((message: any) => this.appendMessage(message));
            //mark messages as read
            await api.fetchWithAutoRefresh(`${CONFIG.baseURL}/notifications/messages//by-chat/${chatId}`, {
                        method: 'PATCH',
                        credentials: "include",
                    });
            this.mailboxNotificationCount = 0;
            this.elements.mailboxBtn!.setAttribute('data-count', '0');
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    private async sendMessage(): Promise<void> {
        if (!this.elements.messageInput || !this.currentChatId) return;

        const content = this.elements.messageInput.value.trim();
        if (!content) return;

        try {
            const result = await api.sendMessage(this.currentChatId.toString(), content);
            
            if (result.ok) {
                this.elements.messageInput.value = '';
            } else {
                components.showToast('error', 'Send Failed', 'Failed to send message', 3000);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            components.showToast('error', 'Send Failed', 'Failed to send message', 3000);
        }
    }

    private appendMessage(message: any): void {
        if (!this.elements.messageBox) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender_id === this.currentUserId ? 'sent' : 'received'}`;
        
        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        messageDiv.innerHTML = `
            <div>${message.content}</div>
            <div style="font-size: 11px; opacity: 0.7; margin-top: 5px;">${time}</div>
        `;

        this.elements.messageBox.appendChild(messageDiv);
        this.elements.messageBox.scrollTop = this.elements.messageBox.scrollHeight;
    }

    private clearMessages(): void {
        if (this.elements.messageBox) {
            this.elements.messageBox.innerHTML = '';
        }
    }

    // ===== FRIEND FUNCTIONALITY =====
    private async handleFriendSearch(): Promise<void> {
        if (!this.elements.userSearch || !this.elements.userSearchResults) return;

        const query = this.elements.userSearch.value.trim();
        
        if (!query) {
            this.elements.userSearchResults.style.display = 'none';
            return;
        }

        try {
            const users = await api.searchUsers(query);
            this.renderFriendSearchResults(users);
        } catch (error) {
            console.error('Error searching users:', error);
        }
    }

    private async handleChatSearch(): Promise<void> {
        if (!this.elements.userSearchInput || !this.elements.userSearchResultsChat) return;

        const query = this.elements.userSearchInput.value.trim();
        
        if (!query) {
            this.elements.userSearchResultsChat.style.display = 'none';
            return;
        }

        try {
            const users = await api.searchUsers(query);
            this.renderChatSearchResults(users);
        } catch (error) {
            console.error('Error searching users:', error);
        }
    }

    private renderFriendSearchResults(users: any[]): void {
        if (!this.elements.userSearchResults) return;

        this.elements.userSearchResults.innerHTML = '';

        if (users.length === 0) {
            this.elements.userSearchResults.style.display = 'none';
            return;
        }

        users.forEach(user => {
            const li = document.createElement('li');
            li.style.cssText = 'padding: 8px; cursor: pointer; border-bottom: 1px solid #333;';
            li.textContent = user.username;
            li.addEventListener('click', () => this.sendFriendRequest(user.id));
            this.elements.userSearchResults!.appendChild(li);
        });

        this.elements.userSearchResults.style.display = 'block';
    }

    private renderChatSearchResults(users: any[]): void {
        if (!this.elements.userSearchResultsChat) return;

        this.elements.userSearchResultsChat.innerHTML = '';

        if (users.length === 0) {
            this.elements.userSearchResultsChat.style.display = 'none';
            return;
        }

        users.forEach(user => {
            const div = document.createElement('div');
            div.style.cssText = 'padding: 8px; cursor: pointer; border-bottom: 1px solid #333;';
            div.textContent = user.username;
            div.addEventListener('click', () => this.startChatWithUser(user));
            this.elements.userSearchResultsChat!.appendChild(div);
        });

        this.elements.userSearchResultsChat.style.display = 'block';
    }

    private async sendFriendRequest(userId: string): Promise<void> {
        try {
            const result = await api.sendFriendRequest(userId);
            
            if (result.ok) {
                components.showToast('success', 'Friend Request Sent', 'Friend request sent successfully!', 3000);
                this.loadFriendData();
                
                // Clear search
                if (this.elements.userSearch && this.elements.userSearchResults) {
                    this.elements.userSearch.value = '';
                    this.elements.userSearchResults.style.display = 'none';
                }
            } else {
                const errorText = await result.text();
                components.showToast('error', 'Request Failed', errorText || 'Failed to send friend request', 3000);
            }
        } catch (error) {
            console.error('Error sending friend request:', error);
            components.showToast('error', 'Request Failed', 'An error occurred while sending the request', 3000);
        }
    }

    private async loadFriendData(): Promise<void> {
        try {
            await Promise.all([
                this.loadIncomingRequests(),
                this.loadOutgoingRequests(),
                this.loadFriendsList()
            ]);
            this.updateDashboardStats();
        } catch (error) {
            console.error('Error loading friend data:', error);
        }
    }

    private async loadIncomingRequests(): Promise<void> {
        if (!this.elements.incomingRequests) return;

        try {
            const requests = await api.getFriendships('pending', 'received');
            
            this.elements.incomingRequests.innerHTML = '';
            
            if (requests.length === 0) {
                this.elements.incomingRequests.innerHTML = '<li style="color: #999;">No incoming requests</li>';
                return;
            }

            requests.forEach((request: any) => {
                const li = document.createElement('li');
                li.style.cssText = 'padding: 8px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;';
                
                li.innerHTML = `
                    <span>${request.senderUsername}</span>
                    <div>
                        <button onclick="window.chat.handleFriendRequest('${request.friendshipId}', 'accept')" style="margin-right: 5px; padding: 2px 8px; background: #4CAF50; border: none; color: white; border-radius: 3px; cursor: pointer;">Accept</button>
                        <button onclick="window.chat.handleFriendRequest('${request.friendshipId}', 'reject')" style="padding: 2px 8px; background: #f44336; border: none; color: white; border-radius: 3px; cursor: pointer;">Reject</button>
                    </div>
                `;
                
                this.elements.incomingRequests!.appendChild(li);
            });
        } catch (error) {
            console.error('Error loading incoming requests:', error);
        }
    }

    private async loadOutgoingRequests(): Promise<void> {
        if (!this.elements.outgoingRequests) return;

        try {
            const requests = await api.getFriendships('pending', 'sent');
            
            this.elements.outgoingRequests.innerHTML = '';
            
            if (requests.length === 0) {
                this.elements.outgoingRequests.innerHTML = '<li style="color: #999;">No outgoing requests</li>';
                return;
            }

            requests.forEach((request: any) => {
                // const li = document.createElement('li');
                // li.style.cssText = 'padding: 8px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;';
                
                // li.innerHTML = `
                //     <span>${request.senderUsername}</span>
                //     <button onclick="window.chat.cancelFriendRequest('${request.friendshipId}')" style="padding: 2px 8px; background: #f44336; border: none; color: white; border-radius: 3px; cursor: pointer;">Cancel</button>
                // `;
                const li = document.createElement('li');
                li.innerHTML = `<span>${request.senderUsername}</span>`;

                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Cancel';
                cancelBtn.style = 'padding: 2px 8px; background: #f44336; border: none; color: white; border-radius: 3px; cursor: pointer;';
                cancelBtn.addEventListener('click', () => {
                    window.chat.cancelFriendRequest(request.friendshipId);
                });

                li.appendChild(cancelBtn);

                
                this.elements.outgoingRequests!.appendChild(li);
            });
        } catch (error) {
            console.error('Error loading outgoing requests:', error);
        }
    }

    private async loadFriendsList(): Promise<void> {
        if (!this.elements.friendsList) return;

        try {
            const friends = await api.getFriendships();
            
            this.elements.friendsList.innerHTML = '';
            
            if (friends.length === 0) {
                this.elements.friendsList.innerHTML = '<li style="color: #999;">No friends yet</li>';
                return;
            }

            friends.forEach((friend: any) => {
                const li = document.createElement('li');
                li.style.cssText = 'padding: 8px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;';
                
                li.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="online-status"></span>
                        <span>${friend.username}</span>
                    </div>
                    <div>
                        <button onclick="window.chat.startChatWithFriend('${friend.id}')" style="margin-right: 5px; padding: 2px 8px; background: #2196F3; border: none; color: white; border-radius: 3px; cursor: pointer;">Chat</button>
                        <button onclick="window.chat.removeFriend('${friend.friendshipId}')" style="padding: 2px 8px; background: #f44336; border: none; color: white; border-radius: 3px; cursor: pointer;">Remove</button>
                    </div>
                `;
                
                this.elements.friendsList!.appendChild(li);
            });
        } catch (error) {
            console.error('Error loading friends list:', error);
        }
    }

    // ===== PUBLIC METHODS FOR GLOBAL ACCESS =====
    public async handleFriendRequest(friendshipId: string, action: 'accept' | 'reject'): Promise<void> {
        try {
            const result = await api.updateFriendship(friendshipId, action);
            
            if (result.ok) {
                components.showToast('success', 'Request Updated', `Friend request ${action}ed successfully!`, 3000);
                this.loadFriendData();
            } else {
                const errorText = await result.text();
                components.showToast('error', 'Update Failed', errorText || `Failed to ${action} friend request`, 3000);
            }
        } catch (error) {
            console.error(`Error ${action}ing friend request:`, error);
        }
    }

    public async cancelFriendRequest(friendshipId: string): Promise<void> {
        try {
            const result = await api.deleteFriendship(friendshipId);
            
            if (result.ok) {
                components.showToast('success', 'Request Cancelled', 'Friend request cancelled successfully!', 3000);
                this.loadFriendData();
            } else {
                const errorText = await result.text();
                components.showToast('error', 'Cancel Failed', errorText || 'Failed to cancel friend request', 3000);
            }
        } catch (error) {
            console.error('Error cancelling friend request:', error);
        }
    }

    public async removeFriend(friendshipId: string): Promise<void> {
        if (!confirm('Are you sure you want to remove this friend?')) {
            return;
        }

        try {
            const result = await api.deleteFriendship(friendshipId);
            
            if (result.ok) {
                components.showToast('success', 'Friend Removed', 'Friend removed successfully!', 3000);
                this.loadFriendData();
            } else {
                const errorText = await result.text();
                components.showToast('error', 'Remove Failed', errorText || 'Failed to remove friend', 3000);
            }
        } catch (error) {
            console.error('Error removing friend:', error);
        }
    }

    public startChatWithFriend(friendId: string): void {
        components.showToast('info', 'Chat Feature', 'Opening chat with friend...', 2000);
        // You could implement chat creation here
    }

    // ===== UTILITY METHODS =====
    private async startChatWithUser(user: any): Promise<void> {
        components.showToast('info', 'Chat Feature', `Starting chat with ${user.username}...`, 2000);
        
        // Clear search
        if (this.elements.userSearchInput && this.elements.userSearchResultsChat) {
            this.elements.userSearchInput.value = '';
            this.elements.userSearchResultsChat.style.display = 'none';
        }
    }

    private showDashboard(): void {
        if (this.elements.dashboardView) {
            this.elements.dashboardView.classList.add('active');
            this.updateDashboardStats();
        }
    }

    private hideDashboard(): void {
        if (this.elements.dashboardView) {
            this.elements.dashboardView.classList.remove('active');
        }
    }

    private async updateDashboardStats(): Promise<void> {
        try {
            const [friends, chats] = await Promise.all([
                api.getFriendships(),
                api.getChats()
            ]);

            if (this.elements.totalFriends) {
                this.elements.totalFriends.textContent = friends.length.toString();
            }
            if (this.elements.activeChats) {
                this.elements.activeChats.textContent = chats.length.toString();
            }
            if (this.elements.messagesToday) {
                this.elements.messagesToday.textContent = this.messagesCount.toString();
            }
            if (this.elements.onlineFriends) {
                // Mock online friends count
                this.elements.onlineFriends.textContent = Math.floor(friends.length * 0.6).toString();
            }
        } catch (error) {
            console.error('Error updating dashboard stats:', error);
            // Fallback to mock data
            if (this.elements.totalFriends) this.elements.totalFriends.textContent = '0';
            if (this.elements.activeChats) this.elements.activeChats.textContent = '0';
            if (this.elements.messagesToday) this.elements.messagesToday.textContent = '0';
            if (this.elements.onlineFriends) this.elements.onlineFriends.textContent = '0';
        }
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
                        // await api.markNotificationsAsOpened('others');
                        await api.fetchWithAutoRefresh(`${this.baseURL}/notifications/others`, {
                            method: "PATCH",
                            credentials: "include",
                        });
            
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

                if (!visible) {
                    try {
                        // Mark message notifications as read
                        // await api.markNotificationsAsOpened('messages');
                        // await api.fetchWithAutoRefresh(`${CONFIG.baseURL}/notifications/messages`, {
                        //         method: 'PATCH',
                        //         credentials: "include",
                        //     });
                        // this.mailboxNotificationCount = 0;
                        // this.elements.mailboxBtn!.setAttribute('data-count', '0');
                    } catch (error) {
                        console.error('Error marking mailbox notifications as opened:', error);
                    }
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

    private handleURLChatId(): void {
        const params = new URLSearchParams(window.location.search);
        const chatIdString = params.get('chatId');
        
        if (chatIdString) {
            const chatId = parseInt(chatIdString);
            setTimeout(() => {
                this.joinRoom(chatId);
            }, 500);
        }
    }

    private async loadCurrentUser(): Promise<void> {
        try {
            const result = await api.getCurrentUser();
            if (result.success && result.data) {
                this.currentUserId = result.data.user.id || result.data.user.user?.id;
            }
        } catch (error) {
            console.error('Error loading current user:', error);
        }
    }

    // Cleanup method
    destroy(): void {
        if (this.socketService) {
            if (this.currentChatId) {
                this.socketService.emit('leaveRoom', this.currentChatId);
            }
            this.socketService.disconnect();
        }
    }

    // Getter for current chat ID
    getCurrentChatId(): number | null {
        return this.currentChatId;
    }
}

const chat = new Chat();

// Make chat available globally for button onclick handlers
declare global {
    interface Window {
        chat: Chat;
    }
}
window.chat = chat;

export default chat;
