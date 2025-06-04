// import api from './api';
// import components from './components';
// import utils from './utils';

// interface FriendElements {
//     userSearchInput: HTMLInputElement | null;
//     userSearchResults: HTMLElement | null;
//     incomingRequestsList: HTMLElement | null;
//     outgoingRequestsList: HTMLElement | null;
//     friendsList: HTMLElement | null;
//     refreshButton: HTMLElement | null;
// }

// class Friends {
//     private elements: FriendElements = {} as FriendElements;
//     private initialized: boolean = false;

//     constructor() {}

//     init(): void {
//         if (this.initialized) return;

//         // Listen for page changes - you can integrate this into chat or profile pages
//         document.addEventListener('pageShown', (event: Event) => {
//             const customEvent = event as CustomEvent;
//             if (customEvent.detail.page === 'chat') {
//                 // Initialize friends functionality when chat page is shown
//                 setTimeout(() => this.initializeFriendsSection(), 100);
//             }
//         });

//         this.initialized = true;
//     }

//     private initializeFriendsSection(): void {
//         this.getElements();
//         this.setupEventListeners();
//         this.loadFriendData();
//     }

//     private getElements(): void {
//         this.elements = {
//             userSearchInput: document.getElementById('userSearch') as HTMLInputElement,
//             userSearchResults: document.getElementById('userSearchResults'),
//             incomingRequestsList: document.getElementById('incomingRequests'),
//             outgoingRequestsList: document.getElementById('outgoingRequests'),
//             friendsList: document.getElementById('friendsList'),
//             refreshButton: document.getElementById('refreshFriends'),
//         };
//     }

//     private setupEventListeners(): void {
//         // User search (already handled in chat, but we can enhance it)
//         if (this.elements.userSearchInput) {
//             this.elements.userSearchInput.addEventListener('input', () => this.handleUserSearch());
//         }

//         // Refresh button
//         if (this.elements.refreshButton) {
//             this.elements.refreshButton.addEventListener('click', () => this.loadFriendData());
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

//     private async renderUserSearchResults(users: any[]): Promise<void> {
//         if (!this.elements.userSearchResults) return;

//         this.elements.userSearchResults.innerHTML = '';

//         if (users.length === 0) {
//             this.elements.userSearchResults.style.display = 'none';
//             return;
//         }

//     // Make the callback async so we can use await inside
//     await Promise.all(users.map(async user => {
//         const userDiv = document.createElement('div');
//         userDiv.className = 'user-result p-2 cursor-pointer hover:bg-cyber-blue hover:bg-opacity-10 border-b border-cyber-blue flex justify-between items-center';
        
//         const userInfo = document.createElement('span');
//         userInfo.textContent = user.username;
        
//         // Get friend status and show appropriate button
//         const friendStatus = await friends.getFriendStatus(user.id);
        
//         let actionButton;
//         switch (friendStatus) {
//             case 'friend':
//                 actionButton = document.createElement('span');
//                 actionButton.className = 'text-cyber-green text-xs';
//                 actionButton.textContent = '✓ Friend';
//                 break;
//             case 'pending_sent':
//                 actionButton = document.createElement('span');
//                 actionButton.className = 'text-cyber-yellow text-xs';
//                 actionButton.textContent = 'Pending...';
//                 break;
//             case 'pending_received':
//                 actionButton = document.createElement('span');
//                 actionButton.className = 'text-cyber-blue text-xs';
//                 actionButton.textContent = 'Respond to request';
//                 break;
//             default:
//                 actionButton = document.createElement('button');
//                 actionButton.className = 'cyber-btn-sm text-xs px-2 py-1 border border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-cyber-dark';
//                 actionButton.textContent = 'Add Friend';
//                 actionButton.addEventListener('click', (e) => {
//                     e.stopPropagation();
//                     this.sendFriendRequest(user.id);
//                 });
//         }
        
//         userDiv.appendChild(userInfo);
//         userDiv.appendChild(actionButton);
//         this.elements.userSearchResults!.appendChild(userDiv);
//     }));

//     this.elements.userSearchResults.style.display = 'block';


//     }

//     public async sendFriendRequest(userId: string): Promise<void> {
//         try {
//             const result = await api.sendFriendRequest(userId);
            
//             if (result.ok) {
//                 components.showToast('success', 'Friend Request Sent', 'Friend request sent successfully!', 3000);
//                 this.loadFriendData(); // Refresh the lists
                
//                 // Clear search
//                 if (this.elements.userSearchInput && this.elements.userSearchResults) {
//                     this.elements.userSearchInput.value = '';
//                     this.elements.userSearchResults.style.display = 'none';
//                 }
//             } else {
//                 const errorText = await result.text();
//                 components.showToast('error', 'Request Failed', errorText || 'Failed to send friend request', 3000);
//             }
//         } catch (error) {
//             console.error('Error sending friend request:', error);
//             components.showToast('error', 'Request Failed', 'An error occurred while sending the request', 3000);
//         }
//     }

//     public async loadFriendData(): Promise<void> {
//         try {
//             await Promise.all([
//                 this.loadIncomingRequests(),
//                 this.loadOutgoingRequests(),
//                 this.loadFriendsList()
//             ]);
//         } catch (error) {
//             console.error('Error loading friend data:', error);
//             components.showToast('error', 'Load Failed', 'Failed to load friend data', 3000);
//         }
//     }

//     private async loadIncomingRequests(): Promise<void> {
//         if (!this.elements.incomingRequestsList) return;

//         try {
//             const requests = await api.getFriendships('pending', 'received');
//             this.renderIncomingRequests(requests);
//         } catch (error) {
//             console.error('Error loading incoming requests:', error);
//         }
//     }

//     private async loadOutgoingRequests(): Promise<void> {
//         if (!this.elements.outgoingRequestsList) return;

//         try {
//             const requests = await api.getFriendships('pending', 'sent');
//             this.renderOutgoingRequests(requests);
//         } catch (error) {
//             console.error('Error loading outgoing requests:', error);
//         }
//     }

//     private async loadFriendsList(): Promise<void> {
//         if (!this.elements.friendsList) return;

//         try {
//             const friends = await api.getFriendships();
//             this.renderFriendsList(friends);
//         } catch (error) {
//             console.error('Error loading friends list:', error);
//         }
//     }

//     private renderIncomingRequests(requests: any[]): void {
//         if (!this.elements.incomingRequestsList) return;

//         this.elements.incomingRequestsList.innerHTML = '';

//         if (requests.length === 0) {
//             this.elements.incomingRequestsList.innerHTML = '<div class="text-center text-gray-400 py-2">No incoming requests</div>';
//             return;
//         }

//         requests.forEach(request => {
//             const requestDiv = document.createElement('div');
//             requestDiv.className = 'friend-request p-3 border border-cyber-blue rounded mb-2 flex justify-between items-center';
            
//             const userInfo = document.createElement('span');
//             userInfo.textContent = request.senderUsername;
//             userInfo.className = 'text-white';
            
//             const buttonContainer = document.createElement('div');
//             buttonContainer.className = 'flex gap-2';
            
//             const acceptBtn = document.createElement('button');
//             acceptBtn.className = 'cyber-btn-sm text-xs px-2 py-1 border border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-cyber-dark';
//             acceptBtn.textContent = 'Accept';
//             acceptBtn.addEventListener('click', () => this.handleFriendRequest(request.friendshipId, 'accept'));
            
//             const rejectBtn = document.createElement('button');
//             rejectBtn.className = 'cyber-btn-sm text-xs px-2 py-1 border border-cyber-pink text-cyber-pink hover:bg-cyber-pink hover:text-cyber-dark';
//             rejectBtn.textContent = 'Reject';
//             rejectBtn.addEventListener('click', () => this.handleFriendRequest(request.friendshipId, 'reject'));
            
//             buttonContainer.appendChild(acceptBtn);
//             buttonContainer.appendChild(rejectBtn);
            
//             requestDiv.appendChild(userInfo);
//             requestDiv.appendChild(buttonContainer);
            
//             this.elements.incomingRequestsList!.appendChild(requestDiv);
//         });
//     }

//     private renderOutgoingRequests(requests: any[]): void {
//         if (!this.elements.outgoingRequestsList) return;

//         this.elements.outgoingRequestsList.innerHTML = '';

//         if (requests.length === 0) {
//             this.elements.outgoingRequestsList.innerHTML = '<div class="text-center text-gray-400 py-2">No outgoing requests</div>';
//             return;
//         }

//         requests.forEach(request => {
//             const requestDiv = document.createElement('div');
//             requestDiv.className = 'friend-request p-3 border border-cyber-blue rounded mb-2 flex justify-between items-center';
            
//             const userInfo = document.createElement('span');
//             userInfo.textContent = request.senderUsername;
//             userInfo.className = 'text-white';
            
//             const cancelBtn = document.createElement('button');
//             cancelBtn.className = 'cyber-btn-sm text-xs px-2 py-1 border border-cyber-pink text-cyber-pink hover:bg-cyber-pink hover:text-cyber-dark';
//             cancelBtn.textContent = 'Cancel';
//             cancelBtn.addEventListener('click', () => this.cancelFriendRequest(request.friendshipId));
            
//             requestDiv.appendChild(userInfo);
//             requestDiv.appendChild(cancelBtn);
            
//             this.elements.outgoingRequestsList!.appendChild(requestDiv);
//         });
//     }

//     private renderFriendsList(friends: any[]): void {
//         if (!this.elements.friendsList) return;

//         this.elements.friendsList.innerHTML = '';

//         if (friends.length === 0) {
//             this.elements.friendsList.innerHTML = '<div class="text-center text-gray-400 py-2">No friends yet</div>';
//             return;
//         }

//         friends.forEach(friend => {
//             const friendDiv = document.createElement('div');
//             friendDiv.className = 'friend-item p-3 border border-cyber-blue rounded mb-2 flex justify-between items-center hover:bg-cyber-blue hover:bg-opacity-10 cursor-pointer';
            
//             const userInfo = document.createElement('span');
//             userInfo.textContent = friend.username;
//             userInfo.className = 'text-white';
            
//             const buttonContainer = document.createElement('div');
//             buttonContainer.className = 'flex gap-2';
            
//             const chatBtn = document.createElement('button');
//             chatBtn.className = 'cyber-btn-sm text-xs px-2 py-1 border border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-cyber-dark';
//             chatBtn.textContent = 'Chat';
//             chatBtn.addEventListener('click', () => this.startChatWithFriend(friend));
            
//             const removeBtn = document.createElement('button');
//             removeBtn.className = 'cyber-btn-sm text-xs px-2 py-1 border border-cyber-pink text-cyber-pink hover:bg-cyber-pink hover:text-cyber-dark';
//             removeBtn.textContent = 'Remove';
//             removeBtn.addEventListener('click', () => this.removeFriend(friend.friendshipId));
            
//             buttonContainer.appendChild(chatBtn);
//             buttonContainer.appendChild(removeBtn);
            
//             friendDiv.appendChild(userInfo);
//             friendDiv.appendChild(buttonContainer);
            
//             this.elements.friendsList!.appendChild(friendDiv);
//         });
//     }

//     private async handleFriendRequest(friendshipId: string, action: 'accept' | 'reject'): Promise<void> {
//         try {
//             const result = await api.updateFriendship(friendshipId, action);
            
//             if (result.ok) {
//                 components.showToast('success', 'Request Updated', `Friend request ${action}ed successfully!`, 3000);
//                 this.loadFriendData();
//             } else {
//                 const errorText = await result.text();
//                 components.showToast('error', 'Update Failed', errorText || `Failed to ${action} friend request`, 3000);
//             }
//         } catch (error) {
//             console.error(`Error ${action}ing friend request:`, error);
//             components.showToast('error', 'Update Failed', 'An error occurred while updating the request', 3000);
//         }
//     }

//     private async cancelFriendRequest(friendshipId: string): Promise<void> {
//         try {
//             const result = await api.deleteFriendship(friendshipId);
            
//             if (result.ok) {
//                 components.showToast('success', 'Request Cancelled', 'Friend request cancelled successfully!', 3000);
//                 this.loadFriendData();
//             } else {
//                 const errorText = await result.text();
//                 components.showToast('error', 'Cancel Failed', errorText || 'Failed to cancel friend request', 3000);
//             }
//         } catch (error) {
//             console.error('Error cancelling friend request:', error);
//             components.showToast('error', 'Cancel Failed', 'An error occurred while cancelling the request', 3000);
//         }
//     }

//     private async removeFriend(friendshipId: string): Promise<void> {
//         // Show confirmation dialog
//         if (!confirm('Are you sure you want to remove this friend?')) {
//             return;
//         }

//         try {
//             const result = await api.deleteFriendship(friendshipId);
            
//             if (result.ok) {
//                 components.showToast('success', 'Friend Removed', 'Friend removed successfully!', 3000);
//                 this.loadFriendData();
//             } else {
//                 const errorText = await result.text();
//                 components.showToast('error', 'Remove Failed', errorText || 'Failed to remove friend', 3000);
//             }
//         } catch (error) {
//             console.error('Error removing friend:', error);
//             components.showToast('error', 'Remove Failed', 'An error occurred while removing the friend', 3000);
//         }
//     }

//     private startChatWithFriend(friend: any): void {
//         // This could navigate to a chat with this specific friend
//         // For now, we'll just show a message
//         components.showToast('info', 'Chat Feature', `Starting chat with ${friend.username}...`, 2000);
        
//         // You could implement chat creation here:
//         // 1. Create a new chat with this friend
//         // 2. Navigate to the chat page with the chat ID
//         // 3. Or switch to an existing chat if one exists
//     }

//     // Public method to get friend status for a user
//     public async getFriendStatus(userId: string): Promise<'friend' | 'pending_sent' | 'pending_received' | 'not_friend' > {
//         try {
//             const [friends, outgoing, incoming] = await Promise.all([
//                 api.getFriendships(),
//                 api.getFriendships('pending', 'sent'),
//                 api.getFriendships('pending', 'received')
//             ]);

//             if (friends.some((f: any) => f.userId === userId)) return 'friend';
//             if (outgoing.some((f: any) => f.receiverId === userId)) return 'pending_sent';
//             if (incoming.some((f: any) => f.senderId === userId)) return 'pending_received';
//             return 'not_friend';
//         } catch (error) {
//             console.error('Error getting friend status:', error);
//             return 'not_friend';
//         }
//     }
// }

// const friends = new Friends();
// export default friends;
