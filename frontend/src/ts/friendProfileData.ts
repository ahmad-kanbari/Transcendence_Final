import api from './api';
import app from './app';
import utils from './utils';
import { baseURL } from './constants';
import toastManager from './toastManager';
import router from './router';

interface FriendProfileData {
    id: number;
    username: string;
    email?: string;
    profile_picture?: string;
    created_at: string;
    updated_at: string;
    isOnline?: boolean; // Add online status field
    last_seen?: string; // Add last seen field
    stats?: {
        total_games: number;
        wins: number;
        losses: number;
        win_rate: number;
        regular_matches: number;
        ai_matches: number;
        tournament_matches: number;
        multiplayer_matches: number;
        total_points: number;
        avg_points: number;
        tournaments_won: number;
        longest_streak: number;
    };
}

interface RelationshipStatus {
    type: 'friend' | 'blocked' | 'pending_sent' | 'pending_received' | 'none';
    friendshipId?: string;
}

class FriendProfile {
    private friendId: string | null = null;
    private friendData: FriendProfileData | null = null;
    private relationshipStatus: RelationshipStatus | null = null;
    private initialized: boolean = false;
    private baseURL: string = baseURL;

    constructor() {
        this.init();
    }

     async init(): Promise<void> {
        if (this.initialized) return;

        // Listen for page changes
        document.addEventListener('pageShown', (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail.page === 'friend-profile') {
                this.initializeFriendProfilePage();
            }
        });

        this.initialized = true;
    }

    private initializeFriendProfilePage(): void {
        setTimeout(() => {
            this.getFriendIdFromURL();
            this.setupEventListeners();
            
            if (this.friendId) {
                this.loadFriendProfile();
            } else {
                this.showError('No user ID provided');
            }
        }, 100);
    }

    private getFriendIdFromURL(): void {
        const urlParams = new URLSearchParams(window.location.search);
        this.friendId = urlParams.get('userId');
    }

    private setupEventListeners(): void {
        // Back button
        const backBtn = document.getElementById('backToChatBtn');
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                 e.preventDefault();
                 e.stopPropagation();
                this.goBackToChat()});
        }

        // Action buttons
        const addFriendBtn = document.getElementById('addFriendBtn');
        if (addFriendBtn) {
            addFriendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.sendFriendRequest()});
        }

        const removeFriendBtn = document.getElementById('removeFriendBtn');
        if (removeFriendBtn) {
            removeFriendBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.removeFriend()});
        }

        const chatBtn = document.getElementById('chatBtn');
        if (chatBtn) {
            chatBtn.addEventListener('click', (e) =>{
                e.preventDefault();
                e.stopPropagation();
                this.startChat()});
        }

        const blockBtn = document.getElementById('blockBtn');
        if (blockBtn) {
            blockBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.blockUser()});
        }

        const unblockBtn = document.getElementById('unblockBtn');
        if (unblockBtn) {
            unblockBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.unblockUser()});
        }

        // Stats and history buttons
        const detailedStatsBtn = document.getElementById('showFriendDetailedStatsBtn');
        if (detailedStatsBtn) {
            detailedStatsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.showDetailedStats()});
        }

        const matchHistoryBtn = document.getElementById('showFriendMatchHistoryBtn');
        if (matchHistoryBtn) {
            matchHistoryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.showMatchHistory()});
        }

        // Close modal buttons
        const closeDetailedStatsBtn = document.getElementById('closeFriendDetailedStatsBtn');
        if (closeDetailedStatsBtn) {
            closeDetailedStatsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const modal = document.getElementById('friendDetailedStatsModal');
                if (modal) modal.classList.add('hidden');
            });
        }

        const closeMatchHistoryBtn = document.getElementById('closeFriendMatchHistoryBtn');
        if (closeMatchHistoryBtn) {
            closeMatchHistoryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const modal = document.getElementById('friendMatchHistoryModal');
                if (modal) modal.classList.add('hidden');
            });
        }
    }

    private async loadFriendProfile(): Promise<void> {
        if (!this.friendId) return;

        try {
            // Load friend's basic data
            const result = await api.getUserById(this.friendId);
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to load friend profile');
            }

            this.friendData = result.data;

            // Load relationship status
            await this.loadRelationshipStatus();

            // Load friend's match history for stats calculation
            const matchHistory = await this.fetchFriendMatchHistory();
            
            // Calculate enhanced stats
            this.calculateFriendStats(matchHistory);

            // Populate the UI
            this.populateProfile();

            // Start online status polling
            this.startOnlineStatusPolling();

        } catch (error) {
            console.error('Error loading friend profile:', error);
            this.showError('Failed to load friend profile');
        }
    }

    private async loadRelationshipStatus(): Promise<void> {
        if (!this.friendId) return;

        try {
            // Check if user is blocked
            const blockedResult = await api.fetchWithAutoRefresh(`${this.baseURL}/users/blocks`, {
                credentials: 'include'
            });

            if (blockedResult.ok) {
                const blockedUsers = await blockedResult.json();
                const isBlocked = blockedUsers.some((user: any) => user.id.toString() === this.friendId);
                
                if (isBlocked) {
                    this.relationshipStatus = { type: 'blocked' };
                    return;
                }
            }

            // Check friendship status
            const friendsResult = await api.getFriendships();
            const isFriend = friendsResult.some((friend: any) => friend.userId.toString() === this.friendId);
            
            if (isFriend) {
                const friendship = friendsResult.find((friend: any) => friend.userId.toString() === this.friendId);
                this.relationshipStatus = { 
                    type: 'friend', 
                    friendshipId: friendship.friendshipId 
                };
                return;
            }

            // Check pending requests
            const pendingReceived = await api.getFriendships('pending', 'received');
            const pendingReceivedRequest = pendingReceived.find((req: any) => req.senderId?.toString() === this.friendId);
            
            if (pendingReceivedRequest) {
                this.relationshipStatus = { 
                    type: 'pending_received', 
                    friendshipId: pendingReceivedRequest.friendshipId 
                };
                return;
            }

            const pendingSent = await api.getFriendships('pending', 'sent');
            const pendingSentRequest = pendingSent.find((req: any) => req.receiverId?.toString() === this.friendId);
            
            if (pendingSentRequest) {
                this.relationshipStatus = { 
                    type: 'pending_sent', 
                    friendshipId: pendingSentRequest.friendshipId 
                };
                return;
            }

            this.relationshipStatus = { type: 'none' };

        } catch (error) {
            console.error('Error loading relationship status:', error);
            this.relationshipStatus = { type: 'none' };
        }
    }

    private async fetchFriendMatchHistory(): Promise<any[]> {
        if (!this.friendId) return [];

        try {
            const response = await api.fetchWithAutoRefresh(
                `${this.baseURL}/users/${this.friendId}/matches`,
                { credentials: 'include' }
            );

            if (!response.ok) return [];

            const matches = await response.json();
            return Array.isArray(matches) ? matches : [];

        } catch (error) {
            console.error('Error fetching friend match history:', error);
            return [];
        }
    }

    private calculateFriendStats(matchHistory: any[]): void {
        if (!this.friendData || !this.friendData.stats) {
            this.friendData!.stats = {
                total_games: 0,
                wins: 0,
                losses: 0,
                win_rate: 0,
                regular_matches: 0,
                ai_matches: 0,
                tournament_matches: 0,
                multiplayer_matches: 0,
                total_points: 0,
                avg_points: 0,
                tournaments_won: 0,
                longest_streak: 0
            };
        }

        const stats = this.friendData!.stats;
        const friendUsername = this.friendData!.username;

        // Reset calculated stats
        stats.total_games = 0;
        stats.wins = 0;
        stats.losses = 0;
        stats.regular_matches = 0;
        stats.ai_matches = 0;
        stats.tournament_matches = 0;
        stats.multiplayer_matches = 0;
        stats.total_points = 0;

        let currentStreak = 0;
        let longestStreak = 0;

        matchHistory.forEach(match => {
            if (match.status === 'cancelled') return;

            stats.total_games++;

            // Determine match type
            switch (match.match_type) {
                case 'tournament':
                    stats.tournament_matches++;
                    break;
                case '1vAi':
                    stats.ai_matches++;
                    break;
                case 'multiplayer':
                    stats.multiplayer_matches++;
                    break;
                default:
                    stats.regular_matches++;
                    break;
            }

            // Determine if friend won
            let friendWon = false;
            let friendScore = 0;

            if (match.match_type === 'multiplayer') {
                const friendTeam = match.teams?.find((team: any) => 
                    team.players?.some((player: any) => player.player_name === friendUsername)
                );
                const opponentTeam = match.teams?.find((team: any) => team.id !== friendTeam?.id);
                
                if (friendTeam && opponentTeam) {
                    friendWon = friendTeam.score > opponentTeam.score;
                    friendScore = friendTeam.score;
                }
            } else {
                const isFriendPlayer1 = match.player1_name === friendUsername;
                friendScore = isFriendPlayer1 ? match.player1_score : match.player2_score;
                const opponentScore = isFriendPlayer1 ? match.player2_score : match.player1_score;
                friendWon = friendScore > opponentScore;
            }

            stats.total_points += friendScore;

            if (friendWon) {
                stats.wins++;
                currentStreak++;
                longestStreak = Math.max(longestStreak, currentStreak);
            } else {
                stats.losses++;
                currentStreak = 0;
            }
        });

        stats.win_rate = stats.total_games > 0 ? Math.round((stats.wins / stats.total_games) * 100) : 0;
        stats.avg_points = stats.total_games > 0 ? Math.round((stats.total_points / stats.total_games) * 100) / 100 : 0;
        stats.longest_streak = longestStreak;

        // Mock tournaments won (would need separate API call)
        stats.tournaments_won = Math.floor(stats.tournament_matches * 0.2);
    }

    private populateProfile(): void {
        if (!this.friendData) return;

        // Basic profile information
        const usernameElement = document.getElementById('friendProfileUsername');
        if (usernameElement) {
            usernameElement.textContent = this.friendData.username;
        }

        const displayNameElement = document.getElementById('friendDisplayName');
        if (displayNameElement) {
            displayNameElement.textContent = this.friendData.username;
        }

        // Profile picture
        const profileImg = document.getElementById('friendProfileAvatar') as HTMLImageElement;
        if (profileImg) {
            profileImg.src = this.friendData.profile_picture || 'src/assets/icons/user.png';
        }

        // Online status
        this.updateOnlineStatus();

        // Member since
        const memberSinceElement = document.getElementById('friendMemberSince');
        if (memberSinceElement) {
            const memberSince = new Date(this.friendData.created_at).toLocaleDateString();
            memberSinceElement.textContent = memberSince;
        }

        // Last seen with online status
        this.updateLastSeenStatus();

        // Stats
        const stats = this.friendData.stats;
        if (stats) {
            const totalGamesElement = document.getElementById('friendStatsTotalGames');
            if (totalGamesElement) {
                totalGamesElement.textContent = stats.total_games.toString();
            }

            const winsElement = document.getElementById('friendStatsWins');
            if (winsElement) {
                winsElement.textContent = stats.wins.toString();
            }

            const lossesElement = document.getElementById('friendStatsLosses');
            if (lossesElement) {
                lossesElement.textContent = stats.losses.toString();
            }

            const winRateElement = document.getElementById('friendStatsWinRate');
            if (winRateElement) {
                winRateElement.textContent = `${stats.win_rate}%`;
            }
        }

        // Update relationship status and action buttons
        this.updateRelationshipDisplay();
    }

    private updateOnlineStatus(): void {
        if (!this.friendData) return;
        
        const isOnline = this.friendData.isOnline || false;
        
        // Update avatar indicator
        const indicator = document.getElementById('onlineStatusIndicator');
        if (indicator) {
            const innerDot = indicator.querySelector('div');
            
            if (isOnline) {
                if (innerDot) {
                    innerDot.className = 'w-3 h-3 rounded-full bg-green-500';
                    innerDot.style.boxShadow = '0 0 10px rgba(76, 175, 80, 0.6)';
                    innerDot.style.animation = 'pulse-green 2s infinite';
                }
                indicator.style.display = 'flex';
            } else {
                if (innerDot) {
                    innerDot.className = 'w-3 h-3 rounded-full bg-gray-500';
                    innerDot.style.boxShadow = 'none';
                    innerDot.style.animation = 'none';
                }
                indicator.style.display = 'flex';
            }
        }
        
        // Update text status
        const statusText = document.getElementById('onlineStatusText');
        const statusLabel = document.getElementById('onlineStatusLabel');
        
        if (statusText && statusLabel) {
            const statusIcon = statusText.querySelector('i');
            
            if (isOnline) {
                statusLabel.textContent = 'Online';
                statusLabel.className = 'text-green-500';
                if (statusIcon) {
                    statusIcon.className = 'bi bi-circle-fill mr-1 text-green-500';
                }
            } else {
                statusLabel.textContent = 'Offline';
                statusLabel.className = 'text-gray-500';
                if (statusIcon) {
                    statusIcon.className = 'bi bi-circle-fill mr-1 text-gray-500';
                }
            }
            
            statusText.style.display = 'block';
        }
    }

    private updateLastSeenStatus(): void {
        if (!this.friendData) return;
        
        const isOnline = this.friendData.isOnline || false;
        const lastSeenElement = document.getElementById('friendLastSeen');
        const lastSeenIcon = document.getElementById('lastSeenIcon');
        
        if (lastSeenElement && lastSeenIcon) {
            if (isOnline) {
                lastSeenElement.textContent = 'Online now';
                lastSeenIcon.className = 'bi bi-circle-fill mr-2 text-green-500';
            } else {
                // Use last_seen field from API if available, otherwise use updated_at
                const lastSeen = this.friendData.last_seen || this.friendData.updated_at;
                if (lastSeen) {
                    const lastSeenDate = new Date(lastSeen);
                    const now = new Date();
                    const diffInHours = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60));
                    
                    let lastSeenText = '';
                    if (diffInHours < 1) {
                        lastSeenText = 'Last seen recently';
                    } else if (diffInHours < 24) {
                        lastSeenText = `Last seen ${diffInHours} hours ago`;
                    } else {
                        const diffInDays = Math.floor(diffInHours / 24);
                        if (diffInDays === 1) {
                            lastSeenText = 'Last seen yesterday';
                        } else if (diffInDays < 7) {
                            lastSeenText = `Last seen ${diffInDays} days ago`;
                        } else {
                            lastSeenText = `Last seen ${lastSeenDate.toLocaleDateString()}`;
                        }
                    }
                    
                    lastSeenElement.textContent = lastSeenText;
                } else {
                    lastSeenElement.textContent = 'Last seen recently';
                }
                
                lastSeenIcon.className = 'bi bi-circle-fill mr-2 text-gray-500';
            }
        }
    }

    // Add method to refresh online status
    private async refreshOnlineStatus(): Promise<void> {
        if (!this.friendId) return;

        try {
            const result = await api.getUserById(this.friendId);
            
            if (result.success && result.data) {
                // Update only the online status
                this.friendData!.isOnline = result.data.isOnline;
                this.friendData!.last_seen = result.data.last_seen || result.data.updated_at;
                
                // Update UI
                this.updateOnlineStatus();
                this.updateLastSeenStatus();
            }
        } catch (error) {
            console.error('Error refreshing online status:', error);
        }
    }

    // Add method to start periodic online status checks
    private startOnlineStatusPolling(): void {
        // Poll every 30 seconds for online status
        setInterval(() => {
            this.refreshOnlineStatus();
        }, 30000);
    }

    private updateRelationshipDisplay(): void {
        if (!this.relationshipStatus) return;

        const statusElement = document.getElementById('relationshipStatus');
        const addBtn = document.getElementById('addFriendBtn');
        const removeBtn = document.getElementById('removeFriendBtn');
        const chatBtn = document.getElementById('chatBtn');
        const blockBtn = document.getElementById('blockBtn');
        const unblockBtn = document.getElementById('unblockBtn');

        // Hide all buttons first
        [addBtn, removeBtn, chatBtn, blockBtn, unblockBtn].forEach(btn => {
            if (btn) btn.style.display = 'none';
        });

        // Update based on relationship status
        switch (this.relationshipStatus.type) {
            case 'friend':
                if (statusElement) {
                    statusElement.textContent = 'Friend';
                    statusElement.className = 'relationship-status status-friend';
                }
                if (removeBtn) removeBtn.style.display = 'inline-block';
                if (chatBtn) chatBtn.style.display = 'inline-block';
                if (blockBtn) blockBtn.style.display = 'inline-block';
                break;

            case 'blocked':
                if (statusElement) {
                    statusElement.textContent = 'Blocked';
                    statusElement.className = 'relationship-status status-blocked';
                }
                if (unblockBtn) unblockBtn.style.display = 'inline-block';
                break;

            case 'pending_sent':
                if (statusElement) {
                    statusElement.textContent = 'Request Sent';
                    statusElement.className = 'relationship-status status-pending';
                }
                if (blockBtn) blockBtn.style.display = 'inline-block';
                break;

            case 'pending_received':
                if (statusElement) {
                    statusElement.textContent = 'Request Received';
                    statusElement.className = 'relationship-status status-pending';
                }
                // Show accept/reject buttons (you can add these to the HTML)
                if (blockBtn) blockBtn.style.display = 'inline-block';
                break;

            default:
                if (statusElement) {
                    statusElement.textContent = 'No Relationship';
                    statusElement.className = 'relationship-status status-none';
                }
                if (addBtn) addBtn.style.display = 'inline-block';
                if (chatBtn) chatBtn.style.display = 'inline-block';
                if (blockBtn) blockBtn.style.display = 'inline-block';
                break;
        }
    }

    // Action methods
    private async sendFriendRequest(): Promise<void> {
        if (!this.friendId) return;

        try {
            const result = await api.sendFriendRequest(this.friendId);
            
            if (result.ok) {
                toastManager.success(app.getUsername(), 'Friend request sent successfully!');
                this.relationshipStatus = { type: 'pending_sent' };
                this.updateRelationshipDisplay();
            } else {
                const errorText = await result.text();
                toastManager.error(app.getUsername(), errorText || 'Failed to send friend request');
            }
        } catch (error) {
            console.error('Error sending friend request:', error);
            toastManager.error(app.getUsername(), 'Failed to send friend request');
        }
    }

    private async removeFriend(): Promise<void> {
        if (!this.friendData || !this.relationshipStatus?.friendshipId) return;

        if (!confirm(`Are you sure you want to remove ${this.friendData.username} as a friend?`)) {
            return;
        }

        try {
            const result = await api.deleteFriendship(this.relationshipStatus.friendshipId);
            
            if (result.ok) {
                toastManager.success(app.getUsername(), 'Friend removed successfully!');
                this.relationshipStatus = { type: 'none' };
                this.updateRelationshipDisplay();
            } else {
                const errorText = await result.text();
                toastManager.error(app.getUsername(), errorText || 'Failed to remove friend');
            }
        } catch (error) {
            console.error('Error removing friend:', error);
            toastManager.error(app.getUsername(), 'Failed to remove friend');
        }
    }

    private async startChat(): Promise<void> {
        if (!this.friendId || !this.friendData) return;

        try {
            toastManager.info(app.getUsername(), `Starting chat with ${this.friendData.username}...`);

            // Check if chat exists
            const existingChatRes = await api.fetchWithAutoRefresh(
                `${this.baseURL}/chats/between/${this.friendId}`,
                { credentials: 'include' }
            );

            let chatId;
            if (existingChatRes.ok) {
                const existingChat = await existingChatRes.json();
                chatId = existingChat.chat_id;
            } else if (existingChatRes.status === 404) {
                // Create new chat
                const createChatRes = await api.fetchWithAutoRefresh(`${this.baseURL}/chats`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ user2Id: this.friendId })
                });

                if (!createChatRes.ok) {
                    throw new Error('Failed to create chat');
                }

                const newChat = await createChatRes.json();
                chatId = newChat.chat_id;

            } else {
                throw new Error('Failed to get chat information');
            }

            // Redirect to chat with the specific chat ID
            // window.location.href = `chat.html?chatId=${chatId}`;
            if (chatId) {
                router.navigate(`/chat?chatId=${chatId}`);
            }
            
        } catch (error) {
            console.error('Error starting chat:', error);
            toastManager.error(app.getUsername(), 'Failed to start chat');
        }
    }

    private async blockUser(): Promise<void> {
        if (!this.friendId || !this.friendData) return;

        if (!confirm(`Are you sure you want to block ${this.friendData.username}?`)) {
            return;
        }

        try {
            const response = await api.fetchWithAutoRefresh(`${this.baseURL}/users/blocks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ blockRecipientId: this.friendId })
            });

            if (response.ok) {
                toastManager.success(app.getUsername(), 'User blocked successfully!');
                this.relationshipStatus = { type: 'blocked' };
                this.updateRelationshipDisplay();
            } else {
                const errorText = await response.text();
                toastManager.error(app.getUsername(), errorText || 'Failed to block user');
            }
        } catch (error) {
            console.error('Error blocking user:', error);
            toastManager.error(app.getUsername(), 'Failed to block user');
        }
    }

    private async unblockUser(): Promise<void> {
        if (!this.friendId || !this.friendData) return;

        if (!confirm(`Are you sure you want to unblock ${this.friendData.username}?`)) {
            return;
        }

        try {
            const response = await api.fetchWithAutoRefresh(`${this.baseURL}/users/blocks/${this.friendId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                toastManager.success(app.getUsername(), 'User unblocked successfully!');
                this.relationshipStatus = { type: 'none' };
                this.updateRelationshipDisplay();
            } else {
                const errorText = await response.text();
                toastManager.error(app.getUsername(), errorText || 'Failed to unblock user');
            }
        } catch (error) {
            console.error('Error unblocking user:', error);
            toastManager.error(app.getUsername(), 'Failed to unblock user');
        }
    }

    private showDetailedStats(): void {
        const modal = document.getElementById('friendDetailedStatsModal');
        const content = document.getElementById('friendDetailedStatsContent');
        
        if (!modal || !content || !this.friendData?.stats) return;

        const stats = this.friendData.stats;
        
        content.innerHTML = `
            <div class="cyber-container">
                <h6 class="font-cyber text-cyber-blue text-lg mb-4">🎮 MATCH TYPES</h6>
                <div class="space-y-3">
                    <div class="flex justify-between items-center p-3 bg-cyber-dark rounded">
                        <span class="text-white font-cyber">AI Matches</span>
                        <span class="text-cyber-pink font-cyber text-xl">${stats.ai_matches}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-cyber-dark rounded">
                        <span class="text-white font-cyber">Tournament Matches</span>
                        <span class="text-purple-400 font-cyber text-xl">${stats.tournament_matches}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-cyber-dark rounded">
                        <span class="text-white font-cyber">Multiplayer Matches</span>
                        <span class="text-yellow-400 font-cyber text-xl">${stats.multiplayer_matches}</span>
                    </div>
                </div>
            </div>
            
            <div class="cyber-container">
                <h6 class="font-cyber text-cyber-green text-lg mb-4">📊 PERFORMANCE</h6>
                <div class="space-y-3">
                    <div class="flex justify-between items-center p-3 bg-cyber-dark rounded">
                        <span class="text-white font-cyber">Total Points Scored</span>
                        <span class="text-cyber-green font-cyber text-xl">${stats.total_points}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-cyber-dark rounded">
                        <span class="text-white font-cyber">Average Points/Game</span>
                        <span class="text-cyber-blue font-cyber text-xl">${stats.avg_points}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-cyber-dark rounded">
                        <span class="text-white font-cyber">Win Rate</span>
                        <span class="text-cyber-green font-cyber text-xl">${stats.win_rate}%</span>
                    </div>
                </div>
            </div>
            
            <div class="cyber-container">
                <h6 class="font-cyber text-cyber-pink text-lg mb-4">🏆 ACHIEVEMENTS</h6>
                <div class="space-y-3">
                    <div class="flex justify-between items-center p-3 bg-cyber-dark rounded">
                        <span class="text-white font-cyber">Tournaments Won</span>
                        <span class="text-cyber-green font-cyber text-xl">${stats.tournaments_won}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-cyber-dark rounded">
                        <span class="text-white font-cyber">Longest Win Streak</span>
                        <span class="text-cyber-blue font-cyber text-xl">${stats.longest_streak}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-cyber-dark rounded">
                        <span class="text-white font-cyber">Total Wins</span>
                        <span class="text-cyber-green font-cyber text-xl">${stats.wins}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-cyber-dark rounded">
                        <span class="text-white font-cyber">Total Losses</span>
                        <span class="text-cyber-pink font-cyber text-xl">${stats.losses}</span>
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
    }

    private async showMatchHistory(): Promise<void> {
        const modal = document.getElementById('friendMatchHistoryModal');
        const tbody = document.getElementById('friendMatchHistoryTable');
        
        if (!modal || !tbody) return;

        try {
            const matches = await this.fetchFriendMatchHistory();
            
            tbody.innerHTML = '';
            
            if (matches.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-gray-400">No match history available</td></tr>';
            } else {
                matches.forEach(match => {
                    const tr = document.createElement('tr');
                    
                    // Determine if friend won
                    let friendWon = false;
                    let opponent = '';
                    let score = '';
                    
                    if (match.match_type === 'multiplayer') {
                        const friendTeam = match.teams?.find((team: any) => 
                            team.players?.some((player: any) => player.player_name === this.friendData!.username)
                        );
                        const opponentTeam = match.teams?.find((team: any) => team.id !== friendTeam?.id);
                        
                        if (friendTeam && opponentTeam) {
                            friendWon = friendTeam.score > opponentTeam.score;
                            opponent = opponentTeam.name || 'Team';
                            score = `${friendTeam.score} - ${opponentTeam.score}`;
                        }
                    } else {
                        const isFriendPlayer1 = match.player1_name === this.friendData!.username;
                        const friendScore = isFriendPlayer1 ? match.player1_score : match.player2_score;
                        const opponentScore = isFriendPlayer1 ? match.player2_score : match.player1_score;
                        
                        friendWon = friendScore > opponentScore;
                        opponent = isFriendPlayer1 ? match.player2_name : match.player1_name;
                        score = `${match.player1_score || 0} - ${match.player2_score || 0}`;
                    }
                    
                    if (friendWon) {
                        tr.classList.add('match-win');
                    } else {
                        tr.classList.add('match-loss');
                    }
                    
                    const matchType = match.match_type === 'tournament' ? 'Tournament' :
                                   match.match_type === '1vAi' ? 'vs AI' :
                                   match.match_type === 'multiplayer' ? 'Multiplayer' : '1v1';
                    
                    const result = friendWon ? '🏆 Win' : '❌ Loss';
                    
                    tr.innerHTML = `
                        <td class="px-4 py-3 text-sm">${new Date(match.created_at).toLocaleDateString()}</td>
                        <td class="px-4 py-3">${matchType}</td>
                        <td class="px-4 py-3">${match.player1_name}</td>
                        <td class="px-4 py-3">${opponent}</td>
                        <td class="px-4 py-3">${score}</td>
                        <td class="px-4 py-3">${result}</td>
                        <td class="px-4 py-3">${match.status}</td>
                    `;
                    
                    tbody.appendChild(tr);
                });
            }
            
            modal.classList.remove('hidden');
            
        } catch (error) {
            console.error('Error loading match history:', error);
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-red-400">Error loading match history</td></tr>';
            modal.classList.remove('hidden');
        }
    }

    private goBackToChat(): void {
        router.navigate('/chat');
    }

    private showError(message: string): void {
        toastManager.error(app.getUsername(), message);
    }

    private showSuccess(message: string): void {
        toastManager.success(app.getUsername(), message);
    }

    // Public methods for external access
    public async refreshFriendProfile(): Promise<void> {
        if (this.friendId) {
            await this.loadFriendProfile();
        }
    }

    public getFriendData(): FriendProfileData | null {
        return this.friendData;
    }

    public getRelationshipStatus(): RelationshipStatus | null {
        return this.relationshipStatus;
    }
}

// Create instance and make it globally available
const friendProfile = new FriendProfile();

// Make it globally available for potential external access
(window as any).friendProfile = friendProfile;

export default friendProfile;