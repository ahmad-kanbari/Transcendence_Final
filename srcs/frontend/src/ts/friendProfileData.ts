import api from './api';
import app from './app';
import utils from './utils';
import { baseURL, CONFIG } from './constants';
import toastManager from './toastManager';
import router from './router';
import chat from './chat';
import profile from './profile';
import { t } from './localization';

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
        totalGames: number;
        wins: number;
        losses: number;
        cancelledGames: number;
    };
    any: any; // Placeholder for any additional fields  
}



interface RelationshipStatus {
    type: 'friend' | 'blocked' | 'pending_sent' | 'pending_received' | 'none';
    friendshipId?: string;
}

interface UserGameplayStats {
    totalMatches: number;
    tournamentMatches: number;
    regularMatches: number;
    multiplayerMatches: number;
    aiMatches: number;
    wins: number;
    losses: number;
    winRate: number;
    tournamentsPlayed: number;
    tournamentsWon: number;
}

class FriendProfile {
    private friendId: string | null = null;
    friendData:FriendProfileData | any | null = null;
    private relationshipStatus: RelationshipStatus | null = null;
    private initialized: boolean = false;
    private baseURL: string = baseURL;
    stats: UserGameplayStats = {
    totalMatches: 0,
    tournamentMatches: 0,
    regularMatches: 0,
    multiplayerMatches: 0,
    aiMatches: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    tournamentsPlayed: 0,
    tournamentsWon: 0
  };
  matchHistory: any[] = [];

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

        // app.socketService.on("userStatusChange", (data : any) => {
        //     // const currentProfileUserId = new URLSearchParams(
        //     //     window.location.search
        //     // ).get("userId");

        //     console.log("Status change event received:", data);
        //     // console.log("Current profile user ID:", currentProfileUserId);

        //     // If this status change is for the user we're currently viewing
        //     if (parseInt(this.friendData.id) === data.userId) {
        //         console.log("Updating status for current profile user");
        //         const onlineStatus = document.getElementById("onlineStatus");
        //         if (data.isOnline) {
        //             this.friendData.isOnline = true;
        //             // onlineStatus.classList.add("online");
        //             // onlineStatus.title = "Online";
        //         } else {
        //           this.friendData.isOnline = false;
        //             // onlineStatus.classList.remove("online");
        //             // onlineStatus.classList.add("offline");
        //             // onlineStatus.title = "Offline";
        //         }
        //     }
        // });
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
                console.log('No user ID provided');
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
            
            // Debug output
            console.log('Relationship status after loading:', this.relationshipStatus);

            // Load friend's match history for stats calculation
            const HistoryMatches =  await profile.fetchUserMatchHistory(this.friendId);
            this.matchHistory = HistoryMatches;
            // Calculate enhanced stats

            this.stats = this.calculateUserStats(HistoryMatches ,[], this.friendId );

            // Populate the UI
            this.populateProfile();

            // Start online status polling
            this.startOnlineStatusPolling();

        } catch (error) {
            console.error('Error loading friend profile:', error);
            this.showError('Failed to load friend profile');
        }
    }

    calculateUserStats(matchHistory: any[], tournamentHistory:any[], userId: string): UserGameplayStats {
  const stats: UserGameplayStats = {
    totalMatches: 0,
    tournamentMatches: 0,
    regularMatches: 0,
    multiplayerMatches: 0,
    aiMatches: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    tournamentsPlayed: tournamentHistory.length,
    tournamentsWon: 0
  };

  const currentUser = app.getUsername();
  // console.log('Calculating user stats for:', currentUser, 'with match history:', matchHistory.length, 'and tournament history:', tournamentHistory.length);
  // Process matches based on your API structure
  matchHistory.forEach(match => {
    // Skip cancelled matches
    if (match.status === 'cancelled') return;
    
    stats.totalMatches++;
    console.log('Processing match:');
    switch(match.match_type) {
      case 'tournament':
        stats.tournamentMatches++;
        break;
      case 'multiplayer':
        stats.multiplayerMatches++;
        break;
      case '1vAi':
        stats.aiMatches++;
        break;
      default:
        stats.regularMatches++;
    }

    // Determine winner based on match type
    let userWon = false;
    
    if (match.match_type === 'multiplayer') {
      // For multiplayer, check if user's team won
         const userTeam = match.teams[0]
        const opponentTeam =match.teams[1]
        
        userWon = (userTeam?.score || 0) > (opponentTeam?.score || 0);
        
    } else {
      // For regular/tournament matches
      if (match.player1_name === currentUser) {
        userWon = match.player1_score > match.player2_score;
      } else if (match.player2_name === currentUser) {
        userWon = match.player2_score > match.player1_score;
      }
    }
    // if (match.player1_score > match.player2_score) {  
    //     userWon = true;
    // }

    // if (userWon) {
    //   stats.wins++;
    // } else {
    //   stats.losses++;
    // }
});
    stats.wins = this.friendData.stats?.wins || 0;
    stats.losses = this.friendData.stats?.losses || 0;
    stats.totalMatches = this.friendData.stats?.totalGames || 0;

  // Calculate win rate
    stats.winRate = stats.totalMatches > 0 ? Math.round((stats.wins / stats.totalMatches) * 100) : 0;
    console.log('Calculated user stats:', stats);
  return stats;
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
                console.log('Blocked users data:', blockedUsers);
                console.log('Current friend ID:', this.friendId);
                
                // First try to match by userId field
                let isBlocked = blockedUsers.some((block: any) => 
                    block.userId && block.userId.toString() === this.friendId
                );
                
                // If not found and we have username available, try by username as fallback
                if (!isBlocked && this.friendData && this.friendData.username) {
                    isBlocked = blockedUsers.some((block: any) => 
                        block.username === this.friendData.username
                    );
                }
                
                console.log('Is this user blocked?', isBlocked);
                
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
    async fetchFriendMatchHistory(userId: string, page: number = 1, limit: number = 100): Promise<any[]> {
        try {
            // API endpoint with pagination parameters
            const response = await api.fetchWithAutoRefresh(
            `${this.baseURL}/users/${Number(userId)}/matches?page=${page}&limit=${limit}`
            );
            if (!response.ok) return [];
            
            const data = await response.json();
            
            // The API returns an array directly, not wrapped in a matches property
            return Array.isArray(data) ? data : [];
        } catch (error) {
            // toastManager.error( app.getUsername(),`Error fetching match history, ${error}`);
            
            console.error('Error fetching match history:', error);
            return [];
        }
    }

    // private calculateFriendStats(matchHistory: any[]): void {
    //     if (!this.friendData || !this.friendData.stats) {
    //         this.friendData!.stats = {
    //             total_games: 0,
    //             wins: 0,
    //             losses: 0,
    //             win_rate: 0,
    //             regular_matches: 0,
    //             ai_matches: 0,
    //             tournament_matches: 0,
    //             multiplayer_matches: 0,
    //             total_points: 0,
    //             avg_points: 0,
    //             tournaments_won: 0,
    //             longest_streak: 0
    //         };
    //     }

    //     const stats = this.friendData!.stats;
    //     const friendUsername = this.friendData!.username;

    //     // Reset calculated stats
    //     stats.total_games = 0;
    //     stats.wins = 0;
    //     stats.losses = 0;
    //     stats.regular_matches = 0;
    //     stats.ai_matches = 0;
    //     stats.tournament_matches = 0;
    //     stats.multiplayer_matches = 0;
    //     stats.total_points = 0;

    //     let currentStreak = 0;
    //     let longestStreak = 0;

    //     matchHistory.forEach(match => {
    //         if (match.status === 'cancelled') return;

    //         stats.total_games++;

    //         // Determine match type
    //         switch (match.match_type) {
    //             case 'tournament':
    //                 stats.tournament_matches++;
    //                 break;
    //             case '1vAi':
    //                 stats.ai_matches++;
    //                 break;
    //             case 'multiplayer':
    //                 stats.multiplayer_matches++;
    //                 break;
    //             default:
    //                 stats.regular_matches++;
    //                 break;
    //         }

    //         // Determine if friend won
    //         let friendWon = false;
    //         let friendScore = 0;

    //         if (match.match_type === 'multiplayer') {
    //             const friendTeam = match.teams?.find((team: any) => 
    //                 team.players?.some((player: any) => player.player_name === friendUsername)
    //             );
    //             const opponentTeam = match.teams?.find((team: any) => team.id !== friendTeam?.id);
                
    //             if (friendTeam && opponentTeam) {
    //                 friendWon = friendTeam.score > opponentTeam.score;
    //                 friendScore = friendTeam.score;
    //             }
    //         } else {
    //             const isFriendPlayer1 = match.player1_name === friendUsername;
    //             friendScore = isFriendPlayer1 ? match.player1_score : match.player2_score;
    //             const opponentScore = isFriendPlayer1 ? match.player2_score : match.player1_score;
    //             friendWon = friendScore > opponentScore;
    //         }

    //         stats.total_points += friendScore;

    //         if (friendWon) {
    //             stats.wins++;
    //             currentStreak++;
    //             longestStreak = Math.max(longestStreak, currentStreak);
    //         } else {
    //             stats.losses++;
    //             currentStreak = 0;
    //         }
    //         stats.wins = this.friendData?.stats?.wins || 0;
    //         stats.losses = this.friendData?.stats?.losses || 0;
    //     });

    //     stats.win_rate = stats.total_games > 0 ? Math.round((stats.wins / stats.total_games) * 100) : 0;
    //     stats.avg_points = stats.total_games > 0 ? Math.round((stats.total_points / stats.total_games) * 100) / 100 : 0;
    //     stats.longest_streak = longestStreak;

    //     // Mock tournaments won (would need separate API call)
    //     stats.tournaments_won = Math.floor(stats.tournament_matches * 0.2);
    // }



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
            // If profile_picture exists, fetch it through the API, otherwise use default
            if (this.friendData.profile_picture) {
              console.log('Friend profile picture found:', this.friendData.profile_picture);
              console.log('Base URL:', this.baseURL);
              
              // The backend serves static files from the root path via fastifyStatic
              // We need to use the backend server URL which is running on port 3000
              const cleanPath = this.friendData.profile_picture.replace(/^\/+/, '');
              const apiUrl = `${CONFIG.baseURLWithoutApi}/${cleanPath}`;
              
              console.log('Trying to fetch profile picture from:', apiUrl);
              
              fetch(apiUrl, { credentials: 'include' })
                .then(async (res) => {
                  if (!res.ok) {
                    console.error('Image not found, using default');
                    profileImg.src = 'src/assets/icons/user.png';
                    throw new Error('Image not found');
                  }
                  const blob = await res.blob();
                  const imageUrl = URL.createObjectURL(blob);
                  profileImg.src = imageUrl;
                })
                .catch((e) => {
                  console.error('Failed to load profile picture, using default', e);
                  profileImg.src = 'src/assets/icons/user.png';
                });
            } else {
              profileImg.src = 'src/assets/icons/user.png';
            }
        }
        // Priority order: localStorage cache > server URL > default image
        // const cachedImage = this.getProfilePictureFromLocalStorage();

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
        // this.friendData.stats = profile.calculateUserStats(matchHistory, tournamentHistory, userData?.id?.toString() || app.state.user?.id?.toString() || '');
        const stats = this.stats;
        if (stats) {
            const totalGamesElement = document.getElementById('friendStatsTotalGames');
            if (totalGamesElement) {
                totalGamesElement.textContent = this.stats.totalMatches.toString();
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
                winRateElement.textContent = `${this.stats.winRate}%`;
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
                // Ensure block button is hidden when user is already blocked
                if (blockBtn) blockBtn.style.display = 'none';
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
                    // statusElement.textContent = 'No Relationship';
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
                toastManager.success(app.getUsername(), `Opening existing chat with ${this.friendData.username}...`);
            } else if (existingChatRes.status === 404) {
                // Create new chat
                const createChatRes = await api.fetchWithAutoRefresh(`${this.baseURL}/chats`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ user2Id: this.friendId })
                });

                if (!createChatRes.ok) {
                    toastManager.error(app.getUsername(), `Failed to create chat: ${createChatRes.statusText}`);
                    throw new Error('Failed to create chat');
                }

                const newChat = await createChatRes.json();
                chatId = newChat.chat_id || newChat.id;;

            } else {
                toastManager.error(app.getUsername(), 'Failed to get chat information');
                throw new Error('Failed to get chat information');
            }

            // Redirect to chat with the specific chat ID
            // window.location.href = `chat.html?chatId=${chatId}`;
            if (chatId) {
                toastManager.success(app.getUsername(), `New chat created with ${this.friendData.username}`);
                chat.currentChatWithUsername = this.friendData.username;
                // await chat.loadChats();
                router.navigate(`/chat?chatId=${chatId}`);
                // await chat.joinRoom(chatId);
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
                
                // Force UI update to ensure the correct button is shown
                const blockBtn = document.getElementById('blockBtn');
                const unblockBtn = document.getElementById('unblockBtn');
                if (blockBtn) blockBtn.style.display = 'none';
                if (unblockBtn) unblockBtn.style.display = 'inline-block';
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
            // First get all blocks to find the blockId for this user
            const blocksResponse = await api.fetchWithAutoRefresh(`${this.baseURL}/users/blocks`, {
                credentials: 'include'
            });
    
            if (!blocksResponse.ok) {
                toastManager.error(app.getUsername(), 'Failed to fetch block information');
                return;
            }
    
            const blocks = await blocksResponse.json();
            console.log('Blocks for unblock function:', blocks);
            
            // First try to find by userId
            let block = blocks.find((block: any) => block.userId && block.userId.toString() === this.friendId);
            
            // If not found by userId, try username as a fallback
            if (!block && this.friendData.username) {
                block = blocks.find((block: any) => block.username === this.friendData.username);
            }
            
            if (!block) {
                toastManager.error(app.getUsername(), 'Could not find block information for this user');
                return;
            }
            
            console.log('Found block to remove:', block);
    
            // Now use the blockId for the unblock request
            const response = await api.fetchWithAutoRefresh(`${this.baseURL}/users/blocks/${block.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
    
            if (response.ok) {
                toastManager.success(app.getUsername(), 'User unblocked successfully!');
                this.relationshipStatus = { type: 'none' };
                this.updateRelationshipDisplay();
                
                // Force UI update to ensure the correct button is shown
                const blockBtn = document.getElementById('blockBtn');
                const unblockBtn = document.getElementById('unblockBtn');
                if (blockBtn) blockBtn.style.display = 'inline-block';
                if (unblockBtn) unblockBtn.style.display = 'none';
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

        // const stats = this.friendData.stats;
        
        // Get current match history (you'll need to store this from loadProfileData)

        const stats = profile.calculateDetailedStats(this.matchHistory, this.friendId! || this.friendData.id! || null);
  
  content.innerHTML = `
   <!-- CSS Charts Section -->
  <div class="col-span-full">
    <div class="cyber-container bg-gradient-to-br from-cyber-darker to-cyber-dark border-2 border-cyber-blue rounded-lg p-6 shadow-lg">
      <div class="flex items-center mb-6">
        <div class="w-3 h-3 bg-cyber-blue rounded-full mr-3 animate-pulse"></div>
        <h6 class="font-cyber text-cyber-blue text-xl font-bold animate-glow">📊 PERFORMANCE ANALYTICS</h6>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Win/Loss Pie Chart -->
        <div class="cyber-card">
          <h6 class="font-cyber text-cyber-green text-center mb-4">Win/Loss Distribution</h6>
          <div class="relative w-32 h-32 mx-auto">
            <div class="absolute inset-0 rounded-full border-8 border-cyber-green transform rotate-0" 
                 style="background: conic-gradient(#2DE2E6 0deg ${(stats.wins / (stats.wins + stats.losses)) * 360}deg, #FF2A6D ${(stats.wins / (stats.wins + stats.losses)) * 360}deg 360deg);"></div>
            <div class="absolute inset-4 bg-cyber-darker rounded-full flex items-center justify-center">
              <span class="font-cyber text-white text-sm">${stats.winRate}%</span>
            </div>
          </div>
          <div class="flex justify-center mt-4 space-x-4">
            <div class="flex items-center"><div class="w-3 h-3 bg-cyber-green mr-2"></div><span class="text-xs">Wins: ${stats.wins}</span></div>
            <div class="flex items-center"><div class="w-3 h-3 bg-cyber-pink mr-2"></div><span class="text-xs">Losses: ${stats.losses}</span></div>
          </div>
        </div>
        
        <!-- Match Type Bar Chart -->
        <div class="cyber-card">
          <h6 class="font-cyber text-cyber-blue text-center mb-4">Match Types</h6>
          <div class="space-y-3">
            <div class="flex items-center">
              <span class="text-xs w-16">Regular</span>
              <div class="flex-1 bg-cyber-dark h-4 rounded mx-2">
                <div class="bg-cyber-blue h-4 rounded" style="width: ${stats.regularMatches ? (stats.regularMatches / stats.totalMatches) * 100 : 0}%"></div>
              </div>
              <span class="text-xs w-8">${stats.regularMatches}</span>
            </div>
            <div class="flex items-center">
              <span class="text-xs w-16">AI</span>
              <div class="flex-1 bg-cyber-dark h-4 rounded mx-2">
                <div class="bg-cyber-pink h-4 rounded" style="width: ${stats.aiMatches ? (stats.aiMatches / stats.totalMatches) * 100 : 0}%"></div>
              </div>
              <span class="text-xs w-8">${stats.aiMatches}</span>
            </div>
            <div class="flex items-center">
              <span class="text-xs w-16">Multi</span>
              <div class="flex-1 bg-cyber-dark h-4 rounded mx-2">
                <div class="bg-cyber-yellow h-4 rounded" style="width: ${stats.multiplayerMatches ? (stats.multiplayerMatches / stats.totalMatches) * 100 : 0}%"></div>
              </div>
              <span class="text-xs w-8">${stats.multiplayerMatches}</span>
            </div>
            <div class="flex items-center">
              <span class="text-xs w-16">Tournament</span>
              <div class="flex-1 bg-cyber-dark h-4 rounded mx-2">
                <div class="bg-purple-400 h-4 rounded" style="width: ${stats.tournamentMatches ? (stats.tournamentMatches / stats.totalMatches) * 100 : 0}%"></div>
              </div>
              <span class="text-xs w-8">${stats.tournamentMatches}</span>
            </div>
          </div>
        </div>
        
  
        
        <!-- Top Opponents -->
        <div class="cyber-card md:col-span-2">
          <h6 class="font-cyber text-cyber-yellow text-center mb-4">Most Faced Opponents</h6>
          <div class="space-y-2">
            ${Object.entries(stats.opponents)
              .sort(([,a]: any, [,b]: any) => b.matches - a.matches)
              .slice(0, 5)
              .map(([name, data]: any, index) => {
                const winRate = Math.round((data.wins / data.matches) * 100);
                const colors = ['bg-cyber-blue', 'bg-cyber-green', 'bg-cyber-pink', 'bg-yellow-400', 'bg-purple-400'];
                return `
                  <div class="flex items-center justify-between p-2 bg-cyber-dark rounded">
                    <div class="flex items-center">
                      <div class="w-3 h-3 ${colors[index]} rounded-full mr-3"></div>
                      <span class="text-white text-sm font-cyber">${name}</span>
                    </div>
                    <div class="flex items-center space-x-4">
                      <span class="text-xs text-gray-400">${data.matches} games</span>
                      <span class="text-xs ${winRate >= 50 ? 'text-cyber-green' : 'text-cyber-pink'}">${winRate}% win</span>
                    </div>
                  </div>
                `;
              }).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>
    <!-- Match Types Card -->
    <div class="cyber-container bg-gradient-to-br from-cyber-darker to-cyber-dark border-2 border-cyber-blue rounded-lg p-6 shadow-lg hover:shadow-neon-blue transition-all duration-300">
      <div class="flex items-center mb-4">
        <div class="w-3 h-3 bg-cyber-blue rounded-full mr-3 animate-pulse"></div>
        <h6 class="font-cyber text-cyber-blue text-lg font-bold animate-glow">🎮 MATCH TYPES</h6>
      </div>
      <div class="space-y-3">
        <div class="flex justify-between items-center p-3 bg-cyber-dark rounded border-l-4 border-cyber-green shadow-neon-green hover:bg-opacity-80 transition-all">
          <span class="text-white font-cyber font-medium">REGULAR</span>
          <span class="text-cyber-green font-cyber font-bold text-xl">${stats.regularWins}/${stats.regularMatches}</span>
        </div>
        <div class="flex justify-between items-center p-3 bg-cyber-dark rounded border-l-4 border-cyber-pink shadow-neon-pink hover:bg-opacity-80 transition-all">
          <span class="text-white font-cyber font-medium">AI MATCHES</span>
          <span class="text-cyber-pink font-cyber font-bold text-xl">${stats.aiWins}/${stats.aiMatches}</span>
        </div>
        <div class="flex justify-between items-center p-3 bg-cyber-dark rounded border-l-4 border-yellow-400 hover:bg-opacity-80 transition-all">
          <span class="text-white font-cyber font-medium">MULTIPLAYER</span>
          <span class="text-yellow-400 font-cyber font-bold text-xl">${stats.multiplayerWins}/${stats.multiplayerMatches}</span>
        </div>
        <div class="flex justify-between items-center p-3 bg-cyber-dark rounded border-l-4 border-purple-400 hover:bg-opacity-80 transition-all">
          <span class="text-white font-cyber font-medium">TOURNAMENT</span>
          <span class="text-purple-400 font-cyber font-bold text-xl">${stats.tournamentWins}/${stats.tournamentMatches}</span>
        </div>
      </div>
    </div>
    
    <!-- Tournaments Card -->
   
          <div class="cyber-container bg-gradient-to-br from-cyber-darker to-cyber-dark border-2 border-cyber-blue rounded-lg p-6 shadow-lg hover:shadow-neon-blue transition-all duration-300">
    <div class="flex items-center mb-4">
      <div class="w-3 h-3 bg-cyber-blue rounded-full mr-3 animate-pulse"></div>
      <h6 class="font-cyber text-cyber-blue text-lg font-bold animate-glow">🏆 TOURNAMENTS</h6>
    </div>

      <!-- STACKED VERTICAL LAYOUT -->
      <div class="flex flex-col items-center gap-4">
        <!-- Joined -->
        <div class="w-full text-center p-4 bg-cyber-dark rounded-lg border border-cyber-blue shadow-neon-blue">
          <div class="text-3xl font-cyber font-bold text-cyber-blue animate-glow">
            ${stats.tournamentsParticipated.size}
          </div>
          <div class="text-sm font-cyber text-gray-300">PARTICIPATED</div>
        </div>

        <!-- Won -->
        <div class="w-full text-center p-4 bg-cyber-dark rounded-lg border border-cyber-green shadow-neon-green">
          <div class="text-3xl font-cyber font-bold text-cyber-green animate-glow">
            ${stats.tournamentsWon.size}
          </div>
          <div class="text-sm font-cyber text-gray-300">WON</div>
        </div>

        <!-- Win Rate -->
        <div class="w-full text-center">
          <div class="inline-flex items-center justify-center w-full px-6 py-3 bg-gradient-to-r from-cyber-blue to-cyber-green rounded-md border border-cyber-blue shadow-neon-blue">
            <span class="text-cyber-dark font-cyber font-bold text-lg">
              ${stats.tournamentsParticipated.size > 0
                ? Math.round((stats.tournamentsWon.size / stats.tournamentsParticipated.size) * 100)
                : 0}% WIN RATE
            </span>
          </div>
        </div>
      </div>
    </div>
    <!-- Scoring Card -->
    <div class="cyber-container bg-gradient-to-br from-cyber-darker to-cyber-dark border-2 border-cyber-green rounded-lg p-6 shadow-lg hover:shadow-neon-green transition-all duration-300">
      <div class="flex items-center mb-4">
        <div class="w-3 h-3 bg-cyber-green rounded-full mr-3 animate-pulse"></div>
        <h6 class="font-cyber text-cyber-green text-lg font-bold animate-glow">📊 SCORING MATRIX</h6>
      </div>
      <div class="space-y-4">
        <div class="flex justify-between items-center p-2 bg-cyber-dark rounded">
          <span class="font-cyber text-gray-300">POINTS SCORED</span>
          <span class="text-cyber-green font-cyber font-bold text-2xl animate-glow">${stats.totalPointsScored}</span>
        </div>
        <div class="w-full bg-cyber-dark rounded-full h-3 border border-cyber-blue">
          <div class="bg-gradient-to-r from-cyber-green via-cyber-blue to-cyber-pink h-3 rounded-full animate-pulse" 
               style="width: ${stats.totalPointsScored > 0 ? Math.min((stats.totalPointsScored / (stats.totalPointsScored + stats.totalPointsConceded)) * 100, 100) : 0}%"></div>
        </div>
        <div class="flex justify-between items-center p-2 bg-cyber-dark rounded">
          <span class="font-cyber text-gray-300">POINTS CONCEDED</span>
          <span class="text-cyber-pink font-cyber font-bold text-2xl">${stats.totalPointsConceded}</span>
        </div>
        <div class="text-center mt-4 p-4 bg-cyber-dark rounded-lg border border-cyber-blue shadow-neon-blue">
          <div class="text-cyber-blue font-cyber font-bold text-2xl animate-glow">${stats.avgPointsPerMatch}</div>
          <div class="text-sm font-cyber text-gray-300">AVG PER MATCH</div>
        </div>
      </div>
    </div>
    
    <!-- Streaks Card -->
    <div class="cyber-container bg-gradient-to-br from-cyber-darker to-cyber-dark border-2 border-cyber-pink rounded-lg p-6 shadow-lg hover:shadow-neon-pink transition-all duration-300">
      <div class="flex items-center mb-4">
        <div class="w-3 h-3 bg-cyber-pink rounded-full mr-3 animate-pulse"></div>
        <h6 class="font-cyber text-cyber-pink text-lg font-bold animate-glow">🔥 STREAK DATA</h6>
      </div>
      
      <!-- Streak Cards: Vertically stacked with equal spacing -->
      <div class="flex flex-col gap-4">
        
        <div class="text-center p-4 bg-gradient-to-br from-cyber-green to-green-600 rounded-lg border border-cyber-green shadow-neon-green">
          <div class="text-3xl font-cyber font-bold text-white animate-glow">${stats.currentWinStreak}</div>
          <div class="text-sm font-cyber text-gray-100">CURRENT WIN</div>
        </div>

        <div class="text-center p-4 bg-gradient-to-br from-cyber-blue to-blue-600 rounded-lg border border-cyber-blue shadow-neon-blue">
          <div class="text-3xl font-cyber font-bold text-white animate-glow">${stats.longestWinStreak}</div>
          <div class="text-sm font-cyber text-gray-100">LONGEST WIN</div>
        </div>

        <div class="text-center p-4 bg-gradient-to-br from-cyber-pink to-red-600 rounded-lg border border-cyber-pink shadow-neon-pink">
          <div class="text-3xl font-cyber font-bold text-white">${stats.currentLossStreak}</div>
          <div class="text-sm font-cyber text-gray-100">CURRENT LOSS</div>
        </div>

        <div class="text-center p-4 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg border border-purple-400">
          <div class="text-3xl font-cyber font-bold text-white">${stats.longestLossStreak}</div>
          <div class="text-sm font-cyber text-gray-100">LONGEST LOSS</div>
        </div>

      </div>
    </div>
    
    <!-- Notable Matches Card -->
    <div class="cyber-container bg-gradient-to-br from-cyber-darker to-cyber-dark border-2 border-purple-400 rounded-lg p-6 shadow-lg hover:shadow-purple-400 transition-all duration-300">
      <div class="flex items-center mb-4">
        <div class="w-3 h-3 bg-purple-400 rounded-full mr-3 animate-pulse"></div>
        <h6 class="font-cyber text-purple-400 text-lg font-bold animate-glow">⭐ NOTABLE ENCOUNTERS</h6>
      </div>
      <div class="space-y-4">
        <div class="p-4 bg-gradient-to-r from-cyber-green to-green-600 rounded-lg border-2 border-cyber-green shadow-neon-green">
          <div class="flex items-center mb-2">
            <span class="text-3xl mr-3">🏆</span>
            <span class="font-cyber font-bold text-white text-lg">DOMINANT VICTORY</span>
          </div>
          <div class="text-white font-cyber font-bold text-2xl animate-glow">${stats.biggestWin.score}</div>
          <div class="text-gray-200 font-cyber text-sm">VS ${stats.biggestWin.opponent}</div>
          <div class="text-gray-300 font-cyber text-xs">${stats.biggestWin.date}</div>
        </div>
        
        <div class="p-4 bg-gradient-to-r from-cyber-pink to-red-600 rounded-lg border-2 border-cyber-pink shadow-neon-pink">
          <div class="flex items-center mb-2">
            <span class="text-3xl mr-3">🎯</span>
            <span class="font-cyber font-bold text-white text-lg">CLOSEST BATTLE</span>
          </div>
          <div class="text-white font-cyber font-bold text-2xl animate-glow">${stats.closestMatch.score}</div>
          <div class="text-gray-200 font-cyber text-sm">VS ${stats.closestMatch.opponent}</div>
          <div class="text-gray-300 font-cyber text-xs">${stats.closestMatch.date}</div>
        </div>
      </div>
    </div>
    
    <!-- Top Opponents Card -->
    <div class="cyber-container bg-gradient-to-br from-cyber-darker to-cyber-dark border-2 border-cyan-400 rounded-lg p-6 shadow-lg hover:shadow-cyan-400 transition-all duration-300">
      <div class="flex items-center mb-4">
        <div class="w-3 h-3 bg-cyan-400 rounded-full mr-3 animate-pulse"></div>
        <h6 class="font-cyber text-cyan-400 text-lg font-bold animate-glow">👥 RIVAL ANALYSIS</h6>
      </div>
      <div class="space-y-3">
        ${Object.entries(stats.opponents)
          .sort(([,a]: any, [,b]: any) => b.matches - a.matches)
          .slice(0, 5)
          .map(([name, data]: any, index) => {
            const winRate = Math.round((data.wins / data.matches) * 100);
            const borders = ['border-cyber-blue', 'border-cyber-green', 'border-cyber-pink', 'border-yellow-400', 'border-purple-400'];
            const shadows = ['shadow-neon-blue', 'shadow-neon-green', 'shadow-neon-pink', '', ''];
            const ranks = ['🥇', '🥈', '🥉', '🏅', '🎖️'];
            const rankTitles = ['PRIME TARGET', 'MAJOR RIVAL', 'KNOWN ENEMY', 'REGULAR FOE', 'OCCASIONAL MATCH'];
            
            return `
              <div class="flex items-center justify-between p-4 bg-cyber-dark rounded-lg border-2 ${borders[index]} ${shadows[index]} hover:bg-opacity-80 transition-all">
                <div class="flex items-center">
                  <span class="text-3xl mr-4">${ranks[index]}</span>
                  <div>
                    <div class="text-white font-cyber font-bold text-lg">${name}</div>
                    <div class="text-gray-400 font-cyber text-xs">${rankTitles[index]}</div>
                    <div class="text-gray-500 font-cyber text-xs">${data.matches} ENCOUNTERS</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-cyan-400 font-cyber font-bold text-xl">${data.wins}W</div>
                  <div class="text-xs font-cyber ${winRate >= 50 ? 'text-cyber-green' : 'text-cyber-pink'}">${winRate}%</div>
                </div>
              </div>
            `;
          }).join('')}
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
            const matches = await this.fetchFriendMatchHistory(this.friendId!, 1, 100);
            this.matchHistory = matches; // Store match history for later use
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
                    let  friendName = '';
                    
                    if (match.match_type === 'multiplayer') {
                        const friendTeam = match.teams?.find((team: any) => 
                            team.players?.some((player: any) => player.user_id === this.friendData!.id)
                        );
                        friendName  = friendTeam?.name || 'Friend Team';
                        const opponentTeam = match.teams?.find((team: any) => team.id !== friendTeam?.id);
                        
                        if (friendTeam && opponentTeam) {
                            friendWon = friendTeam.score > opponentTeam.score;
                            opponent = opponentTeam.name || 'OP_Team';
                            score = `${friendTeam.score} - ${opponentTeam.score}`;
                        }
                    } else {
                        const isFriendPlayer1 = match.player1_id === this.friendData!.id ? true : false;
                        const friendScore = isFriendPlayer1 ? match.player1_score : match.player2_score;
                        const opponentScore = isFriendPlayer1 ? match.player2_score : match.player1_score;
                        friendName = match.player1_name
                        friendWon = friendScore > opponentScore;
                        opponent = isFriendPlayer1 ? match.player2_name : match.player2_name;
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
                        <td class="px-4 py-3">${ friendName }</td>
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