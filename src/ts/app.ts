// Tailwind CSS is now loaded via CDN
import socketService from './socketService';
import api from './api';
import utils from './utils';
import login from './login';
// import twoFA from './twoFA';
import pages from './pages';
import game from './game';
import router from './router';
import profile from './profile';
import register from './register';
import components from './components';
import localization, { t } from './localization';
import accessibility from './accessibility';
import { ApiResponse } from './api';
import chat from './chat';
import notificationManager from './NotificationManager';
// import friends from './friend';
import { io } from 'socket.io-client';
import { CONFIG } from './constants';

// Define interfaces for state and user
interface User {
  id?: string;
  profile_picture?: string;
  username?: string;
  email?: string;
  is_oauth_user?: boolean;
  total_games?: number;
  wins?: number;
  win_rate?: number;
  losses?: number;
  rank?: string;
  is_two_factor_enabled?: boolean;
  matchHistory?: any[];
  tournaments?: any[];
}

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
}

interface MatchObject {
  matchId?: number | null;
  player1_id: number;
  player2_id?: number | null; // Optional for tournament matches
  player1_name: string;
  player2_name: string;
  player1_score: number;
  player2_score: number;
  winner: string;
  match_type: string;
  tournamentId?: number | null; // Optional for tournament matches
}

class App {
  appContainer: HTMLElement | null;
  initialized: boolean;
  logoutInitialized: boolean;
  state: AppState;

  constructor() {
    this.appContainer = null;
    this.initialized = false;
    this.logoutInitialized = false;



    this.state = {
      user: null,
      isAuthenticated: false,
    };

    
  }
  
  async init(): Promise<boolean> {
    this.appContainer = document.getElementById('App');
    
    if (!this.appContainer) {
      console.error("App: Container not found!");
      return false;
    }
    
    try {
      // this.resetAppContainer();
      
      components.showSpinner();
      components.init(this.appContainer);

      this.initializeSocket();
      
      pages.init(this.appContainer);
      await pages.loadAllPages();
      
      login.init();
      register.init();
    
    //   twoFA.init();
      profile.init();
      chat.init();
      // friends.init();
      this.registerRoutes();
      
      await router.init();
      
      this.initialized = true;
      
      // Restore authentication state from localStorage
      await this.restoreAuthState();
      
      utils.initLogoutButton(this);
      
      document.dispatchEvent(new CustomEvent('appInitialized', {
        detail: { app: this }
      }));
      
      return true;
    } catch (error) {
      components.showToast(
        'error',
        'Application Error',
        'There was a problem loading the application. Please refresh the page.',
        5000
      );
      return false;
    } finally {
      components.hideSpinner();
    }
  }
  
  resetAppContainer(): void {
    if (!this.appContainer) return;
    
    while (this.appContainer.firstChild) {
      this.appContainer.removeChild(this.appContainer.firstChild);
    }
  }
  
  registerRoutes(): void {
    router.registerRoutes({

      '/': async () => {
        // Check if user has accessToken cookie (from Google OAuth)
        const accessToken = utils.getCookie("accessToken");
        
        if (accessToken) {
          // User has token, try to get their data
          components.showSpinner();
          try {
            const result = await api.getCurrentUser(); // This uses /showUser endpoint
            
            if (result.success && result.data) {
              this.state.user = result.data.user;
              this.state.isAuthenticated = result.data.isAuthenticated ?? false;
              
              components.showToast('success', 'Welcome Back!', `Hello ${this.getUsername()}!`, 3000);
              login.updateUIAuthState();
              
              // Check if 2FA is required
              if (this.get2FAState() && !this.getIsAuthenticated()) {
                pages.showPage('twoFA');
                return;
              }
              
              pages.showPage('home');
              return;
            }
          } catch (error) {
            console.error('Error fetching user data after OAuth:', error);
            // Clear invalid token
            utils.deleteCookie('accessToken');
          } finally {
            components.hideSpinner();
          }
        }
        
        // No token or failed to get user data - show home page
        pages.showPage('home');
        login.updateUIAuthState();
      },
      
      '/home': async () => {
        // Check if user has accessToken cookie
        const accessToken = utils.getCookie("accessToken");
        
        if (accessToken && !this.state.user) {
          // User has token but no user data loaded yet
          components.showSpinner();
          try {
            const result = await api.getCurrentUser(); // Use /showUser endpoint
            
            if (result.success && result.data) {
              this.state.user = result.data.user;
              this.state.isAuthenticated = result.data.isAuthenticated ?? false;
              
              login.updateUIAuthState();
              
              // Check if 2FA is required
              if (this.get2FAState() && !this.getIsAuthenticated()) {
                pages.showPage('twoFA');
                return;
              }
            } else {
              // Token is invalid, clear it
              utils.deleteCookie('accessToken');
              components.showToast('warning', 'Session Expired', 'Please log in again.', 5000);
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            utils.deleteCookie('accessToken');
            this.state.user = null;
            this.state.isAuthenticated = false;
          } finally {
            components.hideSpinner();
          }
        }
        
        pages.showPage('home');
        login.updateUIAuthState();
      },
      
      '/auth/callback': async () => {
        // This route handles the redirect from Google OAuth
        components.showSpinner();
        
        try {
          // Check if we have the accessToken cookie
          const accessToken = utils.getCookie("accessToken");
          
          if (accessToken) {
            // Fetch user data using the token
            const result = await api.getCurrentUser();
            
            if (result.success && result.data) {
              this.state.user = result.data.user;
              this.state.isAuthenticated = result.data.isAuthenticated ?? false;
              
              components.showToast('success', 'Login Successful!', `Welcome ${this.getUsername()}!`, 3000);
              login.updateUIAuthState();
              
              // Check if 2FA is required
              if (this.get2FAState() && !this.getIsAuthenticated()) {
                router.navigate('/twoFA');
                return;
              }
              
              // Redirect to profile or home
              router.navigate('/profile');
              return;
            }
          }
          
          // No token or failed to get user data
          components.showToast('error', 'Login Failed', 'Authentication was unsuccessful.', 5000);
          router.navigate('/login');
          
        } catch (error) {
          console.error('OAuth callback error:', error);
          components.showToast('error', 'Login Error', 'An error occurred during login.', 5000);
          router.navigate('/login');
        } finally {
          components.hideSpinner();
        }
      },
      
      
      '/login': async () => {
        // if (this.get2FAState() && !this.getIsAuthenticated()) {
        //   pages.showPage('twoFA');
        //   login.updateUIAuthState();
        //   return;
        // }

        components.showSpinner();
        
        try {
          if (this.state.user) {
            components.showToast('info', 'Already Logged In', 'You are already logged in.',5000);
            router.navigate('/profile');
            return;
          }
          
          const result = await api.getCurrentUser();
           console.log('after', result.userData);
           
          if (result.success && result.userData) {
            this.state.user = result.userData;
            this.state.isAuthenticated = result.isAuthenticated;
            login.updateUIAuthState();
            components.showToast('info', 'Session Restored', 'Your session has been restored.', 5000);
            router.navigate('/profile');
            return;
          } else {
            pages.showPage('login');
            
            login.renderForms();
            register.renderForms();
            
            login.updateUIAuthState();
          }
        } catch (error) {
          pages.showPage('login');
          
          login.renderForms();
          register.renderForms();
          
          login.updateUIAuthState();
        } finally {
          components.hideSpinner();
        }
      },
      
      '/game': async () => {
        // if (this.get2FAState() && !this.getIsAuthenticated()) {
        //   pages.showPage('twoFA');
        //   login.updateUIAuthState();
        //   return;
        // }

        components.showSpinner();
        
        try {
          if (this.state.user) {
            pages.showPage('game');
            // login.updateUIAuthState();
            game.init(
              this.getUsername(),
              this.setSubmitMatchFunction.bind(this),
              this.setSubmitTournamentFunction.bind(this)
            );
            return;
          }
          
          const result = await api.getCurrentUser();
          console.log('before', result.userData);
          if (result.success && result.userData) {
            console.log('User data:', result.userData);
            this.state.user = result.userData;
            this.state.isAuthenticated = result.isAuthenticated;
            login.updateUIAuthState();
            pages.showPage('game');
            game.init(
              this.getUsername(),
              this.setSubmitMatchFunction.bind(this),
              this.setSubmitTournamentFunction.bind(this)
            );
          } else {
            components.showToast('warning', 'Authentication Required', 'Please log in to play the game.', 5000);
            router.navigate('/login');
          }
        } catch (error) {
          components.showToast('error', 'Authentication Error', 'An error occurred while checking authentication.', 5000);
          router.navigate('/login');
        } finally {
          components.hideSpinner();
        }
      },
      
      '/chat' : async () => {
        console.log('Chat route accessed');
        components.showSpinner();

     
        try {
          if (this.state.user) {
            console.log('User already authenticated, showing chat page');
            pages.showPage('chat');
            login.updateUIAuthState();
            return;
        }
          const result = await api.getCurrentUser();
          
          if (result.success && result.userData) {
            this.state.user = result.userData;
            this.state.isAuthenticated = result.isAuthenticated;
            login.updateUIAuthState();
            pages.showPage('chat');
          } else {
            components.showToast('warning', 'Authentication Required', 'Please log in to access chat.', 5000);
            router.navigate('/login');
          }
        } catch (error) {
          components.showToast('error', 'Authentication Error', 'An error occurred while checking authentication.', 5000);
          router.navigate('/login');
        } finally {
          components.hideSpinner();
        }
       },
      
      '/profile': async () => {
        // if (this.get2FAState() && !this.getIsAuthenticated()) {
        //   pages.showPage('twoFA');
        //   login.updateUIAuthState();
        //   return;
        // }
        
        components.showSpinner();
        
        try {
          if (this.state.user) {
              pages.showPage('profile');
              login.updateUIAuthState();
              return;
          }
          
          const result = await api.getCurrentUser();
          
          if (result.success && result.userData) {
            this.state.user = result.userData;
            this.state.isAuthenticated = result.isAuthenticated;
            login.updateUIAuthState();
            pages.showPage('profile');
          } else {
            components.showToast('warning', 'Authentication Required', 'Please log in to view your profile.', 5000);
            router.navigate('/login');
          }
        } catch (error) {
          components.showToast('error', 'Authentication Error', 'An error occurred while checking authentication.', 5000);
          router.navigate('/login');
        } finally {
          components.hideSpinner();
        }
      },
      

      '/twoFA': async () => {
        components.showSpinner();
        
        try {
          if (this.state.isAuthenticated) {
            components.showToast('info', 'Already Authenticated', 'You are already verified.', 5000);
            router.navigate('/');
            return;
          }
          
          if (!this.state.user) {
            const result = await api.getCurrentUser();
            
            if (result.success && result.userData) {
              this.state.user = result.userData;
              this.state.isAuthenticated = result.isAuthenticated;
              login.updateUIAuthState();
              
              if (this.state.isAuthenticated) {
                components.showToast('info', 'Already Authenticated', 'You are already verified.', 5000);
                router.navigate('/');
                return;
              }
            } else {
              components.showToast('warning', 'Authentication Required', 'Please log in to set up 2FA.', 5000);
              router.navigate('/login');
              return;
            }
          }
          
          pages.showPage('twoFA');
          login.updateUIAuthState();
        } catch (error) {
          components.showToast('error', 'Authentication Error', 'An error occurred while checking authentication.', 5000);
          router.navigate('/login');
        } finally {
          components.hideSpinner();
        }
      },
      
      '*': () => {
        pages.showPage('notFound');
        login.updateUIAuthState();
      }
    });
  }
  
  async restoreAuthState(): Promise<void> {
    try {
      // First, try to restore from localStorage
      const storedUser = localStorage.getItem('user');
      const storedAuth = localStorage.getItem('isAuthenticated');
      
      if (storedUser) {
        try {
          this.state.user = JSON.parse(storedUser);
          this.state.isAuthenticated = storedAuth === 'true';
          
          // Verify the stored auth state with the server
          const result = await api.getCurrentUser();
          
          if (result.success && result.data) {
            // Update with fresh data from server
            this.state.user = result.data.user;
            this.state.isAuthenticated = result.data.isAuthenticated ?? false;
            
            // Update localStorage with fresh data
            localStorage.setItem('user', JSON.stringify(result.data.user));
            localStorage.setItem('isAuthenticated', String(result.data.isAuthenticated ?? false));
          } else {
            // Server says user is not authenticated, clear local storage
            this.clearAuthState();
          }
        } catch (parseError) {
          console.error('Error parsing stored user data:', parseError);
          this.clearAuthState();
        }
      } else {
        // No stored user, check if server has valid session
        const result = await api.getCurrentUser();
        
        if (result.success && result.data) {
          this.state.user = result.data.user;
          this.state.isAuthenticated = result.data.isAuthenticated ?? false;
          
          // Store in localStorage
          localStorage.setItem('user', JSON.stringify(result.data.user));
          localStorage.setItem('isAuthenticated', String(result.data.isAuthenticated ?? false));
        }
      }
      
      // Update UI to reflect current auth state
      login.updateUIAuthState();
      
    } catch (error) {
      console.error('Error restoring auth state:', error);
      this.clearAuthState();
    }
  }

  clearAuthState(): void {
    this.state.user = null;
    this.state.isAuthenticated = false;
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    utils.deleteCookie('accessToken');
  }

  async checkAuthState(): Promise<void> {
    try {
      const result = await api.getCurrentUser();
      
      if (result.success && result.data) {
        this.state.user = result.data.user;
        this.state.isAuthenticated = result.data.isAuthenticated ?? false;
        
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(result.data.user));
        localStorage.setItem('isAuthenticated', String(result.data.isAuthenticated ?? false));
        
        login.updateUIAuthState();
        utils.initLogoutButton(this);

        if (this.get2FAState() && !this.getIsAuthenticated()) 
          router.navigate('/twoFA');
      } else {
        this.clearAuthState();
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      this.clearAuthState();
    }
  }

  async logout(): Promise<boolean> {
    components.showSpinner();
    
    try {
      await api.logout();
      
      this.state.user = null;
      
      login.updateUIAuthState();
      
      components.showToast('success', 'Logged Out', 'You have been successfully logged out.', 5000);
      
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
      return true;
    } catch (error) {
      
      this.state.user = null;
      login.updateUIAuthState();
      
      components.showToast('warning', 'Logout Status', 'You have been logged out, but there was an issue with the server.', 5000);
 
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
      return false;
    } finally {
      components.hideSpinner();
    }
  }
  
  getState(): AppState {
    return this.state;
  }

  getUser(): User | null {
    // Always return the current state user, which should be properly restored on init
    return this.state.user;
  }

  getUserImg(): string {
    return this.state.user?.profile_picture || '';
  }

  getUsername(): string {
    return this.state.user?.username || '';
  }

  getEmail(): string {
    return this.state.user?.email || '';
  }

  getIs42User(): boolean {
    return !!this.state.user?.is_oauth_user;
  }

  getTotalGamesPlayed(): number {
    return this.state.user?.total_games || 0;
  }

  getTotalWins(): number {
    return this.state.user?.wins || 0;
  }

  getWinRate(): number {
    return this.state.user?.win_rate || 0;
  }

  getTotalLosses(): number {
    return this.state.user?.losses || 0;
  }

  getRank(): string {
    return this.state.user?.rank || '';
  }

  get2FAState(): boolean {
    return !!this.state.user?.is_two_factor_enabled;
  }
  
  getIsAuthenticated(): boolean {
    if (!this.state.user) return false;
    return !!this.state.isAuthenticated;
  }

  initmatchHistoryArray(): void {
    if (!this.state.user) return;
    if (!Array.isArray(this.state.user.matchHistory)) {
      this.state.user.matchHistory = [];
    }
  }

  /**
 * Submit a match result based on match type
 * This function will be bound to the game and called when a match ends
 */
async setSubmitMatchFunction(matchObj: MatchObject): Promise<void> {
  try {
    // Validate required match data
    if (!matchObj.matchId) {
      console.error('Match submission failed: Missing matchId');
      components.showToast('error', 'Match Submission Error', 'Invalid match data - missing match ID.', 5000);
      return;
    }

    // Prepare match data for submission
    const matchData = {
      matchId: Number(matchObj.matchId),
      match_type: matchObj.match_type,
      player1_score: matchObj.player1_score,
      player2_score: matchObj.player2_score,
      tournamentId: matchObj.tournamentId || null
    };

    console.log('Submitting match with data:', matchData);

    // Use the unified submission API that routes based on match type
    const result = await api.submitMatchByType(matchData);

    if (!result.success) {
      console.error('Match submission failed:', result.error);
      components.showToast(
        'error', 
        'Match Submission Error', 
        result.error || 'An error occurred while submitting the match.', 
        5000
      );
      return;
    }

    // Success - update local state and storage
    this.initmatchHistoryArray();
    if (this.state.user && this.state.user.matchHistory) {
      this.state.user.matchHistory.push({
        ...matchObj,
        submittedAt: new Date().toISOString()
      });
      localStorage.setItem('user', JSON.stringify(this.state.user));
    }

    console.log('Match submitted successfully:', result.data);
    
    // Show success toast based on match type
    const matchTypeDisplay = {
      '1v1': 'Player vs Player',
      '1vAi': 'Player vs AI',
      'multiplayer': 'Multiplayer',
      'tournament': 'Tournament'
    }[matchObj.match_type] || 'Match';
    
    components.showToast(
      'success', 
      'Match Submitted', 
      `${matchTypeDisplay} match result saved successfully!`, 
      3000
    );

  } catch (error) {
    console.error('Unexpected error during match submission:', error);
    components.showToast(
      'error', 
      'Submission Error', 
      'An unexpected error occurred while submitting the match.', 
      5000
    );
  }
}

/**
 * Submit tournament results
 * This function handles the submission of all tournament matches at once
 */
async setSubmitTournamentFunction(matchArray: MatchObject[]): Promise<void> {
  try {
    // Validate tournament data
    if (!Array.isArray(matchArray) || matchArray.length === 0) {
      console.error('Tournament submission failed: Invalid match array');
      components.showToast('error', 'Tournament Submission Error', 'No tournament matches to submit.', 5000);
      return;
    }

    // Get tournament ID from the first match
    const tournamentId = matchArray[0]?.tournamentId;
    if (!tournamentId) {
      console.error('Tournament submission failed: Missing tournament ID');
      components.showToast('error', 'Tournament Submission Error', 'Invalid tournament data - missing tournament ID.', 5000);
      return;
    }

    console.log('Submitting tournament with matches:', matchArray);

    // Submit each match individually using the tournament API
    const submissionPromises = matchArray.map(async (match, index) => {
      if (!match.matchId) {
        throw new Error(`Match ${index + 1} is missing matchId`);
      }

      return await api.submitTournamentMatch(
        Number(tournamentId),
        Number(match.matchId),
        {
          player1_score: match.player1_score,
          player2_score: match.player2_score
        }
      );
    });

    // Wait for all match submissions to complete
    const results = await Promise.allSettled(submissionPromises);

    // Check for any failures
    const failures = results.filter(result => result.status === 'rejected');
    const successes = results.filter(result => result.status === 'fulfilled');

    if (failures.length > 0) {
      console.error('Some tournament matches failed to submit:', failures);
      components.showToast(
        'warning', 
        'Partial Tournament Submission', 
        `${successes.length}/${matchArray.length} matches submitted successfully.`, 
        5000
      );
    } else {
      console.log('All tournament matches submitted successfully');
      components.showToast(
        'success', 
        'Tournament Completed', 
        'All tournament matches submitted successfully!', 
        4000
      );
    }

    // Update local state regardless of partial failures
    this.initmatchHistoryArray();
    if (this.state.user && this.state.user.matchHistory) {
      // Add tournament data to match history
      const tournamentData = {
        type: 'tournament',
        tournamentId: tournamentId,
        matches: matchArray,
        completedAt: new Date().toISOString(),
        totalMatches: matchArray.length,
        successfulSubmissions: successes.length
      };
      
      this.state.user.matchHistory.push(tournamentData as any);
      localStorage.setItem('user', JSON.stringify(this.state.user));
    }

    // Get tournament details to show final results
    try {
      const tournamentDetails = await api.getTournamentDetails(Number(tournamentId));
      if (tournamentDetails.success) {
        console.log('Tournament completed:', tournamentDetails.data);
        
        // You can add additional UI updates here based on tournament completion
        // For example, showing the final bracket or winner announcement
      }
    } catch (detailsError) {
      console.warn('Could not fetch tournament details:', detailsError);
    }

  } catch (error) {
    console.error('Unexpected error during tournament submission:', error);
    components.showToast(
      'error', 
      'Tournament Submission Error', 
      'An unexpected error occurred while submitting the tournament.', 
      5000
    );
  }
}

  destroy(): void {
        socketService.destroy();
        chat.destroy();
        console.log('App destroyed');

    }

    private initializeSocket(): void {
        if (typeof io !== 'undefined') {
           console.log('Initializing chat socket connection from app class');
            window.chatSocket = io(CONFIG.socketURL, {
                withCredentials: true,
                autoConnect: true,
                reconnection: true,
            });
            
            window.chatSocket.on('connect', () => {
                console.log('Socket connected');
                components.showToast('success', 'Connected', 'Real-time features active!', 2000);
            });
            
            window.chatSocket.on('disconnect', () => {
                console.log('Socket disconnected');
                components.showToast('warning', 'Disconnected', 'Attempting to reconnect...', 3000);
            });
        }
        
        // Initialize notification manager after a short delay to ensure DOM is ready
        setTimeout(() => {
            notificationManager.init();
        }, 500);
    }

}

const app = new App();

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize accessibility features
    accessibility.enhanceKeyboardNavigation();
    
    // Initialize the application
    await app.init();

    // Apply localization to the page after initialization
    document.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { 
        language: localization.currentLanguage, 
        isRTL: localization.isRTL 
      }
    }));

           // Add cleanup on page unload
    window.addEventListener('beforeunload', () => {
            app.destroy();
        });
  } catch (error) {
    if (components && components.hideSpinner) {
      components.hideSpinner();
    }
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const videoElement = document.querySelector('video');
    if (videoElement) {
      // This seems to be an empty block in the original code
    }
  }
});

export default app;
export { User, AppState, MatchObject };
