// /**
//  * Chat Messages TypeScript Module
//  * Handles real-time messaging functionality with Socket.IO integration
//  */

// import { Socket } from 'socket.io-client';

// // Type definitions
// interface Message {
//   id: string | number;
//   content: string;
//   sender_id: string | number;
//   chat_id: string | number;
//   created_at: string;
//   updated_at?: string;
//   message_type?: 'text' | 'image' | 'file' | 'system';
//   metadata?: Record<string, any>;
// }

// interface User {
//   id: string | number;
//   username: string;
//   email?: string;
//   profile_image?: string;
//   is_online?: boolean;
// }

// interface UserResponse {
//   user: {
//     user: User;
//   };
// }

// interface ChatRow extends HTMLElement {
//   getAttribute(name: 'data-chat-id'): string | null;
// }

// interface ChatUI {
//   debouncedReloadChats: () => void;
//   updateChatPreview?: (chatId: string | number, lastMessage: string) => void;
//   markChatAsActive?: (chatId: string | number) => void;
// }

// interface ChatSocket extends Socket {
//   emit(event: 'joinRoom', chatId: string | number): this;
//   emit(event: 'leaveRoom', chatId: string | number): this;
//   on(event: 'newMessage', callback: (message: Message) => void): this;
//   on(event: 'messageRead', callback: (data: { chatId: string | number; userId: string | number }) => void): this;
//   on(event: 'userTyping', callback: (data: { chatId: string | number; userId: string | number; isTyping: boolean }) => void): this;
// }

// interface WindowExtensions {
//   chatMessages: ChatMessages;
//   chatUI: ChatUI;
//   chatSocket: ChatSocket;
//   baseURL: string;
//   fetchWithAutoRefresh: (url: string, options?: RequestInit) => Promise<Response>;
// }

// // Extend Window interface
// declare global {
//   interface Window extends WindowExtensions {}
// }

// // Configuration
// const CONFIG = {
//   BASE_URL: 'http://localhost:3000/api/v1',
//   MESSAGE_CLASSES: {
//     MESSAGE: 'message',
//     USER: 'user',
//     OTHER: 'other',
//     SYSTEM: 'system'
//   },
//   CHAT_ROW_CLASS: 'chatRow',
//   ACTIVE_CLASS: 'active',
//   TYPING_TIMEOUT: 3000, // 3 seconds
//   MAX_MESSAGE_LENGTH: 1000,
//   SCROLL_BEHAVIOR: 'smooth' as ScrollBehavior
// } as const;

// /**
//  * Chat Messages Manager Class
//  */
// class ChatMessages {
//   private currentChatId: string | number | null = null;
//   private currentUserId: string | number | null = null;
//   private isTyping: boolean = false;
//   private typingTimeout: NodeJS.Timeout | null = null;
//   private messageCache: Map<string | number, Message[]> = new Map();

//   // DOM Elements
//   private messageBox: HTMLElement | null = null;
//   private input: HTMLInputElement | null = null;
//   private sendBtn: HTMLButtonElement | null = null;

//   constructor() {
//     this.initializeDOMElements();
//     this.setupEventListeners();
//     this.setupSocketHandlers();
//     this.setupPageExitHandler();
//   }

//   /**
//    * Initialize DOM elements with error checking
//    */
//   private initializeDOMElements(): void {
//     this.messageBox = document.getElementById('messages');
//     this.input = document.getElementById('messageInput') as HTMLInputElement;
//     this.sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;

//     if (!this.messageBox) {
//       console.error('ChatMessages: Message container not found');
//     }
//     if (!this.input) {
//       console.error('ChatMessages: Message input not found');
//     }
//     if (!this.sendBtn) {
//       console.error('ChatMessages: Send button not found');
//     }
//   }

//   /**
//    * Setup event listeners
//    */
//   private setupEventListeners(): void {
//     // Send button click handler
//     this.sendBtn?.addEventListener('click', this.handleSendMessage.bind(this));

//     // Input enter key handler
//     this.input?.addEventListener('keypress', (e: KeyboardEvent) => {
//       if (e.key === 'Enter' && !e.shiftKey) {
//         e.preventDefault();
//         this.handleSendMessage();
//       }
//     });

//     // Typing indicator handler
//     this.input?.addEventListener('input', this.handleTyping.bind(this));

//     // Focus handler to mark messages as read
//     this.input?.addEventListener('focus', this.markMessagesAsRead.bind(this));
//   }

//   /**
//    * Setup Socket.IO event handlers
//    */
//   private setupSocketHandlers(): void {
//     if (!window.chatSocket) {
//       console.warn('ChatMessages: Socket not available');
//       return;
//     }

//     // New message handler
//     window.chatSocket.on('newMessage', this.handleNewMessage.bind(this));

//     // Typing indicator handler
//     window.chatSocket.on('userTyping', this.handleUserTyping.bind(this));

//     // Message read handler
//     window.chatSocket.on('messageRead', this.handleMessageRead.bind(this));
//   }

//   /**
//    * Setup page exit handler
//    */
//   private setupPageExitHandler(): void {
//     window.addEventListener('beforeunload', () => {
//       this.leaveCurrentRoom();
//     });

//     // Also handle visibility change for mobile
//     document.addEventListener('visibilitychange', () => {
//       if (document.hidden) {
//         this.stopTyping();
//       }
//     });
//   }

//   /**
//    * Handle sending a message
//    */
//   private async handleSendMessage(): Promise<void> {
//     if (!this.input || !this.currentChatId) return;

//     const content = this.input.value.trim();
//     if (!content) return;

//     // Validate message length
//     if (content.length > CONFIG.MAX_MESSAGE_LENGTH) {
//       this.showError(`Message too long. Maximum ${CONFIG.MAX_MESSAGE_LENGTH} characters allowed.`);
//       return;
//     }

//     const sendToChatId = this.currentChatId;
    
//     try {
//       // Disable input while sending
//       this.setInputState(false);
      
//       const response = await window.fetchWithAutoRefresh(`${window.baseURL}/messages`, {
//         method: 'POST',
//         headers: { 
//           'Content-Type': 'application/json' 
//         },
//         credentials: 'include',
//         body: JSON.stringify({ 
//           chatId: sendToChatId, 
//           content 
//         }),
//       });

//       if (!response.ok) {
//         throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
//       }

//       // Clear input on success
//       this.input.value = '';
//       this.stopTyping();
      
//       // Focus back to input
//       this.input.focus();

//     } catch (error) {
//       console.error('Error sending message:', error);
//       this.showError('Failed to send message. Please try again.');
//     } finally {
//       this.setInputState(true);
//     }
//   }

//   /**
//    * Handle typing indicator
//    */
//   private handleTyping(): void {
//     if (!this.currentChatId || !window.chatSocket) return;

//     if (!this.isTyping) {
//       this.isTyping = true;
//       window.chatSocket.emit('userTyping', {
//         chatId: this.currentChatId,
//         isTyping: true
//       });
//     }

//     // Clear existing timeout
//     if (this.typingTimeout) {
//       clearTimeout(this.typingTimeout);
//     }

//     // Set new timeout
//     this.typingTimeout = setTimeout(() => {
//       this.stopTyping();
//     }, CONFIG.TYPING_TIMEOUT);
//   }

//   /**
//    * Stop typing indicator
//    */
//   private stopTyping(): void {
//     if (this.isTyping && this.currentChatId && window.chatSocket) {
//       this.isTyping = false;
//       window.chatSocket.emit('userTyping', {
//         chatId: this.currentChatId,
//         isTyping: false
//       });
//     }

//     if (this.typingTimeout) {
//       clearTimeout(this.typingTimeout);
//       this.typingTimeout = null;
//     }
//   }

//   /**
//    * Handle new message from socket
//    */
//   private handleNewMessage(message: Message): void {
//     if (message.chat_id === this.currentChatId) {
//       this.appendMessage(message);
      
//       // Mark as read if window is focused
//       if (!document.hidden) {
//         this.markMessagesAsRead();
//       }
//     }

//     // Update chat list order
//     window.chatUI?.debouncedReloadChats();
//   }

//   /**
//    * Handle user typing indicator
//    */
//   private handleUserTyping(data: { chatId: string | number; userId: string | number; isTyping: boolean }): void {
//     if (data.chatId === this.currentChatId && data.userId !== this.currentUserId) {
//       this.showTypingIndicator(data.isTyping);
//     }
//   }

//   /**
//    * Handle message read confirmation
//    */
//   private handleMessageRead(data: { chatId: string | number; userId: string | number }): void {
//     if (data.chatId === this.currentChatId) {
//       this.updateMessageReadStatus(data.userId);
//     }
//   }

//   /**
//    * Append message to chat
//    */
//   public async appendMessage(message: Message): Promise<void> {
//     if (!this.messageBox) return;

//     const messageElement = this.createMessageElement(message);
//     this.messageBox.appendChild(messageElement);
    
//     // Add to cache
//     this.addMessageToCache(message);
    
//     // Scroll to bottom
//     this.scrollToBottom();

//     // Add entrance animation
//     requestAnimationFrame(() => {
//       messageElement.classList.add('message-entered');
//     });
//   }

//   /**
//    * Create message element
//    */
//   private createMessageElement(message: Message): HTMLElement {
//     const div = document.createElement('div');
    
//     // Set classes
//     div.classList.add(CONFIG.MESSAGE_CLASSES.MESSAGE);
//     div.classList.add(
//       message.sender_id === this.currentUserId 
//         ? CONFIG.MESSAGE_CLASSES.USER 
//         : CONFIG.MESSAGE_CLASSES.OTHER
//     );

//     if (message.message_type === 'system') {
//       div.classList.add(CONFIG.MESSAGE_CLASSES.SYSTEM);
//     }

//     // Set content
//     div.textContent = message.content;
    
//     // Set attributes for accessibility and functionality
//     div.setAttribute('data-message-id', message.id.toString());
//     div.setAttribute('data-sender-id', message.sender_id.toString());
//     div.setAttribute('role', 'article');
//     div.setAttribute('aria-label', 
//       `Message from ${message.sender_id === this.currentUserId ? 'you' : 'contact'}: ${message.content}`
//     );

//     // Add timestamp
//     if (message.created_at) {
//       const timestamp = this.createTimestampElement(message.created_at);
//       div.appendChild(timestamp);
//     }

//     return div;
//   }

//   /**
//    * Create timestamp element
//    */
//   private createTimestampElement(timestamp: string): HTMLElement {
//     const timeElement = document.createElement('time');
//     const date = new Date(timestamp);
    
//     timeElement.className = 'message-timestamp';
//     timeElement.dateTime = timestamp;
//     timeElement.textContent = date.toLocaleTimeString([], { 
//       hour: '2-digit', 
//       minute: '2-digit' 
//     });
//     timeElement.setAttribute('aria-label', `Sent at ${date.toLocaleString()}`);
    
//     return timeElement;
//   }

//   /**
//    * Clear all messages
//    */
//   public clearMessages(): void {
//     if (this.messageBox) {
//       this.messageBox.innerHTML = '';
//     }
    
//     // Clear typing indicator
//     this.hideTypingIndicator();
//   }

//   /**
//    * Join a chat room
//    */
//   public async joinRoom(chatId: string | number): Promise<void> {
//     try {
//       // Get current user if not already set
//       if (this.currentUserId === null) {
//         await this.fetchCurrentUser();
//       }

//       // Leave current room if any
//       this.leaveCurrentRoom();

//       // Set new chat ID
//       this.currentChatId = chatId;

//       // Update UI
//       this.updateChatRowActiveState(chatId);
//       this.clearMessages();

//       // Join socket room
//       if (window.chatSocket) {
//         window.chatSocket.emit('joinRoom', chatId);
//       }

//       // Load message history
//       await this.loadMessageHistory(chatId);

//       // Enable input
//       this.setInputState(true);
//       this.input?.focus();

//     } catch (error) {
//       console.error('Error joining room:', error);
//       this.showError('Failed to join chat. Please try again.');
//     }
//   }

//   /**
//    * Leave current room
//    */
//   private leaveCurrentRoom(): void {
//     if (this.currentChatId !== null && window.chatSocket) {
//       window.chatSocket.emit('leaveRoom', this.currentChatId);
//       this.stopTyping();
//     }
//   }

//   /**
//    * Fetch current user data
//    */
//   private async fetchCurrentUser(): Promise<void> {
//     try {
//       const response = await window.fetchWithAutoRefresh(`${window.baseURL}/users/showUser`, {
//         credentials: 'include'
//       });
      
//       if (!response.ok) {
//         throw new Error(`Failed to fetch user: ${response.status}`);
//       }
      
//       const userData: UserResponse = await response.json();
//       this.currentUserId = userData.user.user.id;
      
//     } catch (error) {
//       console.error('Error fetching current user:', error);
//       throw error;
//     }
//   }

//   /**
//    * Load message history
//    */
//   private async loadMessageHistory(chatId: string | number): Promise<void> {
//     try {
//       // Check cache first
//       const cachedMessages = this.messageCache.get(chatId);
//       if (cachedMessages) {
//         for (const message of cachedMessages) {
//           await this.appendMessage(message);
//         }
//         return;
//       }

//       // Fetch from server
//       const response = await window.fetchWithAutoRefresh(
//         `${window.baseURL}/chats/${chatId}/messages`,
//         { credentials: 'include' }
//       );

//       if (!response.ok) {
//         throw new Error(`Failed to load messages: ${response.status}`);
//       }

//       const messages: Message[] = await response.json();
      
//       // Cache messages
//       this.messageCache.set(chatId, messages);
      
//       // Append messages
//       for (const message of messages) {
//         await this.appendMessage(message);
//       }

//     } catch (error) {
//       console.error('Error loading message history:', error);
//       this.showError('Failed to load message history.');
//     }
//   }

//   /**
//    * Update chat row active state
//    */
//   private updateChatRowActiveState(chatId: string | number): void {
//     // Remove active class from all chat rows
//     document.querySelectorAll(`.${CONFIG.CHAT_ROW_CLASS}`).forEach((row) => {
//       row.classList.remove(CONFIG.ACTIVE_CLASS);
//     });

//     // Add active class to current chat row
//     const activeRow = document.querySelector(
//       `.${CONFIG.CHAT_ROW_CLASS}[data-chat-id="${chatId}"]`
//     ) as ChatRow;
    
//     if (activeRow) {
//       activeRow.classList.add(CONFIG.ACTIVE_CLASS);
//       activeRow.setAttribute('aria-current', 'true');
//     }
//   }

//   /**
//    * Add message to cache
//    */
//   private addMessageToCache(message: Message): void {
//     if (!this.currentChatId) return;
    
//     const cached = this.messageCache.get(this.currentChatId) || [];
//     cached.push(message);
//     this.messageCache.set(this.currentChatId, cached);
//   }

//   /**
//    * Mark messages as read
//    */
//   private async markMessagesAsRead(): Promise<void> {
//     if (!this.currentChatId || !window.chatSocket) return;
    
//     try {
//       await window.fetchWithAutoRefresh(
//         `${window.baseURL}/chats/${this.currentChatId}/read`,
//         {
//           method: 'POST',
//           credentials: 'include'
//         }
//       );
//     } catch (error) {
//       console.error('Error marking messages as read:', error);
//     }
//   }

//   /**
//    * Show typing indicator
//    */
//   private showTypingIndicator(isTyping: boolean): void {
//     const existingIndicator = this.messageBox?.querySelector('.typing-indicator');
    
//     if (isTyping && !existingIndicator) {
//       const indicator = document.createElement('div');
//       indicator.className = 'typing-indicator';
//       indicator.innerHTML = `
//         <div class="typing-dots">
//           <span></span><span></span><span></span>
//         </div>
//         <span class="typing-text">Someone is typing...</span>
//       `;
//       indicator.setAttribute('aria-live', 'polite');
//       indicator.setAttribute('aria-label', 'Someone is typing');
      
//       this.messageBox?.appendChild(indicator);
//       this.scrollToBottom();
//     } else if (!isTyping && existingIndicator) {
//       existingIndicator.remove();
//     }
//   }

//   /**
//    * Hide typing indicator
//    */
//   private hideTypingIndicator(): void {
//     const indicator = this.messageBox?.querySelector('.typing-indicator');
//     indicator?.remove();
//   }

//   /**
//    * Update message read status
//    */
//   private updateMessageReadStatus(userId: string | number): void {
//     // Add read indicators to messages if needed
//     const messages = this.messageBox?.querySelectorAll('.message.user');
//     messages?.forEach(message => {
//       if (!message.querySelector('.read-indicator')) {
//         const readIndicator = document.createElement('span');
//         readIndicator.className = 'read-indicator';
//         readIndicator.textContent = '✓';
//         readIndicator.setAttribute('aria-label', 'Message read');
//         message.appendChild(readIndicator);
//       }
//     });
//   }

//   /**
//    * Scroll to bottom of message container
//    */
//   private scrollToBottom(): void {
//     if (this.messageBox) {
//       this.messageBox.scrollTop = this.messageBox.scrollHeight;
//     }
//   }

//   /**
//    * Set input state (enabled/disabled)
//    */
//   private setInputState(enabled: boolean): void {
//     if (this.input) {
//       this.input.disabled = !enabled;
//     }
//     if (this.sendBtn) {
//       this.sendBtn.disabled = !enabled;
//     }
//   }

//   /**
//    * Show error message
//    */
//   private showError(message: string): void {
//     console.error('ChatMessages:', message);
    
//     // Show toast notification if available
//     if (window.chatNotifications?.showToast) {
//       window.chatNotifications.showToast(message, 'error');
//     }
//   }

//   /**
//    * Get current chat ID
//    */
//   public getCurrentChatId(): string | number | null {
//     return this.currentChatId;
//   }

//   /**
//    * Set current user ID
//    */
//   public setCurrentUserId(id: string | number): void {
//     this.currentUserId = id;
//   }

//   /**
//    * Get current user ID
//    */
//   public getCurrentUserId(): string | number | null {
//     return this.currentUserId;
//   }

//   /**
//    * Clear message cache
//    */
//   public clearCache(): void {
//     this.messageCache.clear();
//   }

//   /**
//    * Destroy instance and cleanup
//    */
//   public destroy(): void {
//     this.leaveCurrentRoom();
//     this.stopTyping();
//     this.clearCache();
    
//     // Remove event listeners
//     this.sendBtn?.removeEventListener('click', this.handleSendMessage);
//     this.input?.removeEventListener('keypress', this.handleSendMessage);
//     this.input?.removeEventListener('input', this.handleTyping);
//   }
// }

// // Initialize and export
// const chatMessages = new ChatMessages();

// // Make available globally for backward compatibility
// if (typeof window !== 'undefined') {
//   window.chatMessages = chatMessages;
// }

// export default ChatMessages;
// export type { Message, User, ChatUI, ChatSocket };
// export { chatMessages };