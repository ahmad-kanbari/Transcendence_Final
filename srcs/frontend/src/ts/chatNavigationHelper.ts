// ChatNavigationHelper.ts
// This should be a separate TypeScript file in your project

import api from './api';
import app from './app';
import toastManager from './toastManager';
import { baseURL } from './constants';
import router from './router';

// Extension for global window object
declare global {
    interface Window {
        chat: any;
        friendProfile: any;
        ChatNavigationHelper: typeof ChatNavigationHelper;
    }
}

/**
 * Navigation helper for chat and friend profile integration
 */
class ChatNavigationHelper {
    
    /**
     * Navigate to friend profile page
     */
    static navigateToFriendProfile(userId: string): void {
        if (!userId) {
            console.error('No user ID provided for navigation');
            return;
        }
        
        // const url = `friend-profile.html?userId=${userId}`;
        // window.location.href = url;
          router.navigate(`/friendProfile?userId=${userId}`);
    }

    /**
     * Create clickable username links in chat messages
     */
    static createClickableUsername(username: string, userId: string): string {
        return `<span class="clickable-username" 
                      data-user-id="${userId}" 
                      style="color: var(--cyber-blue); cursor: pointer; text-decoration: underline;" 
                      onclick="ChatNavigationHelper.navigateToFriendProfile('${userId}')">
                    ${username}
                </span>`;
    }

    /**
     * Add profile link to user search results
     */
    static async enhanceUserSearchResults(users: any[]): Promise<void> {
        const userSearchResults = document.getElementById('userSearchResults');
        if (!userSearchResults) return;

        userSearchResults.innerHTML = '';

        if (users.length === 0) {
            userSearchResults.style.display = 'none';
            return;
        }

        // Load online status for each user
        const usersWithStatus = await Promise.all(
            users.map(async (user: any) => {
                try {
                    const userResult = await api.getUserById(user.id);
                    return {
                        ...user,
                        isOnline: userResult.success ? userResult.data.isOnline : false
                    };
                } catch (error) {
                    console.error(`Error loading status for user ${user.id}:`, error);
                    return { ...user, isOnline: false };
                }
            })
        );

        usersWithStatus.forEach(user => {
            const li = document.createElement('li');
            li.style.cssText = 'padding: 8px; cursor: pointer; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;';
            
            // Online status indicator
            const statusColor = user.isOnline ? '#4CAF50' : '#757575';
            const statusText = user.isOnline ? 'Online' : 'Offline';
            
            li.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="online-status" style="
                        width: 8px; 
                        height: 8px; 
                        border-radius: 50%; 
                        background-color: ${statusColor};
                        ${user.isOnline ? 'box-shadow: 0 0 6px rgba(76, 175, 80, 0.6); animation: pulse-green 2s infinite;' : ''}
                    " title="${statusText}"></div>
                    <span>${user.username}</span>
                    ${user.isOnline ? '<span style="color: #4CAF50; font-size: 10px; margin-left: 5px;">●</span>' : ''}
                </div>
                <div class="user-actions" style="display: flex; gap: 5px; opacity: 0; transition: opacity 0.2s ease;">
                    <button class="mini-btn chat-btn" style="background: var(--cyber-blue); color: white; border: none; padding: 2px 6px; border-radius: 3px; font-size: 10px;">Actions</button>
                    <button class="mini-btn profile-btn" style="background: var(--cyber-green); color: white; border: none; padding: 2px 6px; border-radius: 3px; font-size: 10px;">Profile</button>
                </div>
            `;

            // Add hover effect
            li.addEventListener('mouseenter', () => {
                li.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                const actions = li.querySelector('.user-actions') as HTMLElement;
                if (actions) actions.style.opacity = '1';
            });
            
            li.addEventListener('mouseleave', () => {
                li.style.backgroundColor = 'transparent';
                const actions = li.querySelector('.user-actions') as HTMLElement;
                if (actions) actions.style.opacity = '0';
            });

            // Add click handlers
            const actionsBtn = li.querySelector('.chat-btn');
            const profileBtn = li.querySelector('.profile-btn');

            if (actionsBtn) {
                actionsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (window.chat && window.chat.showPopup) {
                        window.chat.showPopup(user);
                    }
                    userSearchResults.style.display = 'none';
                    const searchInput = document.getElementById('userSearch') as HTMLInputElement;
                    if (searchInput) searchInput.value = '';
                });
            }

            if (profileBtn) {
                profileBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    ChatNavigationHelper.navigateToFriendProfile(user.id);
                    userSearchResults.style.display = 'none';
                    const searchInput = document.getElementById('userSearch') as HTMLInputElement;
                    if (searchInput) searchInput.value = '';
                });
            }

            userSearchResults.appendChild(li);
        });

        userSearchResults.style.display = 'block';
    }

    /**
     * Add profile link to friends list
     */
    static async enhanceFriendsList(friends: any[]): Promise<void> {
        const friendsList = document.getElementById('friendsList');
        if (!friendsList) return;

        friendsList.innerHTML = '';

        if (friends.length === 0) {
            friendsList.innerHTML = `<li style="color: #999;">No friends yet</li>`;
            return;
        }

        // Load online status for each friend
        const friendsWithStatus = await Promise.all(
            friends.map(async (friend: any) => {
                try {
                    const userResult = await api.getUserById(friend.userId);
                    return {
                        ...friend,
                        isOnline: userResult.success ? userResult.data.isOnline : false
                    };
                } catch (error) {
                    console.error(`Error loading status for friend ${friend.userId}:`, error);
                    return { ...friend, isOnline: false };
                }
            })
        );

        friendsWithStatus.forEach((friend: any) => {
            const li = document.createElement('li');
            li.style.cssText = 'padding: 8px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;';
            
            // Online status indicator
            const statusColor = friend.isOnline ? '#4CAF50' : '#757575';
            const statusText = friend.isOnline ? 'Online' : 'Offline';
            
            li.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="online-status" style="
                        width: 8px; 
                        height: 8px; 
                        border-radius: 50%; 
                        background-color: ${statusColor};
                        ${friend.isOnline ? 'box-shadow: 0 0 6px rgba(76, 175, 80, 0.6); animation: pulse-green 2s infinite;' : ''}
                    " title="${statusText}"></div>
                    <span>${friend.username}</span>
                    ${friend.isOnline ? '<span style="color: #4CAF50; font-size: 10px; margin-left: 5px;">●</span>' : ''}
                </div>
                <div style="display: flex; gap: 5px;">
                    <button class="friend-profile-btn" style="padding: 2px 8px; background: var(--cyber-green); border: none; color: white; border-radius: 3px; cursor: pointer; font-size: 10px;">
                        Profile
                    </button>
                    <button class="friend-chat-btn" style="margin-right: 5px; padding: 2px 8px; background: #2196F3; border: none; color: white; border-radius: 3px; cursor: pointer; font-size: 10px;">
                        Chat
                    </button>
                    <button class="friend-remove-btn" style="padding: 2px 8px; background: #f44336; border: none; color: white; border-radius: 3px; cursor: pointer; font-size: 10px;">
                        Remove
                    </button>
                </div>
            `;

            // Add click handlers
            const profileBtn = li.querySelector('.friend-profile-btn');
            const chatBtn = li.querySelector('.friend-chat-btn');
            const removeBtn = li.querySelector('.friend-remove-btn');

            if (profileBtn) {
                profileBtn.addEventListener('click', () => {
                    ChatNavigationHelper.navigateToFriendProfile(friend.userId);
                });
            }

            if (chatBtn) {
                chatBtn.addEventListener('click', () => {
                    if (window.chat && window.chat.startChatWithFriend) {
                        window.chat.startChatWithFriend(friend.userId);
                    }
                });
            }

            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    if (window.chat && window.chat.removeFriend) {
                        window.chat.removeFriend(friend.friendshipId);
                    }
                });
            }

            friendsList.appendChild(li);
        });
    }

    /**
     * Add context menu to chat messages for accessing user profiles
     */
    static addMessageContextMenu(): void {
        document.addEventListener('contextmenu', (e) => {
            const target = e.target as HTMLElement;
            
            // Check if right-clicked on a message
            const messageElement = target.closest('.message');
            if (!messageElement) return;

            // Only show context menu for received messages (not own messages)
            if (messageElement.classList.contains('sent')) return;

            e.preventDefault();

            // Get sender info from message element
            const senderId = messageElement.getAttribute('data-sender-id');
            const senderName = messageElement.getAttribute('data-sender-name');

            if (!senderId || !senderName) return;

            // Remove existing context menu if any
            const existingMenu = document.querySelector('.message-context-menu');
            if (existingMenu) {
                existingMenu.remove();
            }

            // Create context menu
            const contextMenu = document.createElement('div');
            contextMenu.className = 'message-context-menu';
            contextMenu.style.cssText = `
                position: fixed;
                top: ${e.clientY}px;
                left: ${e.clientX}px;
                background: var(--cyber-darker);
                border: 1px solid var(--cyber-blue);
                border-radius: 5px;
                padding: 5px 0;
                z-index: 1000;
                min-width: 150px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
            `;

            // Profile option
            const profileOption = document.createElement('div');
            profileOption.className = 'context-menu-item';
            profileOption.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                font-size: 12px;
                color: var(--cyber-blue);
                transition: background-color 0.2s ease;
            `;
            profileOption.innerHTML = `<i class="bi bi-person-circle mr-2"></i>View ${senderName}'s Profile`;
            profileOption.onclick = () => {
                ChatNavigationHelper.navigateToFriendProfile(senderId);
                document.body.removeChild(contextMenu);
            };

            // Send message option
            const messageOption = document.createElement('div');
            messageOption.className = 'context-menu-item';
            messageOption.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                font-size: 12px;
                color: var(--cyber-green);
                transition: background-color 0.2s ease;
            `;
            messageOption.innerHTML = `<i class="bi bi-chat-dots mr-2"></i>Send Direct Message`;
            messageOption.onclick = () => {
                toastManager.info(app.getUsername(), `Starting direct chat with ${senderName}...`);
                document.body.removeChild(contextMenu);
                
                // You can implement direct message functionality here
                if (window.chat && window.chat.startChatWithFriend) {
                    window.chat.startChatWithFriend(senderId);
                }
            };

            contextMenu.appendChild(profileOption);
            contextMenu.appendChild(messageOption);

            // Add hover effects
            contextMenu.addEventListener('mouseover', (e) => {
                const item = e.target as HTMLElement;
                if (item.classList.contains('context-menu-item')) {
                    item.style.backgroundColor = 'var(--cyber-blue)';
                    item.style.color = 'white';
                }
            });

            contextMenu.addEventListener('mouseout', (e) => {
                const item = e.target as HTMLElement;
                if (item.classList.contains('context-menu-item')) {
                    item.style.backgroundColor = 'transparent';
                    item.style.color = item.innerHTML.includes('Profile') ? 'var(--cyber-blue)' : 'var(--cyber-green)';
                }
            });

            document.body.appendChild(contextMenu);

            // Remove context menu when clicking elsewhere
            const removeContextMenu = () => {
                if (document.body.contains(contextMenu)) {
                    document.body.removeChild(contextMenu);
                }
                document.removeEventListener('click', removeContextMenu);
            };

            setTimeout(() => {
                document.addEventListener('click', removeContextMenu);
            }, 100);
        });
    }

    /**
     * Enhance chat messages with clickable usernames
     */
    static enhanceChatMessage(message: any): string {
        const senderName = message.sender_name || 'Unknown';
        const senderId = message.sender_id;
        const currentUserId = window.chat?.currentUserId;
        
        const isOwnMessage = senderId === currentUserId;
        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        return `
            <div class="message ${isOwnMessage ? 'sent' : 'received'}" 
                 data-sender-id="${senderId}" 
                 data-sender-name="${senderName}">
                ${!isOwnMessage ? `
                    <div class="message-header" style="font-size: 10px; opacity: 0.7; margin-bottom: 2px;">
                        <span class="clickable-username" 
                              data-user-id="${senderId}" 
                              style="color: var(--cyber-blue); cursor: pointer; text-decoration: underline;" 
                              onclick="ChatNavigationHelper.navigateToFriendProfile('${senderId}')">
                            ${senderName}
                        </span>
                    </div>
                ` : ''}
                <div class="message-content">${message.content}</div>
                <div class="message-time" style="font-size: 11px; opacity: 0.7; margin-top: 5px;">
                    ${time}
                </div>
            </div>
        `;
    }

    /**
     * Navigate back to chat from friend profile
     */
    static navigateToChat(chatId?: string): void {
        let route = '/chat';
        if (chatId) {
            route += `?chatId=${chatId}`;
        }
        router.navigate(route);
    }
    

    /**
     * Create chat with user and navigate to it
     */
    static async createChatAndNavigate(userId: string, username: string): Promise<void> {
        try {
            toastManager.info(app.getUsername(), `Creating chat with ${username}...`);
            
            // Check if chat already exists
            let chatId;
            const existingChatRes = await api.fetchWithAutoRefresh(
                `${baseURL}/chats/between/${userId}`,
                { credentials: 'include' }
            );
            
            if (existingChatRes.ok) {
                const existingChat = await existingChatRes.json();
                chatId = existingChat.chat_id;
                toastManager.success(app.getUsername(), `Opening existing chat with ${username}`);
            } else if (existingChatRes.status === 404) {
                // Create new chat
                const createChatRes = await api.fetchWithAutoRefresh(`${baseURL}/chats`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ user2Id: userId })
                });
                
                if (!createChatRes.ok) {
                    throw new Error('Failed to create chat');
                }
                
                const newChat = await createChatRes.json();
                chatId = newChat.chat_id;
                toastManager.success(app.getUsername(), `New chat created with ${username}`);
            } else {
                throw new Error('Failed to check existing chat');
            }
            
           // Navigate within SPA
            // ChatNavigationHelper.navigateToChat(chatId);

            // Navigate within SPA
            ChatNavigationHelper.navigateToChat(chatId);
        } catch (error) {
            console.error('Error creating chat:', error);
            toastManager.error(app.getUsername(), 'Failed to create chat');
        }
    }

    /**
     * Initialize all navigation enhancements
     */
    static initialize(): void {
        // Add message context menu
        ChatNavigationHelper.addMessageContextMenu();
        
        // Add CSS for enhanced elements
        const enhancementCSS = `
            .clickable-username:hover {
                color: var(--cyber-green) !important;
                text-shadow: 0 0 5px var(--cyber-green);
            }
            
            .context-menu-item:hover {
                background: var(--cyber-blue) !important;
                color: white !important;
            }
            
            .mini-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
            }
            
            .user-actions {
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            
            .user-actions button {
                transition: all 0.2s ease;
            }
            
            .user-actions button:hover {
                transform: scale(1.05);
            }
            
            li:hover .user-actions,
            div:hover .user-actions {
                opacity: 1;
            }
            
            .message-header {
                user-select: none;
            }
            
            .message.received {
                position: relative;
            }
            
            .message.received:hover {
                background: rgba(255, 255, 255, 0.05);
            }
            
            @keyframes pulse-green {
                0% {
                    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
                }
                70% {
                    box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
                }
                100% {
                    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
                }
            }
        `;
        
        // Add CSS to document if not already added
        if (!document.getElementById('chat-navigation-styles')) {
            const style = document.createElement('style');
            style.id = 'chat-navigation-styles';
            style.textContent = enhancementCSS;
            document.head.appendChild(style);
        }
    }
}

// Initialize navigation helper when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    ChatNavigationHelper.initialize();
});

// Make ChatNavigationHelper available globally
window.ChatNavigationHelper = ChatNavigationHelper;

export default ChatNavigationHelper;