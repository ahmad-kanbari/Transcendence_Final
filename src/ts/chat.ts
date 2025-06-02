import api from './api';
import components from './components';
import utils from './utils';
import { CONFIG } from './constants';

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
    private messagesCount: number = 0;

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
        if (this.elements.sendBtn) {
            this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        }

        if (this.elements.messageInput) {
            this.elements.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
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

        // Notifications
        if (this.elements.notificationBell) {
            this.elements.notificationBell.addEventListener('click', () => this.toggleNotifications());
        }

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
        this.socketService.on('messageReceivedInform', (data: any) => {
            this.showToastNotification(data.username, data.message);
            this.updateNotificationCount();
        });

        // Handle friend requests
        this.socketService.on('friendRequestInform', (data: any) => {
            components.showToast('info', 'Friend Request', data.message, 3000);
            this.loadFriendData();
        });

        this.socketService.on('friendRequestAccept', (data: any) => {
            components.showToast('success', 'Friend Request Accepted', data.message, 3000);
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
            this.elements.chatHeader.textContent = 'Loading chat...';
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
                const li = document.createElement('li');
                li.style.cssText = 'padding: 8px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;';
                
                li.innerHTML = `
                    <span>${request.senderUsername}</span>
                    <button onclick="window.chat.cancelFriendRequest('${request.friendshipId}')" style="padding: 2px 8px; background: #f44336; border: none; color: white; border-radius: 3px; cursor: pointer;">Cancel</button>
                `;
                
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

    private toggleNotifications(): void {
        if (!this.elements.generalNotifications) return;

        const isVisible = this.elements.generalNotifications.style.display === 'block';
        this.elements.generalNotifications.style.display = isVisible ? 'none' : 'block';
        
        if (this.elements.messageNotifications) {
            this.elements.messageNotifications.style.display = 'none';
        }

        if (!isVisible) {
            // Load real notifications
            this.loadNotifications();
        }
    }

    private async loadNotifications(): Promise<void> {
        try {
            const notifications = await api.getNotifications('others');
            
            if (this.elements.generalNotifications && notifications.length > 0) {
                this.elements.generalNotifications.innerHTML = notifications.map((notif: any) => `
                    <div class="notification" style="padding: 10px; border-bottom: 1px solid #333; cursor: pointer;">
                        <strong>${notif.type || 'Notification'}</strong><br>
                        ${notif.message}
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    private async initializeNotifications(): Promise<void> {
        try {
            const notifications = await api.getNotifications('messages');
            this.notificationCount = notifications.filter((n: any) => !n.is_read).length;
            this.updateNotificationBadge();
        } catch (error) {
            console.error('Error initializing notifications:', error);
        }
    }

    private updateNotificationCount(): void {
        this.notificationCount++;
        this.updateNotificationBadge();
    }

    private updateNotificationBadge(): void {
        if (this.elements.notificationBell) {
            this.elements.notificationBell.setAttribute('data-count', this.notificationCount.toString());
        }
    }

    private showToastNotification(username: string, message: string): void {
        components.showToast('info', `New message from ${username}`, message.slice(0, 50) + '...', 3000);
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



// import api from './api';
// import components from './components';
// import utils from './utils';
// import { CONFIG } from './constants';

// // Declare socket.io global
// declare const io: any;

// interface ChatElements {
//     chatListDiv: HTMLElement | null;
//     messageBox: HTMLElement | null;
//     messageInput: HTMLInputElement | null;
//     sendBtn: HTMLElement | null;
//     userSearchInput: HTMLInputElement | null;
//     userSearchResults: HTMLElement | null;
//     notificationBell: HTMLElement | null;
//     notificationBadge: HTMLElement | null;
// }

// class Chat {
//     private socketService: any = null;
//     private elements: ChatElements = {} as ChatElements;
//     private currentChatId: number | null = null;
//     private currentUserId: number | null = null;
//     private initialized: boolean = false;
//     private notificationCount: number = 0;

//     constructor() {
//         // Initialize socket connection
//         if (typeof io !== 'undefined') {
//             this.socketService = io(CONFIG.socketURL, { withCredentials: true });
//             this.setupBaseSocketHandlers();
//         }
//     }

//     init(): void {
//         if (this.initialized) return;

//         // Listen for page changes
//         document.addEventListener('pageShown', (event: Event) => {
//             const customEvent = event as CustomEvent;
//             if (customEvent.detail.page === 'chat') {
//                 this.initializeChatPage();
//             }
//         });

//         this.initialized = true;
//     }

//     private setupBaseSocketHandlers(): void {
//         if (!this.socketService) return;

//         this.socketService.on('connect', () => {
//             console.log('Chat socket connected');
//             if (this.elements.chatListDiv) {
//                 this.loadChats();
//                 this.handleURLChatId();
//             }
//         });

//         this.socketService.on('disconnect', () => {
//             console.log('Chat socket disconnected');
//         });
//     }

//     private initializeChatPage(): void {
//         setTimeout(() => {
//             this.getElements();
//             this.setupEventListeners();
//             this.setupSocketHandlers();
//             this.loadChats();
//             this.initializeNotifications();
//         }, 100); // Small delay to ensure DOM is ready
//     }

//     private getElements(): void {
//         this.elements = {
//             chatListDiv: document.getElementById('chatList'),
//             messageBox: document.getElementById('messageBox'),
//             messageInput: document.getElementById('messageInput') as HTMLInputElement,
//             sendBtn: document.getElementById('sendBtn'),
//             userSearchInput: document.getElementById('userSearch') as HTMLInputElement,
//             userSearchResults: document.getElementById('userSearchResults'),
//             notificationBell: document.getElementById('notificationBell'),
//             notificationBadge: document.getElementById('notificationBadge'),
//         };
//     }

//     private setupEventListeners(): void {
//         // Send message
//         if (this.elements.sendBtn) {
//             this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
//         }

//         if (this.elements.messageInput) {
//             this.elements.messageInput.addEventListener('keypress', (e) => {
//                 if (e.key === 'Enter') {
//                     this.sendMessage();
//                 }
//             });
//         }

//         // User search
//         if (this.elements.userSearchInput) {
//             this.elements.userSearchInput.addEventListener('input', () => this.handleUserSearch());
//         }

//         // Notification bell
//         if (this.elements.notificationBell) {
//             this.elements.notificationBell.addEventListener('click', () => this.toggleNotifications());
//         }
//     }

//     private setupSocketHandlers(): void {
//         if (!this.socketService) return;

//         // Handle new messages
//         this.socketService.on('newMessage', (message: any) => {
//             if (message.chat_id === this.currentChatId) {
//                 this.appendMessage(message);
//             }
//             this.loadChats(); // Refresh chat list
//         });

//         // Handle message notifications
//         this.socketService.on('messageReceivedInform', (data: any) => {
//             this.showToastNotification(data.username, data.message);
//             this.updateNotificationCount();
//         });

//         // Handle friend requests
//         this.socketService.on('friendRequestInform', (data: any) => {
//             components.showToast('info', 'Friend Request', data.message, 3000);
//         });

//         this.socketService.on('friendRequestAccept', (data: any) => {
//             components.showToast('success', 'Friend Request Accepted', data.message, 3000);
//         });
//     }

//     private async loadChats(): Promise<void> {
//         if (!this.elements.chatListDiv) return;

//         try {
//             const chats = await api.getChats();
//             this.renderChatList(chats);
//         } catch (error) {
//             console.error('Error loading chats:', error);
//             if (this.elements.chatListDiv) {
//                 this.elements.chatListDiv.innerHTML = '<div class="text-center text-red-400 py-4">Error loading chats</div>';
//             }
//         }
//     }

//     private async renderChatList(chats: any[]): Promise<void> {
//         if (!this.elements.chatListDiv) return;

//         this.elements.chatListDiv.innerHTML = '';

//         if (chats.length === 0) {
//             this.elements.chatListDiv.innerHTML = '<div class="text-center text-gray-400 py-4">No chats yet</div>';
//             return;
//         }

//         for (const chat of chats) {
//             try {
//                 const user = await api.getUserById(chat.participantId.toString());
//                 if (!user || !user.success) continue;

//                 const chatRow = document.createElement('div');
//                 chatRow.className = 'chat-row p-3 border border-cyber-blue rounded cursor-pointer hover:bg-cyber-blue hover:bg-opacity-10 transition-all mb-2';
//                 chatRow.dataset.chatId = chat.chat_id.toString();
//                 chatRow.textContent = user.data?.username || 'Unknown User';

//                 if (this.currentChatId === chat.chat_id) {
//                     chatRow.classList.add('bg-cyber-blue', 'bg-opacity-20', 'border-cyber-pink');
//                 }

//                 chatRow.addEventListener('click', () => this.selectChat(chat.chat_id));
//                 this.elements.chatListDiv.appendChild(chatRow);
//             } catch (error) {
//                 console.error('Error rendering chat:', error);
//             }
//         }
//     }

//     private async selectChat(chatId: number): Promise<void> {
//         await this.joinRoom(chatId);
        
//         // Mark notifications as read
//         try {
//             await api.markChatNotificationsAsRead(chatId.toString());
//         } catch (error) {
//             console.error('Error marking notifications as read:', error);
//         }
        
//         // Update URL
//         const url = new URL(window.location.href);
//         url.searchParams.set('chatId', chatId.toString());
//         window.history.pushState({}, '', url);
//     }

//     private async joinRoom(chatId: number): Promise<void> {
//         // Get current user if not set
//         if (this.currentUserId === null) {
//             await this.loadCurrentUser();
//         }

//         // Leave current room
//         if (this.currentChatId !== null && this.socketService) {
//             this.socketService.emit('leaveRoom', this.currentChatId);
//         }

//         this.currentChatId = chatId;

//         // Update UI
//         document.querySelectorAll('.chat-row').forEach(row => {
//             row.classList.remove('bg-cyber-blue', 'bg-opacity-20', 'border-cyber-pink');
//         });

//         const activeRow = document.querySelector(`[data-chat-id="${chatId}"]`);
//         if (activeRow) {
//             activeRow.classList.add('bg-cyber-blue', 'bg-opacity-20', 'border-cyber-pink');
//         }

//         // Clear and load messages
//         this.clearMessages();
        
//         if (this.socketService) {
//             this.socketService.emit('joinRoom', chatId);
//         }

//         try {
//             const messages = await api.getChatMessages(chatId.toString());
//             messages.forEach((message: any) => this.appendMessage(message));
//         } catch (error) {
//             console.error('Error loading messages:', error);
//         }
//     }

//     private async sendMessage(): Promise<void> {
//         if (!this.elements.messageInput || !this.currentChatId) return;

//         const content = this.elements.messageInput.value.trim();
//         if (!content) return;

//         try {
//             const result = await api.sendMessage(this.currentChatId.toString(), content);
            
//             if (result.ok) {
//                 this.elements.messageInput.value = '';
//             } else {
//                 components.showToast('error', 'Send Failed', 'Failed to send message', 3000);
//             }
//         } catch (error) {
//             console.error('Error sending message:', error);
//             components.showToast('error', 'Send Failed', 'Failed to send message', 3000);
//         }
//     }

//     private appendMessage(message: any): void {
//         if (!this.elements.messageBox) return;

//         const messageDiv = document.createElement('div');
//         messageDiv.className = `message p-3 rounded-lg mb-2 max-w-xs ${
//             message.sender_id === this.currentUserId 
//                 ? 'bg-cyber-blue text-cyber-dark ml-auto text-right' 
//                 : 'bg-cyber-dark border border-cyber-blue text-white'
//         }`;
//         messageDiv.textContent = message.content;

//         this.elements.messageBox.appendChild(messageDiv);
//         this.elements.messageBox.scrollTop = this.elements.messageBox.scrollHeight;
//     }

//     private clearMessages(): void {
//         if (this.elements.messageBox) {
//             this.elements.messageBox.innerHTML = '';
//         }
//     }

//     private async handleUserSearch(): Promise<void> {
//         if (!this.elements.userSearchInput || !this.elements.userSearchResults) return;

//         const query = this.elements.userSearchInput.value.trim();
        
//         if (!query) {
//             this.elements.userSearchResults.style.display = 'none';
//             return;
//         }

//         try {
//             const users = await api.searchUsers(query);
//             this.renderUserSearchResults(users);
//         } catch (error) {
//             console.error('Error searching users:', error);
//         }
//     }

//     private renderUserSearchResults(users: any[]): void {
//         if (!this.elements.userSearchResults) return;

//         this.elements.userSearchResults.innerHTML = '';

//         if (users.length === 0) {
//             this.elements.userSearchResults.style.display = 'none';
//             return;
//         }

//         users.forEach(user => {
//             const userDiv = document.createElement('div');
//             userDiv.className = 'user-result p-2 cursor-pointer hover:bg-cyber-blue hover:bg-opacity-10 border-b border-cyber-blue';
//             userDiv.textContent = user.username;
//             userDiv.addEventListener('click', () => this.startChatWithUser(user));
//             this.elements.userSearchResults!.appendChild(userDiv);
//         });

//         this.elements.userSearchResults.style.display = 'block';
//     }

//     private async startChatWithUser(user: any): Promise<void> {
//         // For now, just send a friend request
//         try {
//             const result = await api.sendFriendRequest(user.id.toString());
//             if (result.ok) {
//                 components.showToast('success', 'Friend Request Sent', `Friend request sent to ${user.username}`, 3000);
//             } else {
//                 components.showToast('error', 'Request Failed', 'Failed to send friend request', 3000);
//             }
//         } catch (error) {
//             console.error('Error sending friend request:', error);
//             components.showToast('error', 'Request Failed', 'Failed to send friend request', 3000);
//         }
        
//         // Clear search
//         if (this.elements.userSearchInput && this.elements.userSearchResults) {
//             this.elements.userSearchInput.value = '';
//             this.elements.userSearchResults.style.display = 'none';
//         }
//     }

//     private async initializeNotifications(): Promise<void> {
//         try {
//             const notifications = await api.getNotifications('messages');
//             this.notificationCount = notifications.filter((n: any) => !n.is_read).length;
//             this.updateNotificationBadge();
//         } catch (error) {
//             console.error('Error initializing notifications:', error);
//         }
//     }

//     private updateNotificationCount(): void {
//         this.notificationCount++;
//         this.updateNotificationBadge();
//     }

//     private updateNotificationBadge(): void {
//         if (this.elements.notificationBadge) {
//             this.elements.notificationBadge.textContent = this.notificationCount.toString();
//             this.elements.notificationBadge.style.display = this.notificationCount > 0 ? 'block' : 'none';
//         }
//     }

//     private showToastNotification(username: string, message: string): void {
//         components.showToast('info', `New message from ${username}`, message.slice(0, 50) + '...', 3000);
//     }

//     private async toggleNotifications(): Promise<void> {
//         // Simple notification toggle - you can expand this
//         console.log('Toggle notifications - count:', this.notificationCount);
        
//         if (this.notificationCount > 0) {
//             try {
//                 await api.markNotificationsAsOpened('messages');
//                 this.notificationCount = 0;
//                 this.updateNotificationBadge();
//                 components.showToast('info', 'Notifications', 'All notifications marked as read', 2000);
//             } catch (error) {
//                 console.error('Error marking notifications as read:', error);
//             }
//         }
//     }

//     private handleURLChatId(): void {
//         const params = new URLSearchParams(window.location.search);
//         const chatIdString = params.get('chatId');
        
//         if (chatIdString) {
//             const chatId = parseInt(chatIdString);
//             setTimeout(() => {
//                 this.joinRoom(chatId);
//             }, 500);
//         }
//     }

//     private async loadCurrentUser(): Promise<void> {
//         try {
//             const result = await api.getCurrentUser();
//             if (result.success && result.data) {
//                 this.currentUserId = result.data.user.id || result.data.user.user?.id;
//             }
//         } catch (error) {
//             console.error('Error loading current user:', error);
//         }
//     }

//     // Cleanup method
//     destroy(): void {
//         if (this.socketService) {
//             if (this.currentChatId) {
//                 this.socketService.emit('leaveRoom', this.currentChatId);
//             }
//             this.socketService.disconnect();
//         }
//     }

//     // Getter for current chat ID (used by other components)
//     getCurrentChatId(): number | null {
//         return this.currentChatId;
//     }
// }

// const chat = new Chat();
// export default chat;