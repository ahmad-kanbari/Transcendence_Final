/**
 * Notification Utilities TypeScript Module
 * Handles notification rendering and management with proper types and error handling
 */

// Type definitions
interface NotificationItem {
    id: string | number;
    message: string;
    is_read: boolean | number;
    type?: 'message' | 'friend_request' | 'system' | 'general';
    chat_id?: string | number;
    created_at?: string;
    user_id?: string | number;
    sender_name?: string;
    metadata?: Record<string, any>;
  }
  
  interface NotificationResponse {
    notifications: NotificationItem[];
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
  }
  
  interface ChatNotifications {
    updateMailboxCount: (count: number) => void;
    updateBellCount: (count: number) => void;
    showToast?: (message: string, type?: string) => void;
  }
  
  interface WindowExtensions {
    renderNotificationList: typeof NotificationUtils.renderNotificationList;
    baseURL: string;
    chatNotifications: ChatNotifications;
    fetchWithAutoRefresh: (url: string, options?: RequestInit) => Promise<Response>;
  }
  
  // Extend Window interface
  declare global {
    interface Window extends WindowExtensions {}
  }
  
  // Configuration constants
  const CONFIG = {
    BASE_URL: 'http://localhost:3000/api/v1',
    PAGINATION: {
      DEFAULT_PAGE: 1,
      DEFAULT_LIMIT: 5,
    },
    STYLES: {
      READ_BACKGROUND: '#ffffff',
      UNREAD_BACKGROUND: '#e0f7ff',
      HOVER_READ_BACKGROUND: '#f5f5f5',
      HOVER_UNREAD_BACKGROUND: '#b3e5fc',
      BORDER_COLOR: '#e1e5e9',
      BORDER_RADIUS: '0.5rem',
      PADDING: '0.75rem 1rem',
      MARGIN_BOTTOM: '0.5rem',
      TRANSITION: 'all 0.3s ease',
    }
  } as const;
  
  /**
   * Notification utilities class
   */
  class NotificationUtils {
    private static readonly baseURL = CONFIG.BASE_URL;
  
    /**
     * Render notification list with proper styling and event handlers
     */
    static renderNotificationList(
      listElement: HTMLElement, 
      notifications: NotificationItem[]
    ): void {
      if (!listElement) {
        console.error('NotificationUtils: List element is required');
        return;
      }
  
      // Clear existing content
      listElement.innerHTML = '';
  
      // Handle empty notifications
      if (!notifications || notifications.length === 0) {
        const emptyItem = this.createEmptyNotificationItem();
        listElement.appendChild(emptyItem);
        return;
      }
  
      // Render each notification
      notifications.forEach((notification) => {
        try {
          const notificationElement = this.createNotificationElement(notification);
          listElement.appendChild(notificationElement);
        } catch (error) {
          console.error('Error creating notification element:', error, notification);
        }
      });
    }
  
    /**
     * Create empty notification list item
     */
    private static createEmptyNotificationItem(): HTMLLIElement {
      const li = document.createElement('li');
      li.textContent = 'No notifications.';
      li.className = 'notification-item notification-empty';
      li.setAttribute('role', 'listitem');
      li.setAttribute('aria-label', 'No notifications available');
      
      // Apply basic styling
      Object.assign(li.style, {
        display: 'block',
        width: '100%',
        padding: CONFIG.STYLES.PADDING,
        marginBottom: CONFIG.STYLES.MARGIN_BOTTOM,
        color: '#6b7280',
        textAlign: 'center',
        fontStyle: 'italic'
      });
  
      return li;
    }
  
    /**
     * Create notification element with styling and event handlers
     */
    private static createNotificationElement(notification: NotificationItem): HTMLLIElement {
      const li = document.createElement('li');
      const isRead = Boolean(notification.is_read);
      
      // Set content and attributes
      li.textContent = notification.message || 'No message content';
      li.className = `notification-item ${isRead ? 'notification-read' : 'notification-unread'}`;
      li.setAttribute('role', 'listitem');
      li.setAttribute('tabindex', '0');
      li.setAttribute('aria-label', `${isRead ? 'Read' : 'Unread'} notification: ${notification.message}`);
      
      if (notification.type) {
        li.setAttribute('data-notification-type', notification.type);
      }
      
      if (notification.id) {
        li.setAttribute('data-notification-id', notification.id.toString());
      }
  
      // Apply initial styling
      this.applyNotificationStyles(li, isRead);
  
      // Add event listeners
      this.attachNotificationEventListeners(li, notification);
  
      return li;
    }
  
    /**
     * Apply styling to notification element
     */
    private static applyNotificationStyles(element: HTMLLIElement, isRead: boolean): void {
      const baseStyles = {
        display: 'block',
        width: '100%',
        padding: CONFIG.STYLES.PADDING,
        marginBottom: CONFIG.STYLES.MARGIN_BOTTOM,
        border: `1px solid ${CONFIG.STYLES.BORDER_COLOR}`,
        borderRadius: CONFIG.STYLES.BORDER_RADIUS,
        cursor: 'pointer',
        transition: CONFIG.STYLES.TRANSITION,
        backgroundColor: isRead ? CONFIG.STYLES.READ_BACKGROUND : CONFIG.STYLES.UNREAD_BACKGROUND,
        listStyle: 'none',
        outline: 'none'
      };
  
      Object.assign(element.style, baseStyles);
    }
  
    /**
     * Attach event listeners to notification element
     */
    private static attachNotificationEventListeners(
      element: HTMLLIElement, 
      notification: NotificationItem
    ): void {
      // Click handler
      element.addEventListener('click', () => this.handleNotificationClick(notification, element));
      
      // Keyboard handler
      element.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleNotificationClick(notification, element);
        }
      });
  
      // Hover handlers
      element.addEventListener('mouseenter', () => this.handleNotificationHover(element, notification, true));
      element.addEventListener('mouseleave', () => this.handleNotificationHover(element, notification, false));
      
      // Focus handlers for accessibility
      element.addEventListener('focus', () => this.handleNotificationFocus(element, true));
      element.addEventListener('blur', () => this.handleNotificationFocus(element, false));
    }
  
    /**
     * Handle notification click event
     */
    private static async handleNotificationClick(
      notification: NotificationItem, 
      element: HTMLLIElement
    ): Promise<void> {
      try {
        // Handle message type notifications
        if (notification.type === 'message' && notification.chat_id) {
          await this.handleMessageNotificationClick(notification);
          return;
        }
  
        // Handle other notification types
        if (!notification.is_read) {
          await this.markNotificationAsRead(notification, element);
        }
      } catch (error) {
        console.error('Error handling notification click:', error);
        this.showErrorToast('Failed to process notification. Please try again.');
      }
    }
  
    /**
     * Handle message notification click
     */
    private static async handleMessageNotificationClick(notification: NotificationItem): Promise<void> {
      if (!notification.chat_id) return;
  
      try {
        // Mark messages in chat as read
        const markReadResponse = await window.fetchWithAutoRefresh(
          `${this.baseURL}/notifications/messages/by-chat/${notification.chat_id}`,
          {
            method: 'PATCH',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
  
        if (!markReadResponse.ok) {
          throw new Error(`Failed to mark messages as read: ${markReadResponse.status}`);
        }
  
        // Refresh notification list
        await this.refreshNotificationList('messages');
  
        // Navigate to chat
        window.location.href = `chat.html?chatId=${notification.chat_id}`;
      } catch (error) {
        console.error('Error handling message notification:', error);
        throw error;
      }
    }
  
    /**
     * Mark notification as read
     */
    private static async markNotificationAsRead(
      notification: NotificationItem, 
      element: HTMLLIElement
    ): Promise<void> {
      if (!notification.id) return;
  
      try {
        const response = await window.fetchWithAutoRefresh(
          `${this.baseURL}/notifications/others/${notification.id}`,
          {
            method: 'PATCH',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
  
        if (!response.ok) {
          throw new Error(`Failed to mark notification as read: ${response.status}`);
        }
  
        // Update UI
        element.style.backgroundColor = CONFIG.STYLES.READ_BACKGROUND;
        element.classList.remove('notification-unread');
        element.classList.add('notification-read');
        element.setAttribute('aria-label', `Read notification: ${notification.message}`);
        
        // Update notification object
        notification.is_read = true;
  
      } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }
    }
  
    /**
     * Handle notification hover
     */
    private static handleNotificationHover(
      element: HTMLLIElement, 
      notification: NotificationItem, 
      isHovering: boolean
    ): void {
      if (isHovering) {
        element.style.backgroundColor = notification.is_read 
          ? CONFIG.STYLES.HOVER_READ_BACKGROUND 
          : CONFIG.STYLES.HOVER_UNREAD_BACKGROUND;
        element.style.transform = 'translateX(4px)';
      } else {
        element.style.backgroundColor = notification.is_read 
          ? CONFIG.STYLES.READ_BACKGROUND 
          : CONFIG.STYLES.UNREAD_BACKGROUND;
        element.style.transform = 'translateX(0)';
      }
    }
  
    /**
     * Handle notification focus for accessibility
     */
    private static handleNotificationFocus(element: HTMLLIElement, isFocused: boolean): void {
      if (isFocused) {
        element.style.boxShadow = '0 0 0 2px #3b82f6, 0 0 0 4px rgba(59, 130, 246, 0.1)';
        element.style.borderColor = '#3b82f6';
      } else {
        element.style.boxShadow = 'none';
        element.style.borderColor = CONFIG.STYLES.BORDER_COLOR;
      }
    }
  
    /**
     * Refresh notification list
     */
    private static async refreshNotificationList(type: 'messages' | 'general' = 'messages'): Promise<void> {
      try {
        const endpoint = type === 'messages' 
          ? `${this.baseURL}/notifications/messages`
          : `${this.baseURL}/notifications/others`;
          
        const url = `${endpoint}?page=${CONFIG.PAGINATION.DEFAULT_PAGE}&limit=${CONFIG.PAGINATION.DEFAULT_LIMIT}`;
        
        const response = await window.fetchWithAutoRefresh(url, {
          credentials: 'include'
        });
  
        if (response.ok) {
          const data: NotificationItem[] = await response.json();
          const targetElement = type === 'messages' 
            ? document.getElementById('messageNotifications')?.querySelector('ul')
            : document.getElementById('generalNotifications')?.querySelector('ul');
  
          if (targetElement && data) {
            this.renderNotificationList(targetElement, data);
  
            // Update notification count
            const unreadCount = data.filter(n => !n.is_read).length;
            if (type === 'messages') {
              window.chatNotifications?.updateMailboxCount(unreadCount);
            } else {
              window.chatNotifications?.updateBellCount(unreadCount);
            }
          }
        }
      } catch (error) {
        console.error(`Error refreshing ${type} notifications:`, error);
      }
    }
  
    /**
     * Show error toast message
     */
    private static showErrorToast(message: string): void {
      if (window.chatNotifications?.showToast) {
        window.chatNotifications.showToast(message, 'error');
      } else {
        console.error(message);
      }
    }
  
    /**
     * Create notification list container with proper ARIA attributes
     */
    static createNotificationContainer(
      id: string, 
      title: string, 
      emptyMessage: string = 'No notifications'
    ): HTMLElement {
      const container = document.createElement('div');
      container.id = id;
      container.className = 'notification-container';
      container.setAttribute('role', 'region');
      container.setAttribute('aria-label', title);
  
      const titleElement = document.createElement('h3');
      titleElement.textContent = title;
      titleElement.className = 'notification-title';
  
      const list = document.createElement('ul');
      list.className = 'notification-list';
      list.setAttribute('role', 'list');
      list.setAttribute('aria-label', `${title} list`);
  
      container.appendChild(titleElement);
      container.appendChild(list);
  
      return container;
    }
  
    /**
     * Get notification count
     */
    static getNotificationCount(notifications: NotificationItem[]): { total: number; unread: number } {
      if (!notifications || !Array.isArray(notifications)) {
        return { total: 0, unread: 0 };
      }
  
      return {
        total: notifications.length,
        unread: notifications.filter(n => !n.is_read).length
      };
    }
  
    /**
     * Filter notifications by type
     */
    static filterNotificationsByType(
      notifications: NotificationItem[], 
      type: string
    ): NotificationItem[] {
      if (!notifications || !Array.isArray(notifications)) {
        return [];
      }
  
      return notifications.filter(n => n.type === type);
    }
  }
  
  // Global setup and exports
  if (typeof window !== 'undefined') {
    // Make function available globally
    window.renderNotificationList = NotificationUtils.renderNotificationList;
    window.baseURL = CONFIG.BASE_URL;
  
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
      console.log('Notification utilities initialized');
    });
  }
  
  // Export for module usage
  export default NotificationUtils;
  export type { NotificationItem, NotificationResponse, ChatNotifications };
  export { CONFIG as NotificationConfig };