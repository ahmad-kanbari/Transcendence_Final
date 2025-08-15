// Tailwind CSS is now loaded via CDN
// import socketService from './socketService';

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
// import accessibility from './accessibility';
import { ApiResponse } from './api';
import chat from './chat';
import notificationManager from './NotificationManager';
// import friends from './friend';
import { io } from 'socket.io-client';
import { CONFIG } from './constants';
import toastManager from './toastManager';
import friendProfile from './friendProfileData';
import { setupSocketDebugging } from './socketDebugging';

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
  userName: string | null = null;
  userId: number | null = null;
  userEmail: any;
  socketService: any = null;

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
      let deviceId = localStorage.getItem("deviceId");
      // if (!deviceId) {
      //     deviceId = crypto.randomUUID();  // Might be throwing
      //     //Replace with random number generator
      //     localStorage.setItem("deviceId", deviceId);
      // }
      if (!deviceId) {
          deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
        localStorage.setItem("deviceId", deviceId);
      }
      components.showSpinner();
      components.init(this.appContainer);

      // Initialize socket before restoring auth state
      // This ensures the socket is ready when authentication is verified
      this.initializeSocket();
  
      pages.init(this.appContainer);
      await pages.loadAllPages();
      
      login.init();
      register.init();

    
          profile.init();
      chat.init();
    
      friendProfile.init(); 
      this.registerRoutes();
      
      await router.init();
      
      this.initialized = true;
      
      // Restore authentication state from localStorage
      // This will now properly wait for socket connection if authenticated
      await this.restoreAuthState();
      
      utils.initLogoutButton(this);
      

      // Force initialization
      localization.updatePageContent();
      document.dispatchEvent(new CustomEvent('appInitialized', {
        detail: { app: this }
      }));
      
      return true;
    } catch (error) {
      // components.showToast(
      //   'error',
      //   'Application Error',
      //   'There was a problem loading the application. Please refresh the page.',
      //   5000
      // );
      toastManager.error(app.getUsername(), 'There was a problem loading the application. Please refresh the page.');
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

          // Check for OAuth callback parameters
          const urlParams = new URLSearchParams(window.location.search);
          const oauthStatus = urlParams.get('oauth');
          const oauthMessage = urlParams.get('message');
          
          // Handle OAuth callback
          if (oauthStatus === 'success') {
            components.showSpinner();
            try {
              // Clear URL parameters
              console.log("signing in with oauth")
              window.history.replaceState({}, document.title, window.location.pathname);
                  // ✅ Use API call instead of reading cookies
              const result = await api.getCurrentUser();
              // Check if cookies are set and fetch user data
    
  
                
                if (result.success && result.data) {
                  this.state.user = result.data.user;
                  this.state.isAuthenticated = result.data.isAuthenticated ?? true;
                  
                  // Force socket reconnection after OAuth login to ensure cookies are sent
                  if (this.socketService) {
                    console.log('Forcing socket reconnection after OAuth login...');
                    this.socketService.disconnect();
                    this.socketService.connect();
                    
                    // Wait for the socket to connect before continuing
                    if (!this.socketService.connected) {
                      console.log('Waiting for socket connection after OAuth login...');
                      await new Promise<void>((resolve) => {
                        const connectHandler = () => {
                          console.log('Socket connected after OAuth login');
                          this.socketService!.off('connect', connectHandler);
                          resolve();
                        };
                        
                        // Set timeout to avoid hanging if connection fails
                        const timeout = setTimeout(() => {
                          console.log('Socket connection timeout after OAuth login');
                          this.socketService!.off('connect', connectHandler);
                          resolve();
                        }, 3000);
                        
                        this.socketService!.once('connect', connectHandler);
                      });
                    }
                  }

                  toastManager.success(this.getUsername(), `Hello ${this.getUsername()}! Welcome Back!`);
                  login.updateUIAuthState();
                  
                  // Check if 2FA is required
                  if (this.get2FAState() && !this.getIsAuthenticated()) {
                    pages.showPage('twoFA');
                    return;
                  }
                  
                  pages.showPage('home');
                  return;
                }else{
                  // components.showToast('error', 'Login Error', 'Failed to complete Google login.', 5000);
                   toastManager.error(this.getUsername(), 'Failed to complete Google login.');

                }
            
              
              // If no access token or getCurrentUser failed
              
            } catch (error) {
              console.error('Error after OAuth success:', error);
              // components.showToast('error', 'Login Error', 'Failed to complete login process.', 5000);
              toastManager.error(this.getUsername(), `Failed to complete login process. with ${error}`);
            } finally {
              components.hideSpinner();
            }
          } else if (oauthStatus === 'error') {
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            
            const errorMessage = oauthMessage ? decodeURIComponent(oauthMessage) : 'Google login failed';
            // components.showToast('error', 'Login Failed', errorMessage, 5000);
            toastManager.error(this.getUsername(), errorMessage);
          }
       

          // User has token, try to get their data
          components.showSpinner();
          try {
   
            const result = await api.getCurrentUser(); // This uses /showUser endpoint
            console.log('User data without oat:', result.data);
            if (result.success && result.data) {
              this.state.user = result.data.user;
              this.state.isAuthenticated = result.data.isAuthenticated ?? false;
              
              toastManager.success(this.getUsername(), `Hello ${this.getUsername()}! Welcome Back!`);
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
            // console.error('Error fetching user data after OAuth:', error);
            toastManager.error(this.getUsername(), 'Failed to fetch user data after OAuth login.');
            // Clear invalid token
            utils.deleteCookie('accessToken');
            this.state.user = null;
            this.state.isAuthenticated = false;
          } finally {
            components.hideSpinner();
          }
        
        
        // No token or failed to get user data - show home page
        pages.showPage('home');
        login.updateUIAuthState();
      },
      
      '/home': async () => {
        // Check if user has accessToken cookie
        //use refresh instead of access 

        
   
          // User has token but no user data loaded yet
          components.showSpinner();
          try {
            const result = await api.getCurrentUser(); // Use /showUser endpoint
            
          if (result.success && result.data) {
              this.state.user = result.data.user;
              this.state.isAuthenticated = result.data.isAuthenticated ?? false;
              console.log('User data: user logged in in home', this.state.user);
              login.updateUIAuthState();
              
              // Check if 2FA is required
              if (this.get2FAState() && !this.getIsAuthenticated()) {
                pages.showPage('twoFA');
                return;
              }
            } else {
              // Token is invalid, clear it
              utils.deleteCookie('accessToken');
              // components.showToast('warning', 'Session Expired', 'Please log in again.', 5000);
              toastManager.warning(this.getUsername(), 'Please log in again.');
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            utils.deleteCookie('accessToken');
            this.state.user = null;
            this.state.isAuthenticated = false;
          } finally {
            components.hideSpinner();
          }
        
        
        pages.showPage('home');
        login.updateUIAuthState();
      },
      
      '/auth/callback': async () => {
        // This route handles the redirect from Google OAuth
        components.showSpinner();
        
        try {
          // Check if we have the accessToken cookie
        
            // Fetch user data using the token
            const result = await api.getCurrentUser();
            
          if (result.success && result.data) {
              this.state.user = result.data.user;
              this.state.isAuthenticated = result.data.isAuthenticated ?? false;
              
              // components.showToast('success', 'Login Successful!', `Welcome ${this.getUsername()}!`, 3000);
              toastManager.success(this.getUsername(), `Welcome ${this.getUsername()}!`);
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
        
          
          // No token or failed to get user data
          // components.showToast('error', 'Login Failed', 'Authentication was unsuccessful.', 5000);
          toastManager.error(this.getUsername(), 'Authentication was unsuccessful.');
          router.navigate('/login');
          
        } catch (error) {
          console.error('OAuth callback error:', error);
          // components.showToast('error', 'Login Error', 'An error occurred during login.', 5000);
          toastManager.error(this.getUsername(), 'An error occurred during login.');
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
            // components.showToast('info', 'Already Logged In', 'You are already logged in.',5000);
            toastManager.info(this.getUsername(), 'You are already logged in.');
            router.navigate('/profile');
            return;
          }
      
          
     
       
          const result = await api.getCurrentUser();
           console.log('after', result.data);
           
        if (result.success && result.data) {
              this.state.user = result.data.user;
              this.state.isAuthenticated = result.data.isAuthenticated ?? false;
            login.updateUIAuthState();
            // components.showToast('info', 'Session Restored', 'Your session has been restored.', 5000);
            toastManager.info(this.getUsername(), 'Your session has been restored.');
            router.navigate('/profile');
            return;
          }
          else {
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
        if (this.state.user) {
            pages.showPage('game');
            // login.updateUIAuthState();
              if (game.isInitialized) {
                  game.cleanup();
              }
            game.init(
              this.getUsername(),
              this.setSubmitMatchFunction.bind(this),
              this.setSubmitTournamentFunction.bind(this)
            );
            return;
          }
          components.showSpinner();
        try {
          console.log('Game route accessed with state:', this.state.user);
       
     
          
            console.log('Access token found, fetching current user data ing ame');
            const result = await api.getCurrentUser();
            console.log('before', result.data);
            if (result.success && result.data) {
              this.state.user = result.data.user;
              this.state.isAuthenticated = result.data.isAuthenticated ?? false;
              login.updateUIAuthState();
              pages.showPage('game');
            
              game.init(
                this.getUsername(),
                this.setSubmitMatchFunction.bind(this),
                this.setSubmitTournamentFunction.bind(this)
              );
          }
          else {
            // components.showToast('warning', 'Authentication Required', 'Please log in to play the game.', 5000);
            toastManager.warning(this.getUsername(), 'Please log in to play the game.');
            router.navigate('/login');
          }
      
        } catch (error) {
          // components.showToast('error', 'Authentication Error', 'An error occurred while checking authentication.', 5000);
          toastManager.error(this.getUsername(), 'An error occurred while checking authentication.');
          router.navigate('/login');
            utils.deleteCookie('accessToken');
            this.state.user = null;
            this.state.isAuthenticated = false;
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
          
          if (result.success && result.data) {
              this.state.user = result.data.user;
              this.state.isAuthenticated = result.data.isAuthenticated ?? false;
            login.updateUIAuthState();
            pages.showPage('chat');
          }
           else {
            // components.showToast('warning', 'Authentication Required', 'Please log in to access chat.', 5000);
            toastManager.warning(this.getUsername(), 'Please log in to access chat.');
            router.navigate('/login');
          }
        } catch (error) {
          // components.showToast('error', 'Authentication Error', 'An error occurred while checking authentication.', 5000);
          toastManager.error(this.getUsername(), 'An error occurred while checking authentication.');
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
          
          if (result.success && result.data) {
              this.state.user = result.data.user;
              this.state.isAuthenticated = result.data.isAuthenticated ?? false;
            login.updateUIAuthState();
             profile.loadProfileData();
            pages.showPage('profile');
          }
          else {
            // components.showToast('warning', 'Authentication Required', 'Please log in to view your profile.', 5000);
            toastManager.warning(this.getUsername(), 'Please log in to view your profile.');
            router.navigate('/login');
          }
        } catch (error) {
          // components.showToast('error', 'Authentication Error', 'An error occurred while checking authentication.', 5000);
          toastManager.error(this.getUsername(), 'An error occurred while checking authentication.');
          router.navigate('/login');
        } finally {
          components.hideSpinner();
        }
      },
      

      '/twoFA': async () => {
        components.showSpinner();
        
        try {
          if (this.state.isAuthenticated) {
            // components.showToast('info', 'Already Authenticated', 'You are already verified.', 5000);
            toastManager.info(this.getUsername(), 'You are already verified.');
            router.navigate('/');
            return;
          }
          
          if (!this.state.user) {
            const result = await api.getCurrentUser();
            
          if (result.success && result.data) {
              this.state.user = result.data.user;
              this.state.isAuthenticated = result.data.isAuthenticated ?? false;
              login.updateUIAuthState();
              
              if (this.state.isAuthenticated) {
                // components.showToast('info', 'Already Authenticated', 'You are already verified.', 5000);
                toastManager.info(this.getUsername(), 'You are already verified.');
                router.navigate('/');
                return;
              }
            } else {
              // components.showToast('warning', 'Authentication Required', 'Please log in to set up 2FA.', 5000);
              toastManager.warning(this.getUsername(), 'Please log in to set up 2FA.');
              router.navigate('/login');
              return;
            }
          }
          
          pages.showPage('twoFA');
          login.updateUIAuthState();
        } catch (error) {
          // components.showToast('error', 'Authentication Error', 'An error occurred while checking authentication.', 5000);
          toastManager.error(this.getUsername(), 'An error occurred while checking authentication.'); 
          router.navigate('/login');
        } finally {
          components.hideSpinner();
        }
      },

      '/friendProfile': async () => {
            components.showSpinner();
            
            try {
                // Check authentication first
                if (!this.state.user) {
                    const result = await api.getCurrentUser();
                    
                    if (result.success && result.data) {
                        this.state.user = result.data.user;
                        this.state.isAuthenticated = result.data.isAuthenticated ?? false;
                        login.updateUIAuthState();
                    } else {
                        toastManager.warning(this.getUsername(), 'Please log in to view profiles.');
                        router.navigate('/login');
                        return;
                    }
                }

                // Show friend profile page
                pages.showPage('friendProfile');
                login.updateUIAuthState();
                
                // Trigger friend profile initialization
                document.dispatchEvent(new CustomEvent('pageShown', {
                    detail: { page: 'friend-profile' }
                }));
                
            } catch (error) {
                toastManager.error(this.getUsername(), 'An error occurred while loading the profile.');
                router.navigate('/chat');
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
          
          // Notify components about authentication state change
          document.dispatchEvent(new CustomEvent('appStateChanged', {
            detail: { isAuthenticated: this.state.isAuthenticated }
          }));
          
          // Verify the stored auth state with the server
          const result = await api.getCurrentUser();
          
          if (result.success && result.data) {
            // Update with fresh data from server
            this.state.user = result.data.user;
            this.state.isAuthenticated = result.data.isAuthenticated ?? false;
            
            // Update localStorage with fresh data
            localStorage.setItem('user', JSON.stringify(result.data.user));
            localStorage.setItem('isAuthenticated', String(result.data.isAuthenticated ?? false));
            
            // Ensure socket connection is established when authenticated
            // This helps the socket connect immediately when login state is restored
            if (this.state.isAuthenticated) {
              // Force socket reconnection after authentication to ensure cookies are sent
              if (this.socketService) {
                console.log('Forcing socket reconnection after auth state restoration...');
                this.socketService.disconnect();
                this.socketService.connect();
                
                // Wait for the socket to connect before continuing
                if (!this.socketService.connected) {
                  console.log('Waiting for socket connection after auth state restoration...');
                  await new Promise<void>((resolve) => {
                    const connectHandler = () => {
                      console.log('Socket connected after auth state restoration');
                      this.socketService!.off('connect', connectHandler);
                      resolve();
                    };
                    
                    // Set timeout to avoid hanging if connection fails
                    const timeout = setTimeout(() => {
                      console.log('Socket connection timeout after auth state restoration');
                      this.socketService!.off('connect', connectHandler);
                      resolve();
                    }, 5000);
                    
                    this.socketService!.once('connect', connectHandler);
                  });
                }
              }
            }
          } else {
            // Server says user is not authenticated, clear local storage
            this.clearAuthState();
          }
        } catch (parseError) {
          console.error('Error parsing stored user data:', parseError);
          this.clearAuthState();
        }
      } else {
        console.warn('No stored user data found, checking server session... but no reconnecting');
        // No stored user, check if server has valid session
        // const result = await api.getCurrentUser();
        
        // if (result.success && result.data) {
        //   this.state.user = result.data.user;
        //   this.state.isAuthenticated = result.data.isAuthenticated ?? false;
          
        //   // Store in localStorage
        //   localStorage.setItem('user', JSON.stringify(result.data.user));
        //   localStorage.setItem('isAuthenticated', String(result.data.isAuthenticated ?? false));
        // }
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
    localStorage.removeItem('current_profile_picture_key');
    utils.deleteCookie('accessToken');
    utils.cleanUp();  
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
      utils.cleanUp();    
      login.updateUIAuthState();
      
      // components.showToast('success', 'Logged Out', 'You have been successfully logged out.', 5000);
      toastManager.success(this.getUsername(), 'You have been successfully logged out.');
      chat.cleanupSocketHandlers();
      window.location.href = '/';
      
      return true;
    } catch (error) {
      
      this.state.user = null;
      login.updateUIAuthState();
      
      // components.showToast('warning', 'Logout Status', 'You have been logged out, but there was an issue with the server.', 5000);
      toastManager.warning(this.getUsername(), 'You have been logged out, but there was an issue with the server.');
 
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      
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

  // async getUserImg(): Promise<any> {
  //   console.log('getUserImg called');
  //     // First check localStorage for cached profile picture
  //     const cachedImage = profile.getProfilePictureFromLocalStorage();
      
  //     if (cachedImage) {
  //       console.log('Using cached profile picture in navbar from localStorage');
  //       return cachedImage;
  //     } else if (this.state.user && this.state.user.profile_picture) {
  //       // Use server URL if no cached version

  //           const cleanPath = this.state.user.profile_picture!.replace(/^\//, ''); // Remove leading slash if present
  //           const apiUrl = `${CONFIG.baseURLWithoutApi}/${cleanPath}`;
            
  //           console.log('Trying to fetch profile picture from:', apiUrl);
            
  //           fetch(apiUrl, { credentials: 'include' })
  //             .then(async (res) => {
  //               if (!res.ok) {
  //                 console.error('Image not found, using default');
  //                 // profileAvatar.src = 'src/assets/icons/user.png';
  //                 throw new Error('Image not found');
  //               }
  //               const blob = await res.blob();
  //               const imageUrl = URL.createObjectURL(blob);
  //               // profileAvatar.src = imageUrl;
  //               profile.saveProfilePictureToLocalStorage(apiUrl);
          
  //               // if (profileAvatar) {
  //               //   profileAvatar.src = imageUrl;
  //               //   login.updateUIAuthState();
  //               // }
  //               return imageUrl;
  //             })
  //             .catch((e) => {
  //               console.error('Failed to load profile picture, using default', e);
  //               // profileAvatar.src = 'src/assets/icons/user.png';
  //               return 'src/assets/icons/user.png';
  //             });
  //         } else {
  //           return 'src/assets/icons/user.png';
  //         }
  //     } 
    
  

  getUsername(): string {
        let usernameFromLocalStorage = localStorage.getItem('user') || null ;
        // console.log('Username from localStorage:', usernameFromLocalStorage);
        if (usernameFromLocalStorage != null) {
            try {
                const userObj = JSON.parse(usernameFromLocalStorage);
                // console.log('Parsed user object:', userObj);
                this.userName = userObj?.username || userObj['user']?.['username'] ;
                console.log('User name set to:', this.userName);
                // this.userName = app.getUsername();
                this.userId = Number(userObj.id) ??  null;
                // console.log('User ID set to:', this.userId);
                this.userEmail =userObj.email || userObj['user']?.['email'];
            } catch (e) {
                console.error('Failed to parse user from localStorage:', e);
                this.userName = null;
            }
        }
    return this.userName ||this.state.user?.username || '';
  }

  getEmail(): string {
     let usernameFromLocalStorage = localStorage.getItem('user') || null ;
        console.log('Username from localStorage:', usernameFromLocalStorage);
        if (usernameFromLocalStorage != null) {
            try {
                const userObj = JSON.parse(usernameFromLocalStorage);
                // console.log('Parsed user object:', userObj);
                this.userName = userObj.username || userObj['user']?.['username'] ;
                // console.log('User name set to:', this.userName);
                this.userName = app.getUsername();
                this.userId = Number(userObj.id) ??  null;
                console.log('User ID set to:', this.userId);
                this.userEmail =userObj.email || userObj['user']?.['email'];
            } catch (e) {
                console.error('Failed to parse user from localStorage:', e);
                this.userName = null;
            }
        }
    return  this.userEmail || this.state.user?.email || '';
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
      // components.showToast('error', 'Match Submission Error', 'Invalid match data - missing match ID.', 5000);
      toastManager.error(this.getUsername(), 'Invalid match data - missing match ID.');
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
      // components.showToast(
      //   'error', 
      //   'Match Submission Error', 
      //   result.error || 'An error occurred while submitting the match.', 
      //   5000
      // );
      toastManager.error(this.getUsername(), result.error || 'An error occurred while submitting the match.');
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
    
    // components.showToast(
    //   'success', 
    //   'Match Submitted', 
    //   `${matchTypeDisplay} match result saved successfully!`, 
    //   3000
    // );
    toastManager.success(this.getUsername(), `${matchTypeDisplay} match result saved successfully!`);

  } catch (error) {
    console.error('Unexpected error during match submission:', error);
    // components.showToast(
    //   'error', 
    //   'Submission Error', 
    //   'An unexpected error occurred while submitting the match.', 
    //   5000
    // );
    toastManager.error(this.getUsername(), 'An unexpected error occurred while submitting the match.');
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
      // components.showToast('error', 'Tournament Submission Error', 'No tournament matches to submit.', 5000);
      toastManager.error(this.getUsername(), 'No tournament matches to submit.');
      return;
    }

    // Get tournament ID from the first match
    const tournamentId = matchArray[0]?.tournamentId;
    if (!tournamentId) {
      console.error('Tournament submission failed: Missing tournament ID');
      // components.showToast('error', 'Tournament Submission Error', 'Invalid tournament data - missing tournament ID.', 5000);
      toastManager.error(this.getUsername(), 'Invalid tournament data - missing tournament ID.');
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
      // components.showToast(
      //   'warning', 
      //   'Partial Tournament Submission', 
      //   `${successes.length}/${matchArray.length} matches submitted successfully.`, 
      //   5000
      // );
      toastManager.warning(
        this.getUsername(), 
        `${successes.length}/${matchArray.length} matches submitted successfully.`
      );
    } else {
      console.log('All tournament matches submitted successfully');
      // components.showToast(
      //   'success', 
      //   'Tournament Completed', 
      //   'All tournament matches submitted successfully!', 
      //   4000
      // );
      toastManager.success(this.getUsername(), 'All tournament matches submitted successfully!');
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
      }else {
        toastManager.error(this.getUsername(), `Failed to fetch tournament details.${tournamentDetails.data}`);
      }
    } catch (detailsError) {
      console.warn('Could not fetch tournament details:', detailsError);
    }

  } catch (error) {
    console.error('Unexpected error during tournament submission:', error);
    toastManager.error(this.getUsername(), 'An unexpected error occurred while submitting the tournament.');
    // components.showToast(
    //   'error', 
    //   'Tournament Submission Error', 
    //   'An unexpected error occurred while submitting the tournament.', 
    //   5000
    // );
  }
}

  destroy(): void {
        this.socketService.destroy();
        chat.destroy();
        utils.cleanUp();
        console.log('App destroyed');

    }

   initializeSocket(): void {
        if (typeof io !== 'undefined') {
           console.log('Initializing chat socket connection from app class');
            this.socketService = io(CONFIG.socketURL, {
                withCredentials: true,
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000
            });
            
            // Initialize socket debugging
            setupSocketDebugging();

          }else {
            console.error('Socket.io is not available. Please ensure it is loaded before initializing the app.');
            return ;
          }
            this.socketService.on('connect', () => {
                const socketId = this.socketService.id;
                console.log(`Socket connected with ID: ${socketId}`);
                
                // Reinitialize socket event handlers when socket reconnects
                if (notificationManager.initialized) {
                    console.log('Reinitializing notification socket handlers after connection');
                    notificationManager.reinitializeSocketHandlers();
                } else {
                    // If notificationManager isn't initialized yet, initialize it on next tick
                    console.log('NotificationManager not initialized yet, will be initialized soon');
                    setTimeout(() => {
                        if (notificationManager.initialized) {
                            console.log('Reinitializing notification socket handlers after delay');
                            notificationManager.reinitializeSocketHandlers();
                        }
                    }, 500);
                }
                
                // Dispatch an event to notify components about socket connection
                document.dispatchEvent(new CustomEvent('socketConnected', {
                    detail: { socketId: socketId }
                }));
            });
            
            this.socketService.on('disconnect', () => {
                console.log('Socket disconnected');
                // components.showToast('warning', 'Disconnected', 'Attempting to reconnect...', 3000);
                console.log('Chat socket disconnected');
            });
        
        
        // Initialize notification manager after a short delay to ensure DOM is ready
        setTimeout(() => {
             notificationManager.init();
        }, 100);
    }
  }

const app = new App();

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize accessibility features
    // accessibility.enhanceKeyboardNavigation();
    
    // Initialize the application
    await app.init();

    // Apply localization to the page after initialization
    document.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { 
        language: localization.currentLanguage, 
        isRTL: localization.isRTL 
      }
    }));

    //        // Add cleanup on page unload
    // window.addEventListener('beforeunload', () => {
    //         app.destroy();
    //     });
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
