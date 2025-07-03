import api from './api';
import components from './components';
import utils from './utils';
import { baseURL, CONFIG } from './constants';
import toastManager from './toastManager';
import notificationManager from './NotificationManager';

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

    // Friend search popup elements
    friendSearchPopup: HTMLElement | null;
    friendSearchPopupOverlay: HTMLElement | null;
    friendSearchPopupUsername: HTMLElement | null;
    friendSearchPopupAddBtn: HTMLElement | null;
    friendSearchPopupBlockBtn: HTMLElement | null;
    friendSearchPopupCloseBtn: HTMLElement | null;

    // Blocked users elements
    blockedUsersList: HTMLElement | null;
    blockedUsersBadge: HTMLElement | null;
}

class Chat {
     socketService: any = null;
     elements: ChatElements = {} as ChatElements;
     currentChatId: number | null = null;
     currentUserId: number | null = null;
     initialized: boolean = false;
     notificationCount: number = 0;
     mailboxNotificationCount: number = 0;
     messagesCount: number = 0;
     baseURL: string = CONFIG.baseURL || '';
     chatReloadTimeout: any = null;
     currentChatWithUsername: string | null = null;

    // Blocked users management
    blockedUsersCache: Set<string> = new Set();
    blockedUsersList: any[] = [];
    currentPopupUser: any = null;
     
    constructor() {
        // Initialize socket connection
        if (typeof io !== 'undefined') {
            console.log('Initializing chat socket connection from chat object, socket Service not initialized yet');
            this.socketService = io(CONFIG.socketURL, { withCredentials: true });
            this.setupBaseSocketHandlers();
        }
        console.log('Chat class initialized and socket service is initialized before going to chat');
    }

    init(): void {
        if (this.initialized) return;

        // Listen for page changes
        document.addEventListener('pageShown', (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail.page === 'chat') {
                this.initializeChatPage();
            } else {
                // ADD THIS: Cleanup when leaving chat page
                this.cleanupSocketHandlers();
            }
        });


        this.initialized = true;

        // // ADD THIS in constructor after the pageShown listener
        document.addEventListener('pageHidden', (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail.page === 'chat') {
                this.cleanupSocketHandlers();
            }
        });
    }

     setupBaseSocketHandlers(): void {
        if (!this.socketService) return;

        this.socketService.on('connect', () => {
            console.log('Chat socket connected');
            if (this.elements.chatRows) {
                this.loadChats();
                this.loadFriendData();
                this.loadBlockedUsers(); 
                this.handleURLChatId();
            }
        });

        this.socketService.on('disconnect', () => {
            console.log('Chat socket disconnected');
        });
    }

    cleanupSocketHandlers(): void {
        if (!this.socketService) return;
        
        chat.socketService.off('messageReceivedInform');
        chat.socketService.off('friendRequestInform');
        chat.socketService.off('friendRequestAccept');
        this.socketService.off('newMessage');
        console.log('Chat socket handlers cleaned up');
    }
     initializeChatPage(): void {
        setTimeout(() => {
            this.getElements();
            this.setupEventListeners();
            this.createBlockedUsersSection(); // Create section first
            this.setupSocketHandlers();
            this.setupPopupEventListeners(); // FIXED: Setup popup listeners
            this.initializeParticles();
            this.loadChats();
            this.loadFriendData();
             this.loadBlockedUsers(); 
            this.updateDashboardStats();
        }, 100);
    }

     getElements(): void {
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

            // Try to get popup elements from HTML first, fallback to creation
            friendSearchPopup: document.getElementById('friendSearchPopup'),
            friendSearchPopupOverlay: document.getElementById('friendSearchPopupOverlay'),
            friendSearchPopupUsername: document.getElementById('friendSearchPopupUsername'),
            friendSearchPopupAddBtn: document.getElementById('friendSearchPopupAddBtn'),
            friendSearchPopupBlockBtn: document.getElementById('friendSearchPopupBlockBtn'),
            friendSearchPopupCloseBtn: document.getElementById('friendSearchPopupCloseBtn'),

            // Blocked users elements
            blockedUsersList: document.getElementById('blockedUsersList'),
            blockedUsersBadge: document.getElementById('blockedUsersBadge'),
        };
    }

     setupEventListeners(): void {
        // Send message
        if (this.elements.sendBtn) {     
            this.elements.sendBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.sendMessage()
                chat.debouncedReloadChats(); // Reload chats after sending message
            });
        }

        if (this.elements.messageInput) {
            this.elements.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.sendMessage();
                
                   // Reload chats after sending message
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

        // Escape key for dashboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.dashboardView?.classList.contains('active')) {
                this.hideDashboard();
            }
        });

         document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        
        // Hide chat search results if clicking outside
        if (this.elements.userSearchResultsChat && 
            !target.closest('#userSearchInput') && 
            !target.closest('#userSearchResultsChat')) {
            this.elements.userSearchResultsChat.style.display = 'none';
        }
        
        // Hide friend search results if clicking outside
        if (this.elements.userSearchResults && 
            !target.closest('#userSearch') && 
            !target.closest('#userSearchResults')) {
            this.elements.userSearchResults.style.display = 'none';
        }
        
        // Deactivate chat if clicking outside chat area
        if (this.currentChatId && 
            !target.closest('.chat-row') && 
            !target.closest('.chatRow') &&
            !target.closest('#messageBox') &&
            !target.closest('#messageInput') &&
            !target.closest('#sendBtn') &&
            !target.closest('#chatHeader') &&
            // !target.closest('.chat-container') && // Adjust based on your HTML structure
            !target.closest('#userSearchResultsChat')) {
            
            this.deactivateChat();
        }
    });


    }

     setupSocketHandlers(): void {
        // if (!this.socketService) return;
        if (!notificationManager.initialized) {
            console.log('NotificationManager not initialized, skipping socket handlers setup');
            return;
        }
        // Socket event handlers
     
        // // Handle new messages there is two sockets one in the newMessage event and one in the messageReceivedInform event
        // this.socketService.on('newMessage', (message: any) => {
        //     console.log('New message received:', message);
        //     if ((message.chat_id == this.currentChatId)) {
        //         console.log(`New emmiting message in current chat ${this.currentChatId}:`, message);
        //         this.appendMessage(message);
        //         // return; // Ignore messages not in current chat
        //     }
        //     this.debouncedReloadChats(); // Use debounced reload
        //     // console.log(`New message received in chat ${message.chatId}:`, message);
        //     // if (!chat.currentChatId || chat.currentChatId.toString() !== message.chatId?.toString()) {
        //     // toastManager.showToast("Message", message.content);
        //     // // }

        //     // this.debouncedReloadChats(); // Use debounced reload
        //     // // this.messagesCount++;
        //     // notificationManager.incrementMailboxCount();
        //     // this.updateDashboardStats();
        // });

        // // Handle friend requests
        // this.socketService.on('friendRequestInform', (data: any) => {
        //     this.loadFriendData();
        //     toastManager.addToQueue('Friend Request', data.message);
        //     notificationManager.incrementNotificationCount();
            
        // });

        // this.socketService.on('friendRequestAccept', (data: any) => {

        //     this.loadFriendData();
        //     toastManager.addToQueue('Friend Request', data.message);
        //     notificationManager.incrementNotificationCount();
         
        // });
    }

    // ===== IMPROVED CHAT FUNCTIONALITY =====
    
    /**
     * Debounced chat reload to prevent excessive API calls
     */
     debouncedReloadChats(): void {
        if (this.chatReloadTimeout) {
            clearTimeout(this.chatReloadTimeout);
        }
        this.chatReloadTimeout = setTimeout(() => {
            this.loadChats();
            this.chatReloadTimeout = null;
        }, 500);
    }

    /**
     * Load chats with improved performance and error handling
     */
     async loadChats(): Promise<void> {
        if (!this.elements.chatRows) return;

        // Clear existing chat rows efficiently
        while (this.elements.chatRows.firstChild) {
            this.elements.chatRows.removeChild(this.elements.chatRows.firstChild);
        }

        try {
            // Use the direct API approach from the second snippet
            const res = await api.fetchWithAutoRefresh(`${this.baseURL}/chats`);
            
            if (!res.ok) {
                toastManager.showToast('Error', `Failed to load chats : ${res.statusText}`);
                throw new Error(`Failed to fetch chats: ${res.status}`);

            }
            
            const chats = await res.json();
            console.log(`Loaded ${chats.length} chats`);
            if (chats.length === 0) {
                const noChatsMsg = document.createElement('div');
                noChatsMsg.textContent = 'No chats yet.';
                noChatsMsg.style.cssText = 'text-align: center; color: #999; padding: 20px;';
                this.elements.chatRows.appendChild(noChatsMsg);
                return;
            }

            // Use DocumentFragment for better performance
            const fragment = document.createDocumentFragment();

            for (const { chat_id, participantId } of chats) {
                console.log(`Rendering chat: ${chat_id} for participant: ${participantId}`);
                try {
                    const userRes = await api.fetchWithAutoRefresh(
                        `${this.baseURL}/users/${participantId}`
                    );
                    
                    if (!userRes.ok) continue;
                    
                    const user = await userRes.json();

                    const chatRow = document.createElement('div');
                    chatRow.className = 'chat-row chatRow'; // Keep both class names for compatibility
                    chatRow.role = 'listitem';
                    chatRow.dataset.chatId = chat_id;
                    
                    chatRow.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="online-status"></span>
                            <span>${user.username || 'Unknown User'}</span>
                        </div>
                        <div style="font-size: 12px; color: #999; margin-top: 5px;">Click to open chat</div>
                    `;

                    // Mark active chat
                    if (this.currentChatId === chat_id) {
                        chatRow.classList.add('active');
                    }

                    // Add click event listener
                    chatRow.addEventListener('click', async () => {
                        await this.selectChatFromList(chat_id, user);
                    });

                    fragment.appendChild(chatRow);
                } catch (error) {
                    console.error('Error rendering chat:', error);
                }
            }

            this.elements.chatRows.appendChild(fragment);
            return chats;
        } catch (error) {
            console.error('Error loading chats:', error);
            this.elements.chatRows.innerHTML = '<div style="text-align: center; color: #f44336; padding: 20px;">Error loading chats.</div>';
            return;
        }
    }

    /**
     * Select chat from the chat list (combining both approaches)
     */
     async selectChatFromList(chatId: number, user: any): Promise<void> {
        try {
            // Join the room
            console.log(`Joining chat room from selectChatFromList: ${chatId}`);
            this.currentChatWithUsername = user.username || null; // Store current username for later use
            console.log(`Current chat with username: ${this.currentChatWithUsername}`);
            await this.joinRoom(chatId);
            // Mark notifications as read for the current chat
            if (notificationManager.getMailboxCount() > 0 && this.elements.mailboxBtn) {
            const res = await api.fetchWithAutoRefresh(
                `${this.baseURL}/notifications/messages/by-chat/${chatId}`,
                {
                    method: 'PATCH',
                    credentials: 'include',
                }
            );
            
            if (res.ok) {
                
                this.mailboxNotificationCount = Math.max(0, this.mailboxNotificationCount - 1);
                notificationManager.decrementMailboxCount();
                if (this.elements.mailboxBtn) {
                    // this.elements.mailboxBtn.setAttribute('data-count', this.mailboxNotificationCount.toString());
                    this.elements.mailboxBtn.setAttribute('data-count', notificationManager.getMailboxCount().toString());
                }
            }else {
                console.error('Failed to mark messages as read:', res.statusText);
            }
        }
            // Update URL
            const url = new URL(window.location.href);
            url.searchParams.set('chatId', chatId.toString());
            window.history.pushState({}, '', url);
            
        } catch (error) {
            console.error('Error selecting chat:', error);
            components.showToast('error', 'Chat Error', 'Failed to open chat', 3000);
        }
    }

     async selectChat(chatId: number): Promise<void> {
        // Use the improved selectChatFromList method
        await this.selectChatFromList(chatId, null);
    }

     async joinRoom(chatId: number): Promise<void> {
        // Get current user if not set
        if (this.currentUserId === null) {
            await this.loadCurrentUser();
        }
        console.log(`Current user ID: ${this.currentUserId}`);


           //protection for not loading messages again if you already inside  a chat
        //  if (this.currentChatId == chatId) {
        //    return;
        // }
        // Leave current room
        if (this.currentChatId !== null && this.socketService) {
            console.log(`Leaving current chat room: ${this.currentChatId}`);
            this.socketService.emit('leaveRoom', this.currentChatId);
        }

     

        this.currentChatId = chatId;

        // Update UI - use both class selectors for compatibility
        document.querySelectorAll('.chat-row, .chatRow').forEach(row => {
            row.classList.remove('active');
        });

        const activeRow = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (activeRow) {
            activeRow.classList.add('active');
        }
        if (this.elements.chatHeader) {
            this.elements.chatHeader.textContent = `Chat Active with ${this.currentChatWithUsername || 'Unknown User'}`;
            }
        // Clear and load messages
        // this.clearMessages();
        console.log(`Joining chat room: ${chatId}`);
        if (chatId )  {
        
            if (this.socketService) {
                this.socketService.emit('joinRoom', chatId);
            }
        }else {
            console.error('Invalid chatId:', chatId);
            toastManager.showToast('error', 'Invalid Chat');
        }
        
    

        try {
            console.log(`Loading messages from join room function`);
            const messages = await api.getChatMessages(chatId.toString());
           
            messages.forEach((message: any) => this.appendMessage(message));
            // Update header
                if (this.elements.chatHeader) {
                    this.elements.chatHeader.textContent =`Chat Active with ${this.currentChatWithUsername  || 'Unknown User'}`;
                }
            if ( notificationManager.getMailboxCount() > 0){
                // Mark messages as read
                await api.fetchWithAutoRefresh(`${CONFIG.baseURL}/notifications/messages/by-chat/${chatId}`, {
                    method: 'PATCH',
                    credentials: "include",
                });
                
                notificationManager.updateMailboxCount(0); // Reset mailbox count
                if (this.elements.mailboxBtn) {
                    this.elements.mailboxBtn.setAttribute('data-count', '0');
                }
            } else {
                console.log('No mailbox notifications to mark as read');
            }
            } catch (error) {
                console.error('Error loading messages:', error);
            }
        }
    
    
        private deactivateChat(): void {
            // Clear current chat state
            this.currentChatId = null;
            
            // Remove active class from all chat rows
            document.querySelectorAll('.chat-row, .chatRow').forEach(row => {
                row.classList.remove('active');
            });
            
            // Clear messages
            this.clearMessages();
            
            // Update header
            if (this.elements.chatHeader) {
                this.elements.chatHeader.textContent = 'Select a chat';
            }
            
            // Leave socket room
            if (this.socketService && this.currentChatId) {
                this.socketService.emit('leaveRoom', this.currentChatId);
            }
            
            // Update URL to remove chatId
            const url = new URL(window.location.href);
            url.searchParams.delete('chatId');
            window.history.pushState({}, '', url);
            
            console.log('Chat deactivated');
    }
     async sendMessage(): Promise<void> {
        if (!this.elements.messageInput || !this.currentChatId) return;

        const content = this.elements.messageInput.value.trim();
        if (!content) return;

        // Check if trying to send message to blocked user
        if (this.currentChatWithUsername) {
            const blockedUser = this.blockedUsersList.find(user => 
                user.username === this.currentChatWithUsername
            );
            
            if (blockedUser) {
                components.showToast('error', 'Message Blocked', 'Cannot send messages to blocked users', 3000);
        
                return;
            }
        }
        try {
            const result = await api.sendMessage(this.currentChatId.toString(), content);
            
            if (result.ok) {
                // this.appendMessage({ sender_id: this.currentUserId ,content: content});
                this.elements.messageInput.value = '';
            } else {
                components.showToast('error', 'Send Failed', 'Failed to send message', 3000);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            components.showToast('error', 'Send Failed', 'Failed to send message', 3000);
        }
    }

     appendMessage(message: any): void {
        if (!this.elements.messageBox) return;
    
        // console.log(`Appending message: ${message.content} from ${message.sender_id}`);
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

    clearMessages(): void {
        if (this.elements.messageBox) {
            this.elements.messageBox.innerHTML = '';
            console.log('Messages cleared');
        }
    }

    // ===== FRIEND FUNCTIONALITY =====
     async handleFriendSearch(): Promise<void> {
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

     async handleChatSearch(): Promise<void> {
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

     renderFriendSearchResults(users: any[]): void {
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
            // Add hover effect
            li.addEventListener('mouseenter', () => {
                li.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            });
            li.addEventListener('mouseleave', () => {
                li.style.backgroundColor = 'transparent';
            });

            // li.addEventListener('click', () => this.sendFriendRequest(user.id));
                       // FIXED: Use showPopup instead of showFriendActionPopup
            li.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.showPopup(user);
                // Hide search results
                this.elements.userSearchResults!.style.display = 'none';
                if (this.elements.userSearch) {
                    this.elements.userSearch.value = '';
                }
            });
            this.elements.userSearchResults!.appendChild(li);
        });

        this.elements.userSearchResults.style.display = 'block';
    }



     async sendFriendRequest(userId: string): Promise<void> {
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

    renderChatSearchResults(users: any[]): void {
    if (!this.elements.userSearchResultsChat) {
        console.error('userSearchResultsChat element not found!');
        return;
    } 

    this.elements.userSearchResultsChat.innerHTML = '';

    if (users.length === 0) {
        this.elements.userSearchResultsChat.style.display = 'none';
        return;
    }
    
    this.elements.userSearchResultsChat.style.display = 'block';
    users.forEach(user => {
        const div = document.createElement('div');
        div.style.cssText = 'padding: 8px; cursor: pointer; border-bottom: 1px solid #333;';
        div.textContent = user.username || 'Unknown User';
        
        // MODIFIED: Create chat when clicking on user
        div.addEventListener('click', async () => {
            try {
                // Hide search results immediately
                this.elements.userSearchResultsChat!.style.display = 'none';
                if (this.elements.userSearchInput) {
                    this.elements.userSearchInput.value = '';
                }
                
                components.showToast('info', 'Creating Chat', `Creating chat with ${user.username}...`, 2000);
                
                // Check if chat already exists
                let chatId;
                const existingChatRes = await api.fetchWithAutoRefresh(
                    `${this.baseURL}/chats/between/${user.id}`,
                    { credentials: 'include' }
                );
                
                if (existingChatRes.ok) {
                    // Chat exists, get the chat ID
                    const existingChat = await existingChatRes.json();
                    chatId = existingChat.chat_id;
                    components.showToast('success', 'Chat Found', `Opening existing chat with ${user.username}`, 2000);
                } else if (existingChatRes.status === 404) {
                    // Chat doesn't exist, create new one
                    const createChatRes = await api.fetchWithAutoRefresh(`${this.baseURL}/chats`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ 
                            user2Id: user.id,
                            // Try alternative field names if the above doesn't work
                            otherUserId: user.id,
                            participantId: user.id
                        })
                    });
                    
                    if (!createChatRes.ok) {
                        toastManager.showToast('Error', `Failed to create chat : ${createChatRes.statusText}`);
                        throw new Error(`Failed to create chat: ${createChatRes.status}`);
                    }
                    
                    const newChat = await createChatRes.json();
                    chatId = newChat.chat_id || newChat.id;
                    
                    components.showToast('success', 'Chat Created', `New chat created with ${user.username}`, 2000);
                    
                    // Reload chats to show the new chat in the list
                    await this.loadChats();
                } else {
                    throw new Error(`Failed to check existing chat: ${existingChatRes.status}`);
                }
                
                // Join the chat room
                if (chatId) {
                    await this.joinRoom(chatId);
                } else {
                    throw new Error('No chat ID received');
                }

                                // CRITICAL: Always reload chats to ensure the chat row appears
                console.log('Reloading chats to show new/existing chat row...');
                await this.loadChats();
                this.currentChatWithUsername = user.username;
                // Wait a moment for the DOM to update, then join the chat
                setTimeout(async () => {

                    if (chatId) {
                          // Store current username for later use
                        console.log(`Joining chat room ${chatId} after creating chat row`);
                        await this.joinRoom(chatId);
                        
                        // Scroll to the active chat row if needed
                        const activeRow = document.querySelector(`[data-chat-id="${chatId}"]`);
                        if (activeRow) {
                            activeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                        
                        components.showToast('success', 'Chat Ready', `Chat with ${user.username} is now active!`, 2000);
                    }
                }, 200);
                
            } catch (error) {
                console.error('Error creating/opening chat:', error);
                components.showToast('error', 'Chat Error', `Failed to create chat with ${user.username}`, 3000);
            }
        });
        
        this.elements.userSearchResultsChat!.appendChild(div);
    });
}

     async loadFriendData(): Promise<void> {
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

     async loadIncomingRequests(): Promise<void> {
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

     async loadOutgoingRequests(): Promise<void> {
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
                li.innerHTML = `<span>${request.senderUsername}</span>`;

                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Cancel';
                cancelBtn.style.cssText = 'padding: 2px 8px; background: #f44336; border: none; color: white; border-radius: 3px; cursor: pointer;';
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

     async loadFriendsList(): Promise<void> {
        if (!this.elements.friendsList) return;
        console.log('Loading friends list...');
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
                console.log(`Rendering friend: ${friend.username} with object: ${JSON.stringify(friend)}`);
                li.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="online-status"></span>
                        <span>${friend.username}</span>
                    </div>
                    <div>
                        <button onclick="window.chat.startChatWithFriend('${friend.userId}')" 
                            style="margin-right: 5px; padding: 2px 8px; background: #2196F3; border: none; color: white; border-radius: 3px; cursor: pointer;">
                                Chat
                        </button>
                        <button onclick="window.chat.removeFriend('${friend.friendshipId}')" style="padding: 2px 8px; background: #f44336; border: none; color: white; border-radius: 3px; cursor: pointer;">Remove</button>
                    </div>
                `;
                
                this.elements.friendsList!.appendChild(li);
            });
        } catch (error) {
            console.error('Error loading friends list:', error);
        }
    }
    public async refreshAllFriendData(): Promise<void> {
    try {
        // Load all friend data
        await this.loadFriendData();
        
        // Update dashboard
        this.updateDashboardStats();
        
        
        // Reload chats (in case friend status affects available chats)
        await this.loadChats();
        
        console.log('All friend data refreshed successfully');
    } catch (error) {
        console.error('Error refreshing friend data:', error);
    }
}

    // ===== PUBLIC METHODS FOR GLOBAL ACCESS =====
    public async handleFriendRequest(friendshipId: string, action: 'accept' | 'reject'): Promise<void> {
        try {
            const result = await api.updateFriendship(friendshipId, action);
            
            if (result.ok) {
                components.showToast('success', 'Request Updated', `Friend request ${action}ed successfully!`, 3000);
                await this.loadFriendData();
                this.updateDashboardStats();
                // Decrement notification count through NotificationManager
                notificationManager.decrementNotificationCount();
                // Decrement notification count if accepting/rejecting
       
                await this.loadChats();
                await this.refreshAllFriendData();
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
                this.refreshAllFriendData()
            } else {
                const errorText = await result.text();
                components.showToast('error', 'Remove Failed', errorText || 'Failed to remove friend', 3000);
            }
        } catch (error) {
            console.error('Error removing friend:', error);
        }
    }



    public async startChatWithFriend(friendId: string): Promise<void> {
        try {
            components.showToast('info', 'Chat Feature', 'Opening chat with friend...', 2000);
            
            // First, check if a chat already exists between users using your backend route
            const existingChat = await this.checkExistingChatWithFriend(friendId);
                 let user;
            try {
                const userRes = await api.fetchWithAutoRefresh(`${this.baseURL}/users/${friendId}`);
                if (userRes.ok) {
                    user = await userRes.json();
                } else {
                    throw new Error(`Failed to get user info: ${userRes.status}`);
                }
            } catch (error) {
                console.error('Error getting user info:', error);
                // Fallback user object if API call fails
                user = { id: friendId, username: 'Unknown User' };
            }
            if (existingChat && existingChat.chat_id) {
                // If chat exists, join it directly
                
                await this.selectChatFromList(existingChat.chat_id, user);
                components.showToast('success', 'Chat Opened', 'Existing chat opened successfully!', 2000);
                return;
            }
            
            // If no existing chat, create a new one
            const newChat = await this.createChatWithFriend(friendId);
            
            if (newChat && (newChat.chat_id || newChat.id)) {
                const chatId = newChat.chat_id || newChat.id;
                
                // Reload chat list to show the new chat
                await this.loadChats();
                
                // Join the new chat
                await this.selectChatFromList(chatId , user);
                
                components.showToast('success', 'Chat Created', 'New chat created successfully!', 3000);
            } else {
                throw new Error('Failed to create chat - no chat ID returned');
            }
            
        } catch (error) {
            console.error('Error starting chat with friend:', error);
            components.showToast('error', 'Chat Failed', 'Failed to start chat with friend', 3000);
        }
    }

    /**
     * Check if chat exists between current user and friend using your backend endpoint
     */
     async checkExistingChatWithFriend(friendId: string): Promise<any | null> {
        try {
            // Use your backend route: GET /chats/between/:otherUserId
            const res = await api.fetchWithAutoRefresh(`${this.baseURL}/chats/between/${friendId}`, {
                credentials: 'include'
            });
            
            if (res.ok) {
                const chatData = await res.json();
                return chatData;
            } else if (res.status === 404) {
                // Chat doesn't exist, which is expected
                return null;
            } else {
                throw new Error(`Failed to check existing chat: ${res.status}`);
            }
            
        } catch (error) {
            console.error('Error checking existing chat:', error);
            // Return null so we can try to create a new chat
            return null;
        }
    }

    /**
     * Create a new chat with a friend using your backend endpoint
     */
     async createChatWithFriend(friendId: string): Promise<any | null> {
        try {
            // Use your backend route: POST /chats
            // Based on typical chat creation, the body usually contains the other user's ID
            const res = await api.fetchWithAutoRefresh(`${this.baseURL}/chats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    otherUserId: friendId
                    // Alternative field names that might be expected:
                    // participantId: friendId,
                    // userId: friendId,
                    // friendId: friendId
                    // user2Id: user.id 
                })
            });

            
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Failed to create chat: ${res.status} - ${errorText}`);
            }
            
            const newChat = await res.json();
            return newChat;
            
        } catch (error) {
            console.error('Error creating chat with friend:', error);
            
            // Try with alternative field name
            try {
                const alternativeRes = await api.fetchWithAutoRefresh(`${this.baseURL}/chats`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        participantId: friendId
                    })
                });
                
                if (alternativeRes.ok) {
                    return await alternativeRes.json();
                }
            } catch (fallbackError) {
                console.error('Alternative chat creation also failed:', fallbackError);
            }
            
            throw error;
        }
    }

    // ===== UTILITY METHODS =====
     async startChatWithUser(user: any): Promise<void> {
        components.showToast('info', 'Chat Feature', `Starting chat with ${user.username}...`, 2000);
        
        // Clear search
        if (this.elements.userSearchInput && this.elements.userSearchResultsChat) {
            this.elements.userSearchInput.value = '';
            this.elements.userSearchResultsChat.style.display = 'none';
        }
        console.log(`Joining chat room from startChatWithUser: ${user.id}`);

        try {
		let chatId;

		// Check if chat exists
		const res = await api.fetchWithAutoRefresh(
			`${baseURL}/chats/between/${user.id}`,
			{ credentials: "include" }
		);

		if (res.ok) {
			const data = await res.json();
			chatId = data.chat_id;
		} else if (res.status === 404) {
			// Create new chat
            console.log(`No existing chat found, creating new chat with user: ${user.id}`);
			const createRes = await api.fetchWithAutoRefresh(`${baseURL}/chats`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ user2Id: user.id }),
			});

			if (!createRes.ok) throw new Error("Failed to create chat");
			const newChat = await createRes.json();
			chatId = newChat.chat_id;
            
			await this.loadChats();
		}

		this.joinRoom(chatId);
	} catch (err) {
		console.error("Error starting chat:", err);
	}


    }

     showDashboard(): void {
        if (this.elements.dashboardView) {
            this.elements.dashboardView.classList.add('active');
            this.updateDashboardStats();
        }
    }

     hideDashboard(): void {
        if (this.elements.dashboardView) {
            this.elements.dashboardView.classList.remove('active');
        }
    }

     async updateDashboardStats(): Promise<void> {
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

     initializeParticles(): void {
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

     handleURLChatId(): void {
        const params = new URLSearchParams(window.location.search);
        const chatIdString = params.get('chatId');
        
        if (chatIdString) {
            const chatId = parseInt(chatIdString);
            setTimeout(() => {
                this.joinRoom(chatId);
            }, 500);
        }
    }

     async loadCurrentUser(): Promise<void> {
        try {
            const result = await api.getCurrentUser();
            if (result.success && result.data) {
                this.currentUserId = result.data.user.id || result.data.user.user?.id;
            }
        } catch (error) {
            console.error('Error loading current user:', error);
        }
    }

    // ===== PUBLIC API METHODS =====
    
    /**
     * Get current chat ID - useful for external components
     */
    public getCurrentChatId(): number | null {
        return this.currentChatId;
    }

    /**
     * Manually trigger chat reload - useful for external triggers
     */
    public reloadChats(): void {
        this.loadChats();
    }

    /**
     * Get debounced reload function - useful for external components
     */
    public getDebouncedReload(): () => void {
        return () => this.debouncedReloadChats();
    }

    /**
     * Force join a specific room - useful for external navigation
     */
    public async forceJoinRoom(chatId: number): Promise<void> {
        await this.joinRoom(chatId);
    }


     // ===== BLOCKED USERS SECTION CREATION =====
      private createBlockedUsersSection(): void {
        // Only create if elements don't exist
        if (this.elements.blockedUsersList && this.elements.blockedUsersBadge) {
            console.log('Blocked users section already exists in HTML');
            return;
        }

        const friendsSidebar = document.querySelector('.sidebar.friends-sidebar') || document.querySelector('.sidebar');
        if (!friendsSidebar) {
            console.error('Friends sidebar not found, cannot create blocked users section');
            return;
        }

        const blockedSection = document.createElement('div');
        blockedSection.className = 'section blocked-users-section';
        blockedSection.innerHTML = `
            <h3 style="display: flex; align-items: center; gap: 10px;">
                Blocked Users 
                <span class="badge blocked-badge" id="blockedUsersBadge" style="display: none; background: #ff4444;">0</span>
            </h3>
            <ul id="blockedUsersList" role="list" aria-label="Blocked users list" class="blocked-list" style="
                max-height: 200px;
                overflow-y: auto;
                list-style: none;
                padding: 0;
                margin: 0;
            "></ul>
        `;

        friendsSidebar.appendChild(blockedSection);

        // Update element references
        this.elements.blockedUsersList = document.getElementById('blockedUsersList');
        this.elements.blockedUsersBadge = document.getElementById('blockedUsersBadge');

        console.log('Blocked users section created successfully');
    }


    // ===== POPUP FUNCTIONALITY =====

    private createFriendActionPopup(): void {
        // Only create if popup doesn't exist in HTML
        if (document.getElementById('friendSearchPopupOverlay')) {
            console.log('Popup already exists in HTML');
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'friendSearchPopupOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            backdrop-filter: blur(5px);
        `;

        const popup = document.createElement('div');
        popup.id = 'friendSearchPopup';
        popup.style.cssText = `
            background: #1a1a1a;
            border: 2px solid var(--cyber-blue, #00f);
            border-radius: 10px;
            padding: 30px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            position: relative;
            box-shadow: 0 20px 40px rgba(0, 255, 255, 0.3);
            animation: popupSlideIn 0.3s ease-out;
        `;

        popup.innerHTML = `
            <button id="friendSearchPopupCloseBtn" style="
                position: absolute;
                top: 10px;
                right: 15px;
                background: none;
                border: none;
                color: #999;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">&times;</button>
            
            <h3 style="
                color: var(--cyber-blue, #00f);
                margin-bottom: 10px;
                font-size: 24px;
            ">User Actions</h3>
            
            <p style="color: #ccc; margin-bottom: 30px;">
                What would you like to do with 
                <strong id="friendSearchPopupUsername" style="color: var(--cyber-green, #0f0);"></strong>?
            </p>
            
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="friendSearchPopupAddBtn" style="
                    background: linear-gradient(45deg, var(--cyber-green, #0f0), #00ff88);
                    color: #000;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 16px;
                    transition: all 0.3s ease;
                    flex: 1;
                    max-width: 120px;
                ">Add Friend</button>
                
                <button id="friendSearchPopupBlockBtn" style="
                    background: linear-gradient(45deg, #ff0040, #ff4444);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 16px;
                    transition: all 0.3s ease;
                    flex: 1;
                    max-width: 120px;
                ">Block User</button>
            </div>
        `;

        // Add CSS animation if not exists
        if (!document.getElementById('popup-styles')) {
            const style = document.createElement('style');
            style.id = 'popup-styles';
            style.textContent = `
                @keyframes popupSlideIn {
                    from {
                        transform: scale(0.7) translateY(-50px);
                        opacity: 0;
                    }
                    to {
                        transform: scale(1) translateY(0);
                        opacity: 1;
                    }
                }
                
                #friendSearchPopupAddBtn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(0, 255, 0, 0.4);
                }
                
                #friendSearchPopupBlockBtn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(255, 0, 64, 0.4);
                }
                
                #friendSearchPopupCloseBtn:hover {
                    color: #fff;
                    transform: rotate(90deg);
                }
            `;
            document.head.appendChild(style);
        }

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        // Update element references
        this.elements.friendSearchPopupOverlay = overlay;
        this.elements.friendSearchPopup = popup;
        this.elements.friendSearchPopupUsername = document.getElementById('friendSearchPopupUsername');
        this.elements.friendSearchPopupAddBtn = document.getElementById('friendSearchPopupAddBtn');
        this.elements.friendSearchPopupBlockBtn = document.getElementById('friendSearchPopupBlockBtn');
        this.elements.friendSearchPopupCloseBtn = document.getElementById('friendSearchPopupCloseBtn');
    }


     // FIXED: Proper popup event listeners setup
    private setupPopupEventListeners(): void {
        // Ensure popup exists
        if (!this.elements.friendSearchPopupOverlay) {
            this.createFriendActionPopup();
        }

        // Add Friend button
        if (this.elements.friendSearchPopupAddBtn) {
            this.elements.friendSearchPopupAddBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent click from bubbling up to overlay
                e.preventDefault(); // Prevent default button behavior
                console.log('Add Friend button clicked');
                if (this.currentPopupUser && !this.isUserBlocked(this.currentPopupUser.id)) {
                    await this.sendFriendRequest(this.currentPopupUser.id);
                }
                this.closePopup();
            });
        }
        
        // Block/Unblock button
        if (this.elements.friendSearchPopupBlockBtn) {
            this.elements.friendSearchPopupBlockBtn.addEventListener('click', async (e) => {
                if (!this.currentPopupUser) return;
                e.stopPropagation(); // Prevent click from bubbling up to overlay
                e.preventDefault(); // Prevent default button behavior
                const isBlocked = this.isUserBlocked(this.currentPopupUser.id);
                if (isBlocked) {
                    console.log('Unblock User button clicked');
                    await this.handleUnblockUser(this.currentPopupUser);
                } else {
                    await this.handleBlockUser(this.currentPopupUser);
                }
                this.closePopup();
            });
        }
        
        // Close button
        if (this.elements.friendSearchPopupCloseBtn) {
            this.elements.friendSearchPopupCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent click from bubbling up to overlay
                e.preventDefault(); // Prevent default button behavior
                this.closePopup();
            });
        }
        
        // Click outside to close
        if (this.elements.friendSearchPopupOverlay) {
            this.elements.friendSearchPopupOverlay.addEventListener('click', (e) => {
                if (e.target === this.elements.friendSearchPopupOverlay) {
                    this.closePopup();
                }
            });
        }
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.friendSearchPopupOverlay?.style.display === 'flex') {
                this.closePopup();
            }
        });
    }

    //
    private showPopup(user: any): void {
        // Ensure popup exists
        if (!this.elements.friendSearchPopupOverlay) {
            this.createFriendActionPopup();
        }

        this.currentPopupUser = user; // FIXED: Set current user
        
        // Update username
        if (this.elements.friendSearchPopupUsername) {
            this.elements.friendSearchPopupUsername.textContent = user.username;
        }

        // Update buttons based on block status
        const isBlocked = this.isUserBlocked(user.id);
        
        // Update Add Friend button
        if (this.elements.friendSearchPopupAddBtn) {
            if (isBlocked) {
                (this.elements.friendSearchPopupAddBtn as HTMLButtonElement).disabled = true;
                this.elements.friendSearchPopupAddBtn.style.opacity = '0.5';
                this.elements.friendSearchPopupAddBtn.style.cursor = 'not-allowed';
                this.elements.friendSearchPopupAddBtn.textContent = 'User Blocked';
            } else {
                (this.elements.friendSearchPopupAddBtn as HTMLButtonElement).disabled = false;
                this.elements.friendSearchPopupAddBtn.style.opacity = '1';
                this.elements.friendSearchPopupAddBtn.style.cursor = 'pointer';
                this.elements.friendSearchPopupAddBtn.textContent = 'Add Friend';
            }
        }

        // Update Block/Unblock button
        if (this.elements.friendSearchPopupBlockBtn) {
            if (isBlocked) {
                this.elements.friendSearchPopupBlockBtn.textContent = 'Unblock User';
                this.elements.friendSearchPopupBlockBtn.style.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
            } else {
                this.elements.friendSearchPopupBlockBtn.textContent = 'Block User';
                this.elements.friendSearchPopupBlockBtn.style.background = 'linear-gradient(45deg, #ff0040, #ff4444)';
            }
        }
        
        // Show popup
        if (this.elements.friendSearchPopupOverlay) {
            this.elements.friendSearchPopupOverlay.style.display = 'flex';
        }
    }

    private closePopup(): void {
        if (this.elements.friendSearchPopupOverlay) {
            this.elements.friendSearchPopupOverlay.style.display = 'none';
        }
        this.currentPopupUser = null;
    }



    // Cleanup method
    destroy(): void {
          // ADD THIS LINE at the start
        this.cleanupSocketHandlers();
        if (this.chatReloadTimeout) {
            clearTimeout(this.chatReloadTimeout);
        }
        
        if (this.socketService) {
            if (this.currentChatId) {
                this.socketService.emit('leaveRoom', this.currentChatId);
            }
            this.socketService.disconnect();
        }
    }


     // ===== BLOCKED USERS FUNCTIONALITY =====

    private async loadBlockedUsers(): Promise<void> {
        try {
            const result = await api.fetchWithAutoRefresh(`${this.baseURL}/users/blocks`, {
                credentials: 'include'
            });
            
            if (result.ok) {
                this.blockedUsersList = await result.json();
                
                // Update cache
                this.blockedUsersCache.clear();
                this.blockedUsersList.forEach(user => {
                    this.blockedUsersCache.add(user.id.toString());
                });
                
                // Update UI
                this.renderBlockedUsersList();
                // this.updateBlockedUsersBadge();
                
                console.log(`Loaded ${this.blockedUsersList.length} blocked users`);
            } else {
                console.error('Failed to load blocked users:', result.status);
            }
        } catch (error) {
            console.error('Error loading blocked users:', error);
        }
    }

    private renderBlockedUsersList(): void {
        if (!this.elements.blockedUsersList) return;

        this.elements.blockedUsersList.innerHTML = '';

        if (this.blockedUsersList.length === 0) {
            const li = document.createElement('li');
            li.style.cssText = 'color: #999; padding: 8px; text-align: center; font-style: italic; background: none;';
            li.textContent = 'No blocked users';
            this.elements.blockedUsersList.appendChild(li);
            return;
        }

        this.blockedUsersList.forEach(user => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="blocked-user-info">
                    <span class="blocked-user-icon">🚫</span>
                    <span>${user.username}</span>
                </div>
                <button class="unblock-btn" onclick="window.chat.unblockUser('${user.id}')">
                    Unblock
                </button>
            `;
            this.elements.blockedUsersList!.appendChild(li);
        });
    }


    private isUserBlocked(userId: string): boolean {
        return this.blockedUsersCache.has(userId.toString());
    }

    // ===== BLOCKING/UNBLOCKING ACTIONS =====

    private async handleBlockUser(user: any): Promise<void> {
        try {
            const confirmed = confirm(`Are you sure you want to block ${user.username}? This will prevent them from sending you messages or friend requests.`);
            if (!confirmed) return;
            
            components.showToast('info', 'Blocking User', `Blocking ${user.username}...`, 2000);
            
            const result = await api.fetchWithAutoRefresh(`${this.baseURL}/users/blocks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    blockRecipientId: user.id // Adjust based on your API requirements
                })
            });
            
            if (result.ok) {
                this.blockedUsersCache.add(user.id.toString());
                console.log(`User blocked successfully: ${user.username}`);
                components.showToast('success', 'User Blocked', `${user.username} has been blocked successfully!`, 3000);
                await this.loadBlockedUsers();
                this.loadFriendData();
            } else {
                const errorText = await result.text();
                components.showToast('error', 'Block Failed', errorText || 'Failed to block user', 3000);
            }
        } catch (error) {
            console.error('Error blocking user:', error);
            components.showToast('error', 'Block Failed', 'An error occurred while blocking the user', 3000);
        }
    }

    private async handleUnblockUser(user: any): Promise<void> {
        try {
            const confirmed = confirm(`Are you sure you want to unblock ${user.username}? They will be able to send you messages and friend requests again.`);
            if (!confirmed) return;
            
            components.showToast('info', 'Unblocking User', `Unblocking ${user.username}...`, 2000);
            console.log(`Unblocking user with ID: ${user.id}`);
            const result = await api.fetchWithAutoRefresh(`${this.baseURL}/users/blocks/${user.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (result.ok) {
                this.blockedUsersCache.delete(user.id.toString());
                components.showToast('success', 'User Unblocked', `${user.username} has been unblocked successfully!`, 3000);
                await this.loadBlockedUsers();
                this.loadFriendData();
            } else {
                const errorText = await result.text();
                components.showToast('error', 'Unblock Failed', errorText || 'Failed to unblock user', 3000);
            }
        } catch (error) {
            console.error('Error unblocking user:', error);
            components.showToast('error', 'Unblock Failed', 'An error occurred while unblocking the user', 3000);
        }
    }

    public async unblockUser(userId: string): Promise<void> {
        const user = this.blockedUsersList.find(u => u.id.toString() === userId);
        if (user) {
            await this.handleUnblockUser(user);
        } else {
            components.showToast('error', 'User Not Found', 'Blocked user not found', 3000);
        }
    }



    
}

const chat = new Chat();

// Make chat available globally for button onclick handlers and external access
declare global {
    interface Window {
        chat: Chat;
        // Backwards compatibility for your existing code
        chatUI?: {
            loadChats: () => void;
            debouncedReloadChats: () => void;
            cleanupSocketHandlers: () => void;
        };
        chatMessages?: {
            getCurrentChatId: () => number | null;
            joinRoom: (chatId: number) => Promise<void>;
        };
    }
}

window.chat = chat;

// Provide backwards compatibility with your existing window.chatUI and window.chatMessages
window.chatUI = {
    loadChats: () => chat.reloadChats(),
    debouncedReloadChats: () => chat.getDebouncedReload()(),
    cleanupSocketHandlers: () => chat.cleanupSocketHandlers(),
};

window.chatMessages = {
    getCurrentChatId: () => chat.getCurrentChatId(),
    joinRoom: (chatId: number) => chat.forceJoinRoom(chatId),
};

// ADD THIS in constructor
// window.addEventListener('beforeunload', () => {
//     // chat.cleanupSocketHandlers();
//     // chat.socketService.emit("leaveRoom", chat.currentChatId);
// });


export default chat;