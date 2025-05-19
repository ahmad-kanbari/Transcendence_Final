// Tailwind CSS is now loaded via CDN

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

// Define interfaces for state and user
interface User {
  profile_image?: string;
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
  player1Name: string;
  player2Name: string;
  player1Score: number;
  player2Score: number;
  winner: string;
  matchType: string;
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
      this.resetAppContainer();
      
      components.showSpinner();
      components.init(this.appContainer);
      
      
      pages.init(this.appContainer);
      await pages.loadAllPages();
      
      login.init();
      register.init();
    //   twoFA.init();
      profile.init();
      
      this.registerRoutes();
      
      await router.init();
      
      this.initialized = true;
      
    //   await this.checkAuthState();
      
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
      '/': () => {
        if (this.get2FAState() && !this.getIsAuthenticated()) {
          pages.showPage('twoFA');
          login.updateUIAuthState();
          return;
        }
        pages.showPage('home');
        login.updateUIAuthState();
      },
      
      '/home': () => {
        if (this.get2FAState() && !this.getIsAuthenticated()) {
          pages.showPage('twoFA');
          login.updateUIAuthState();
          return;
        }
        pages.showPage('home');
        login.updateUIAuthState();
      },
      
      '/login': async () => {
        if (this.get2FAState() && !this.getIsAuthenticated()) {
          pages.showPage('twoFA');
          login.updateUIAuthState();
          return;
        }

        components.showSpinner();
        
        try {
          if (this.state.user) {
            components.showToast('info', 'Already Logged In', 'You are already logged in.',5000);
            router.navigate('/profile');
            return;
          }
          
          const result = await api.getUserData();
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
        if (this.get2FAState() && !this.getIsAuthenticated()) {
          pages.showPage('twoFA');
          login.updateUIAuthState();
          return;
        }

        components.showSpinner();
        
        try {
          if (this.state.user) {
            pages.showPage('game');
            // login.updateUIAuthState();
            game.init(
              this.getUsername(),
              this.setMatch.bind(this),
              this.setTournament.bind(this)
            );
            return;
          }
          
          const result = await api.getUserData();
          console.log('before', result.userData);
          if (result.success && result.userData) {
            console.log('User data:', result.userData);
            this.state.user = result.userData;
            this.state.isAuthenticated = result.isAuthenticated;
            login.updateUIAuthState();
            pages.showPage('game');
            game.init(
              this.getUsername(),
              this.setMatch.bind(this),
              this.setTournament.bind(this)
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
      
      '/profile': async () => {
        if (this.get2FAState() && !this.getIsAuthenticated()) {
          pages.showPage('twoFA');
          login.updateUIAuthState();
          return;
        }
        
        components.showSpinner();
        
        try {
          // if (this.state.user) {
          //     pages.showPage('profile');
          //     login.updateUIAuthState();
          //     return;
          // }
          
          const result = await api.getUserData();
          
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
            const result = await api.getUserData();
            
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
  
  async checkAuthState(): Promise<void> {
    try {
      const result = await api.getUserData();
      
      if (result.success && result.userData) {
        this.state.user = result.userData;
        this.state.isAuthenticated = result.isAuthenticated;
        login.updateUIAuthState();
        utils.initLogoutButton(this);

        if (this.get2FAState() && !this.getIsAuthenticated()) 
          router.navigate('/twoFA');
      } else {
        this.state.user = null;
      }
    } catch (error) {
      this.state.user = null;
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
    if (this.state.user)
      return this.state.user;
    
    const storedUser = localStorage.getItem('user');
    if (!storedUser) 
      return null;
    
    try {
      return JSON.parse(storedUser);
    } catch (err) {
      console.error('Error parsing stored user from localStorage:', err);
      return null;
    }
  }

  getUserImg(): string {
    return this.state.user?.profile_image || '';
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

  async setMatch(matchObj: MatchObject): Promise<void> {
    const result = await api.submitMatch(matchObj);

    if (!result.success) {
      components.showToast('error', 'Match Submission Error', 'An error occurred while submitting the match.', 5000);
      return;
    }

    this.initmatchHistoryArray();
    if (this.state.user && this.state.user.matchHistory) {
      this.state.user.matchHistory.push(matchObj);
      localStorage.setItem('user', JSON.stringify(this.state.user));
    }
  }

  async setTournament(matchArray: MatchObject[]): Promise<void> {
    const result = await api.createTournament(matchArray);

    if (!result.success) {
      components.showToast('error', 'Tournament Submission Error', 'An error occurred while submitting the tournament.');
      return;
    }

    this.initmatchHistoryArray();
    if (this.state.user && this.state.user.matchHistory) {
      this.state.user.matchHistory.push(matchArray);
      localStorage.setItem('user', JSON.stringify(this.state.user));
    }
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
