// /**
//  * Notifications TypeScript Module
//  * Handles real-time notifications with Socket.IO integration and proper state management
//  */

// import { Socket } from 'socket.io-client';

// // Type definitions
// interface NotificationItem {
//   id: string | number;
//   message: string;
//   is_read: boolean | number;
//   is_opened: boolean | number;
//   type: 'message' | 'friend_request' | 'system' | 'general';
//   chat_id?: string | number;
//   sender_id?: string | number;
//   sender_name?: string;
//   created_at: string;
//   metadata?: Record<string, any>;
// }

// interface NotificationResponse {
//   notifications: NotificationItem[];
//   total: number;
//   page: number;
//   limit: number;
//   has_more: boolean;
// }

// interface SocketNotificationData {
//   chatId: string | number;
//   username: string;
//   message: string;
//   sender_id?: string | number;
//   notification_id?: string | number;
// }

// interface ChatToast {
//   addToQueue: (username: string, message: string) => void;
//   show?: (message: string, type?: string) => void;
//   clear?: () => void;
// }

// interface NotificationSocket extends Socket {
//   on(event: 'messageReceivedInform', callback: (data: SocketNotificationData) => void): void;
//   on(event: 'friendRequestInform', callback: (data: SocketNotificationData) => void): void;
//   on(event: 'friendRequestAccept', callback: (data: SocketNotificationData) => void): void;
//   on(event: 'notificationRead', callback: (data: { notificationId: string | number }) => void): void;
// }

// interface WindowExtensions {
//   chatNotifications: ChatNotifications;
//   chatSocket: NotificationSocket;
//   chatToast: ChatToast;
//   currentChatId: string | number | null;
//   baseURL: string;
//   fetchWithAutoRefresh: (url: string, options?: RequestInit) => Promise<Response>;
//   renderNotificationList: (container: HTMLElement, notifications: NotificationItem[]) => void;
// }

// // Extend Window interface
// declare global {
//   interface Window extends WindowExtensions {}
// }

// // Configuration
// const CONFIG = {
//   BASE_URL: 'http://localhost:3000/api/v1',
//   PAGINATION: {
//     DEFAULT_PAGE: 1,
//     DEFAULT_LIMIT: 5,
//     MAILBOX_LIMIT: 50
//   },
//   NOTIFICATION_TYPES: {
//     MESSAGE: 'message' as const,
//     FRIEND_REQUEST: 'friend_request' as const,
//     SYSTEM: 'system' as const,
//     GENERAL: 'general' as const
//   },
//   SELECTORS: {
//     BELL_BTN: 'bellBtn',
//     GENERAL_NOTIFICATIONS: 'generalNotifications',
//     MAILBOX_BTN: 'mailboxBtn',
//     MESSAGE_NOTIFICATIONS: 'messageNotifications'
//   },
//   ANIMATION_DURATION: 300
// } as const;

// /**
//  * Chat Notifications Manager Class
//  */
// class ChatNotifications {
//   private notificationCount: number = 0;
//   private mailboxNotificationCount: number = 0;
//   private isInitialized: boolean = false;
//   private notificationCache: Map<string, NotificationItem[]> = new Map();

//   // DOM Elements
//   private bellBtn: HTMLElement | null;
//   private generalNotificationBox: HTMLElement | null;
//   private mailboxBtn: HTMLElement | null;
//   private messageNotificationBox: HTMLElement | null;

//   // State tracking
//   private isGeneralNotificationsVisible: boolean = false;
//   private isMailboxNotificationsVisible: boolean = false;

//   constructor() {
//     this.initializeDOMElements();
//     this.setupEventListeners();
//     this.setupSocketHandlers();
//   }

//   /**
//    * Initialize DOM elements with error checking
//    */
//   private initializeDOMElements(): void {
//     this.bellBtn = document.getElementById(CONFIG.SELECTORS.BELL_BTN);
//     this.generalNotificationBox = document.getElementById(CONFIG.SELECTORS.GENERAL_NOTIFICATIONS);
//     this.mailboxBtn = document.getElementById(CONFIG.SELECTORS.MAILBOX_BTN);
//     this.messageNotificationBox = document.getElementById(CONFIG.SELECTORS.MESSAGE_NOTIFICATIONS);

//     // Log warnings for missing elements
//     if (!this.bellBtn) console.warn('ChatNotifications: Bell button not found');
//     if (!this.generalNotificationBox) console.warn('ChatNotifications: General notification box not found');
//     if (!this.mailboxBtn) console.warn('ChatNotifications: Mailbox button not found');
//     if (!this.messageNotificationBox) console.warn('ChatNotifications: Message notification box not found');
//   }

//   /**
//    * Setup event listeners for notification bells
//    */
//   private setupEventListeners(): void {
//     // Bell button event listener
//     this.bellBtn?.addEventListener('click', this.handleBellClick.bind(this));
    
//     // Mailbox button event listener
//     this.mailboxBtn?.addEventListener('click', this.handleMailboxClick.bind(this));

//     // Click outside to close notifications
//     document.addEventListener('click', this.handleOutsideClick.bind(this));

//     // Keyboard accessibility
//     this.bellBtn?.addEventListener('keydown', this.handleBellKeydown.bind(this));
//     this.mailboxBtn?.addEventListener('keydown', this.handleMailboxKeydown.bind(this));

//     // Window focus/blur for notification management
//     window.addEventListener('focus', this.handleWindowFocus.bind(this));
//     window.addEventListener('blur', this.handleWindowBlur.bind(this));
//   }

//   /**
//    * Setup Socket.IO event handlers
//    */
//   private setupSocketHandlers(): void {
//     if (!window.chatSocket) {
//       console.warn('ChatNotifications: Socket not available');
//       return;
//     }

//     // Message received notification
//     window.chatSocket.on('messageReceivedInform', this.handleMessageReceived.bind(this));

//     // Friend request notification
//     window.chatSocket.on('friendRequestInform', this.handleFriendRequest.bind(this));

//     // Friend request accepted notification
//     window.chatSocket.on('friendRequestAccept', this.handleFriendRequestAccept.bind(this));

//     // Notification read confirmation
//     window.chatSocket.on('notificationRead', this.handleNotificationRead.bind(this));
//   }

//   /**
//    * Initialize notification counters
//    */
//   public async initialize(): Promise<void> {
//     if (this.isInitialized) return;

//     try {
//       await Promise.all([
//         this.initializeNotificationCounter(),
//         this.initializeMailboxNotificationCounter()
//       ]);
      
//       this.isInitialized = true;
//       console.log('ChatNotifications: Initialized successfully');
//     } catch (error) {
//       console.error('ChatNotifications: Initialization failed:', error);
//     }
//   }

//   /**
//    * Initialize general notification counter
//    */
//   private async initializeNotificationCounter(): Promise<void> {
//     try {
//       const { DEFAULT_PAGE, DEFAULT_LIMIT } = CONFIG.PAGINATION;
//       const response = await window.fetchWithAutoRefresh(
//         `${window.baseURL}/notifications/others?page=${DEFAULT_PAGE}&limit=${DEFAULT_LIMIT}`,
//         { credentials: 'include' }
//       );

//       if (!response.ok) {
//         throw new Error(`Failed to fetch notifications: ${response.status}`);
//       }

//       const notifications: NotificationItem[] = await response.json();
//       this.notificationCount = notifications.filter(n => !n.is_opened).length;
//       this.updateBellBadge(this.notificationCount);

//       // Cache notifications
//       this.notificationCache.set('general', notifications);

//     } catch (error) {
//       console.error('Error initializing notification counter:', error);
//     }
//   }

//   /**
//    * Initialize mailbox notification counter
//    */
//   private async initializeMailboxNotificationCounter(): Promise<void> {
//     try {
//       const { DEFAULT_PAGE, DEFAULT_LIMIT } = CONFIG.PAGINATION;
//       const response = await window.fetchWithAutoRefresh(
//         `${window.baseURL}/notifications/messages?page=${DEFAULT_PAGE}&limit=${DEFAULT_LIMIT}`,
//         { credentials: 'include' }
//       );

//       if (!response.ok) {
//         throw new Error(`Failed to fetch mailbox notifications: ${response.status}`);
//       }

//       const notifications: NotificationItem[] = await response.json();
//       this.mailboxNotificationCount = notifications.filter(n => !n.is_read).length;
//       this.updateMailboxBadge(this.mailboxNotificationCount);

//       // Cache notifications
//       this.notificationCache.set('messages', notifications);

//     } catch (error) {
//       console.error('Error initializing mailbox notification counter:', error);
//     }
//   }

//   /**
//    * Handle bell button click
//    */
//   private async handleBellClick(event: Event): Promise<void> {
//     event.stopPropagation();
    
//     try {
//       const wasVisible = this.isGeneralNotificationsVisible;
      
//       // Toggle visibility
//       this.toggleNotificationBox('general', !wasVisible);
      
//       // Close mailbox if open
//       if (!wasVisible) {
//         this.toggleNotificationBox('mailbox', false);
//       }

//       // Mark as opened if showing
//       if (!wasVisible) {
//         await this.markNotificationsAsOpened('general');
//       }

//       // Load and render notifications
//       await this.loadAndRenderNotifications('general');

//     } catch (error) {
//       console.error('Error handling bell click:', error);
//       this.showErrorToast('Failed to load notifications');
//     }
//   }

//   /**
//    * Handle mailbox button click
//    */
//   private async handleMailboxClick(event: Event): Promise<void> {
//     event.stopPropagation();
    
//     try {
//       const wasVisible = this.isMailboxNotificationsVisible;
      
//       // Toggle visibility
//       this.toggleNotificationBox('mailbox', !wasVisible);
      
//       // Close general notifications if open
//       if (!wasVisible) {
//         this.toggleNotificationBox('general', false);
//       }

//       // Mark as opened if showing
//       if (!wasVisible) {
//         await this.markNotificationsAsOpened('mailbox');
//       }

//       // Load and render notifications
//       await this.loadAndRenderNotifications('mailbox');

//     } catch (error) {
//       console.error('Error handling mailbox click:', error);
//       this.showErrorToast('Failed to load notifications');
//     }
//   }

//   /**
//    * Handle clicks outside notification boxes
//    */
//   private handleOutsideClick(event: Event): void {
//     const target = event.target as HTMLElement;
    
//     // Check if click is outside notification areas
//     if (!target.closest(`#${CONFIG.SELECTORS.BELL_BTN}`) && 
//         !target.closest(`#${CONFIG.SELECTORS.GENERAL_NOTIFICATIONS}`)) {
//       this.toggleNotificationBox('general', false);
//     }
    
//     if (!target.closest(`#${CONFIG.SELECTORS.MAILBOX_BTN}`) && 
//         !target.closest(`#${CONFIG.SELECTORS.MESSAGE_NOTIFICATIONS}`)) {
//       this.toggleNotificationBox('mailbox', false);
//     }
//   }

//   /**
//    * Handle keyboard navigation for bell button
//    */
//   private handleBellKeydown(event: KeyboardEvent): void {
//     if (event.key === 'Enter' || event.key === ' ') {
//       event.preventDefault();
//       this.handleBellClick(event);
//     } else if (event.key === 'Escape') {
//       this.toggleNotificationBox('general', false);
//     }
//   }

//   /**
//    * Handle keyboard navigation for mailbox button
//    */
//   private handleMailboxKeydown(event: KeyboardEvent): void {
//     if (event.key === 'Enter' || event.key === ' ') {
//       event.preventDefault();
//       this.handleMailboxClick(event);
//     } else if (event.key === 'Escape') {
//       this.toggleNotificationBox('mailbox', false);
//     }
//   }

//   /**
//    * Handle window focus
//    */
//   private handleWindowFocus(): void {
//     // Refresh counters when window gains focus
//     if (this.isInitialized) {
//       this.refreshNotificationCounters();
//     }
//   }

//   /**
//    * Handle window blur
//    */
//   private handleWindowBlur(): void {
//     // Optional: Pause real-time updates when window loses focus
//   }

//   /**
//    * Handle message received socket event
//    */
//   private async handleMessageReceived(data: SocketNotificationData): Promise<void> {
//     // Don't show notification if user is in the same chat
//     if (window.currentChatId && 
//         window.currentChatId.toString() === data.chatId.toString()) {
//       return;
//     }

//     // Add to toast queue
//     window.chatToast?.addToQueue(data.username, data.message);

//     // Refresh mailbox notifications
//     await this.refreshMailboxNotifications();
//   }

//   /**
//    * Handle friend request socket event
//    */
//   private handleFriendRequest(data: SocketNotificationData): void {
//     this.addGeneralNotification(data.message);
//     this.incrementNotificationCount();
//   }

//   /**
//    * Handle friend request accept socket event
//    */
//   private handleFriendRequestAccept(data: SocketNotificationData): void {
//     this.addGeneralNotification(data.message);
//     this.incrementNotificationCount();
//   }

//   /**
//    * Handle notification read confirmation
//    */
//   private handleNotificationRead(data: { notificationId: string | number }): void {
//     // Update local cache if needed
//     this.removeNotificationFromCache(data.notificationId);
//   }

//   /**
//    * Toggle notification box visibility
//    */
//   private toggleNotificationBox(type: 'general' | 'mailbox', show: boolean): void {
//     const box = type === 'general' ? this.generalNotificationBox : this.messageNotificationBox;
//     const button = type === 'general' ? this.bellBtn : this.mailboxBtn;
    
//     if (!box) return;

//     if (show) {
//       box.style.display = 'block';
//       box.setAttribute('aria-hidden', 'false');
//       button?.setAttribute('aria-expanded', 'true');
      
//       // Add animation class
//       box.classList.add('notification-show');
//     } else {
//       box.style.display = 'none';
//       box.setAttribute('aria-hidden', 'true');
//       button?.setAttribute('aria-expanded', 'false');
      
//       // Remove animation class
//       box.classList.remove('notification-show');
//     }

//     // Update state
//     if (type === 'general') {
//       this.isGeneralNotificationsVisible = show;
//     } else {
//       this.isMailboxNotificationsVisible = show;
//     }
//   }

//   /**
//    * Mark notifications as opened
//    */
//   private async markNotificationsAsOpened(type: 'general' | 'mailbox'): Promise<void> {
//     try {
//       const endpoint = type === 'general' ? 'others' : 'messages';
//       await window.fetchWithAutoRefresh(`${window.baseURL}/notifications/${endpoint}`, {
//         method: 'PATCH',
//         credentials: 'include',
//       });

//       // Reset counter
//       if (type === 'general') {
//         this.notificationCount = 0;
//         this.updateBellBadge(0);
//       }

//     } catch (error) {
//       console.error(`Error marking ${type} notifications as opened:`, error);
//     }
//   }

//   /**
//    * Load and render notifications
//    */
//   private async loadAndRenderNotifications(type: 'general' | 'mailbox'): Promise<void> {
//     try {
//       const { DEFAULT_PAGE, DEFAULT_LIMIT, MAILBOX_LIMIT } = CONFIG.PAGINATION;
//       const endpoint = type === 'general' ? 'others' : 'messages';
//       const limit = type === 'general' ? DEFAULT_LIMIT : MAILBOX_LIMIT;
      
//       const response = await window.fetchWithAutoRefresh(
//         `${window.baseURL}/notifications/${endpoint}?page=${DEFAULT_PAGE}&limit=${limit}`,
//         { credentials: 'include' }
//       );

//       if (response.ok) {
//         const notifications: NotificationItem[] = await response.json();
//         const container = type === 'general' ? this.generalNotificationBox : this.messageNotificationBox;
        
//         if (container && window.renderNotificationList) {
//           window.renderNotificationList(container, notifications);
//         }

//         // Update cache
//         this.notificationCache.set(type === 'general' ? 'general' : 'messages', notifications);
//       }

//     } catch (error) {
//       console.error(`Error loading ${type} notifications:`, error);
//     }
//   }

//   /**
//    * Add general notification
//    */
//   private addGeneralNotification(message: string): void {
//     if (!this.generalNotificationBox) return;

//     // Remove placeholder if exists
//     const placeholder = this.generalNotificationBox.querySelector('em');
//     placeholder?.remove();

//     // Create notification element
//     const div = document.createElement('div');
//     div.classList.add('notification');
//     div.textContent = message;
//     div.setAttribute('role', 'article');
//     div.setAttribute('aria-label', `New notification: ${message}`);

//     // Insert at the beginning
//     if (this.generalNotificationBox.firstChild) {
//       this.generalNotificationBox.insertBefore(div, this.generalNotificationBox.firstChild);
//     } else {
//       this.generalNotificationBox.appendChild(div);
//     }

//     // Add entrance animation
//     requestAnimationFrame(() => {
//       div.classList.add('notification-entered');
//     });
//   }

//   /**
//    * Refresh mailbox notifications
//    */
//   private async refreshMailboxNotifications(): Promise<void> {
//     try {
//       const { DEFAULT_PAGE, MAILBOX_LIMIT } = CONFIG.PAGINATION;
//       const response = await window.fetchWithAutoRefresh(
//         `${window.baseURL}/notifications/messages?page=${DEFAULT_PAGE}&limit=${MAILBOX_LIMIT}`,
//         { credentials: 'include' }
//       );

//       if (response.ok) {
//         const notifications: NotificationItem[] = await response.json();
        
//         // Calculate unique senders count
//         const uniqueSenders = new Set(
//           notifications.filter(n => !n.is_read).map(n => n.sender_id)
//         );
        
//         this.mailboxNotificationCount = uniqueSenders.size;
//         this.updateMailboxBadge(this.mailboxNotificationCount);

//         // Render if visible
//         if (this.isMailboxNotificationsVisible && this.messageNotificationBox && window.renderNotificationList) {
//           window.renderNotificationList(this.messageNotificationBox, notifications);
//         }

//         // Update cache
//         this.notificationCache.set('messages', notifications);
//       }

//     } catch (error) {
//       console.error('Error refreshing mailbox notifications:', error);
//     }
//   }

//   /**
//    * Refresh notification counters
//    */
//   private async refreshNotificationCounters(): Promise<void> {
//     try {
//       await Promise.all([
//         this.initializeNotificationCounter(),
//         this.initializeMailboxNotificationCounter()
//       ]);
//     } catch (error) {
//       console.error('Error refreshing notification counters:', error);
//     }
//   }

//   /**
//    * Increment notification count
//    */
//   private incrementNotificationCount(): void {
//     this.notificationCount++;
//     this.updateBellBadge(this.notificationCount);
//   }

//   /**
//    * Update bell badge
//    */
//   private updateBellBadge(count: number): void {
//     if (this.bellBtn) {
//       this.bellBtn.setAttribute('data-count', count.toString());
//       this.bellBtn.setAttribute('aria-label', `System notifications (${count})`);
//     }
//   }

//   /**
//    * Update mailbox badge
//    */
//   public updateMailboxCount(count: number): void {
//     this.mailboxNotificationCount = count;
//     this.updateMailboxBadge(count);
//   }

//   /**
//    * Update mailbox badge
//    */
//   private updateMailboxBadge(count: number): void {
//     if (this.mailboxBtn) {
//       this.mailboxBtn.setAttribute('data-count', count.toString());
//       this.mailboxBtn.setAttribute('aria-label', `Message notifications (${count})`);
//     }
//   }

//   /**
//    * Remove notification from cache
//    */
//   private removeNotificationFromCache(notificationId: string | number): void {
//     for (const [key, notifications] of this.notificationCache.entries()) {
//       const filtered = notifications.filter(n => n.id !== notificationId);
//       if (filtered.length !== notifications.length) {
//         this.notificationCache.set(key, filtered);
//       }
//     }
//   }

//   /**
//    * Show error toast
//    */
//   private showErrorToast(message: string): void {
//     if (window.chatToast?.show) {
//       window.chatToast.show(message, 'error');
//     } else {
//       console.error('ChatNotifications:', message);
//     }
//   }

//   /**
//    * Get notification counts
//    */
//   public getNotificationCounts(): { general: number; mailbox: number } {
//     return {
//       general: this.notificationCount,
//       mailbox: this.mailboxNotificationCount
//     };
//   }

//   /**
//    * Clear all notifications
//    */
//   public clearAllNotifications(): void {
//     this.notificationCount = 0;
//     this.mailboxNotificationCount = 0;
//     this.updateBellBadge(0);
//     this.updateMailboxBadge(0);
//     this.notificationCache.clear();
//   }

//   /**
//    * Destroy instance and cleanup
//    */
//   public destroy(): void {
//     // Remove event listeners
//     this.bellBtn?.removeEventListener('click', this.handleBellClick);
//     this.mailboxBtn?.removeEventListener('click', this.handleMailboxClick);
//     document.removeEventListener('click', this.handleOutsideClick);
//     window.removeEventListener('focus', this.handleWindowFocus);
//     window.removeEventListener('blur', this.handleWindowBlur);

//     // Clear cache
//     this.notificationCache.clear();

//     // Reset state
//     this.isInitialized = false;
//   }
// }

// // Initialize and export
// const chatNotifications = new ChatNotifications();

// // Make available globally for backward compatibility
// if (typeof window !== 'undefined') {
//   window.chatNotifications = {
//     initialize: () => chatNotifications.initialize(),
//     updateMailboxCount: (count: number) => chatNotifications.updateMailboxCount(count),
//     getNotificationCounts: () => chatNotifications.getNotificationCounts(),
//     clearAllNotifications: () => chatNotifications.clearAllNotifications()
//   };
// }

// export default ChatNotifications;
// export type { NotificationItem, NotificationResponse, SocketNotificationData, ChatToast };
// export { chatNotifications };


// // Initialize notifications
// // await chatNotifications.initialize();

// // // Update mailbox count
// // chatNotifications.updateMailboxCount(5);

// // // Get current counts
// // const { general, mailbox } = chatNotifications.getNotificationCounts();

// // // Clear all notifications
// // chatNotifications.clearAllNotifications();

// // // Cleanup on navigation
// // chatNotifications.destroy();