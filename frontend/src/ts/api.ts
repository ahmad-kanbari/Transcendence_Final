import utils from './utils';
import { PAGES, ENDPOINTS } from './constants';
import app, { User } from './app';
import { baseURL } from './constants';
import { CONFIG } from './constants';
import toastManager from './toastManager';
// Define interfaces for API responses and data
interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
  authExpired?: boolean;
  [key: string]: any;
}

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

interface UserData {
  user: any;
  isAuthenticated?: boolean;
}

interface AuthUrlResponse {
  success: boolean;
  auth_url?: string;
  error?: string;
  [key: string]: any; // Allow additional properties
}

interface PageFetchResult {
  name: string;
  element: HTMLElement;
}

interface PagesCollection {
  [key: string]: HTMLElement | null;
}

interface MatchData {
  matchId: number | null;
  player1_id: number;
  player2_id: number | null;
  player1_name: string;
  player2_name: string;
  player1_score: number;
  player2_score: number;
  winner: string;
  match_type: string;
}



class API {
  generateDeviceId() {
    return crypto.randomUUID();
  }

  async fetchHtml(url: string, returnElement: boolean = true): Promise<HTMLElement | ChildNode | null> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) 
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      
      const html = await response.text();
      
      const tempElement = document.createElement('div');
      tempElement.innerHTML = html;
      
      return returnElement ? tempElement.firstChild : tempElement;
    } catch (error) {
      console.error(`Error fetching HTML from ${url}:`, error);
      throw error;
    }
  }

  async fetchAllPages(): Promise<PagesCollection> {
    try {
      const promises = Object.entries(PAGES).map(([name, url]) => 
        this.fetchHtml(url as string, false).then(element => ({ name, element }))
      );
      
      const results = await Promise.all(promises) as PageFetchResult[];
      
      const pages: PagesCollection = {};
      results.forEach(result => {
        pages[result.name] = result.element as HTMLElement;
      });
      
      return pages;
    } catch (error) {
      console.error(`Error fetching pages:`, error);
      throw error;
    }
  }

  async login(loginData: LoginData): Promise<ApiResponse> {
    try {
      console.log('entering the api',ENDPOINTS.auth.login, loginData);
      const response = await fetch(ENDPOINTS.auth.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      });

      const result = await response.json();
      console.log('Loggin result: in apis', result);
      if (!response.ok) {
        return { success: false, error: result.error || 'Login failed' };
      }

      if (!result.user)
        return { success: false, error: 'No user data received from server' };
      
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('isAuthenticated', 'false');
      
      return { success: true, data: result.user };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  async register(registerData: RegisterData): Promise<ApiResponse> {
    try {
      console.log('entering the api',ENDPOINTS.auth.register, registerData);
      const response = await fetch(ENDPOINTS.auth.register, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registerData)
      });

      const result = await response.json();
      // console.log('Registration result: in apis', result);
      if (!response.ok) {
        const err = result.error || result.email || result.username || result.password || result.confirmPassword || 'Registration failed';
        return { success: false, error: err };
      }
      
      return { success: true, data: result.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async logout(): Promise<ApiResponse> {
    try {
      console.log('Logging out from API');
      await fetch(ENDPOINTS.auth.logout, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deviceId: localStorage.getItem("deviceId") })
      });

      utils.cleanUp();

      return { success: true };
    } catch (error: any) {
      utils.cleanUp();

      return { success: false, error: error.message };
    }
  }

   async updateUserPassword(newPassword:string, currentPassword: string): Promise<ApiResponse> {
    try {
      console.log('updating user password');
      let message = await this.fetchWithAutoRefresh(ENDPOINTS.user.updateUser, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          newPassword: newPassword, 
          currentPassword: currentPassword
        })
      });
      console.log('Update user password message:', message);
      return { success: true , response: message };
    } catch (error: any) {  
      console.error('Update user password error:', error);
      return { success: false, error: error.message };
    }
  }

     async updateUserEmail(userEmail:string): Promise<ApiResponse> {
    try {
      console.log('updating user email');
      let message = await this.fetchWithAutoRefresh(ENDPOINTS.user.updateUser, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email: userEmail,
        })
      });
      console.log('Update user email message:', message);
      return { success: true , response: message };
    } catch (error: any) {  
      console.error('Update user email error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUserUsername(useranme: string): Promise<ApiResponse> {
    try {
      console.log('updating user username');
      let message = await this.fetchWithAutoRefresh(ENDPOINTS.user.updateUser, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username: useranme 
        })
      });
      console.log('Update user username message:', message);
      return { success: true , response: message };
    } catch (error: any) {  
      console.error('Update user username error:',  error );
      return { success: false, error: error.message };
    }
  }
  getGoogleAuthUrl(): AuthUrlResponse{
    try {

      let deviceId = localStorage.getItem("deviceId")?? null;
      if (!deviceId) {
        deviceId = api.generateDeviceId();
        localStorage.setItem("deviceId", deviceId);
      }
      console.log('Device ID:', deviceId);
  
      // Create JSON and base64 encode it
      const state = encodeURIComponent(btoa(JSON.stringify({ deviceId })));
      console.log('State:', state);
      const authUrl = `${baseURL}/auth/google/login?state=${state}`;

    
      // Return the auth URL directly
      return { 
        success: true, 
        auth_url: authUrl 
      };
    } catch (error: any) {
      utils.cleanUp();
      console.error('Google OAuth Error:', error);
      return { success: false, error: error.message };
    }

  }
 
    async getCurrentUser(retryCount: number = 0): Promise<ApiResponse<UserData>> {
      try {
          const response = await fetch(ENDPOINTS.user.showUser, {
              method: 'GET',
              credentials: 'include',
              headers: {
                  'Content-Type': 'application/json'
              }
          });

          if (response.status === 401 && retryCount < 1) {
              const refreshResult = await this.refreshToken();
              
              if (refreshResult.success) {
                  return await this.getCurrentUser(retryCount + 1);
              } else {
                  console.error('Token refresh failed:', refreshResult.error);
                  utils.cleanUp(); 
                  return { 
                      success: false, 
                      error: 'Authentication expired. Please log in again.',
                      authExpired: true 
                  };
              }
          }
          
          if (!response.ok) {
              throw new Error(`Failed to fetch current user: ${response.status}`);
          }
          
          const userData = await response.json();
          
          // Store user data locally
          localStorage.setItem('user', JSON.stringify(userData.user));
          localStorage.setItem('isAuthenticated', 'true');

          return { 
              success: true, 
              data: { user: userData.user, isAuthenticated: true }
          };
      } catch (error: any) {
          console.error(`Error in getCurrentUser (attempt ${retryCount + 1}):`, error);
          return { success: false, error: error.message };
      }
  }

  /**
   * Fetch all users (requires authentication)
   */
  async getAllUsers(retryCount: number = 0): Promise<ApiResponse> {
      try {
          const response = await fetch(ENDPOINTS.user.allUsers, {
              method: 'GET',
              credentials: 'include',
              headers: {
                  'Content-Type': 'application/json'
              }
          });

          if (response.status === 401 && retryCount < 1) {
              const refreshResult = await this.refreshToken();
              
              if (refreshResult.success) {
                  return await this.getAllUsers(retryCount + 1);
              } else {
                  console.error('Token refresh failed:', refreshResult.error);
                  utils.cleanUp(); 
                  return { 
                      success: false, 
                      error: 'Authentication expired. Please log in again.',
                      authExpired: true 
                  };
              }
          }
          
          if (!response.ok) {
              const errorData = await response.json();
              return { 
                  success: false, 
                  error: errorData.error || `Failed to fetch users: ${response.status}` 
              };
          }
          
          const usersData = await response.json();
          
          return { 
              success: true, 
              data: usersData 
          };
      } catch (error: any) {
          console.error(`Error in getAllUsers (attempt ${retryCount + 1}):`, error);
          return { success: false, error: error.message };
      }
  }

  /**
   * Fetch a specific user by ID
   */
  async getUserById(userId: string, retryCount: number = 0): Promise<ApiResponse> {
      try {
          const response = await this.fetchWithAutoRefresh(`${ENDPOINTS.user.singleUser}${Number(userId)}`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                  'Content-Type': 'application/json'
              }
          });
          if (response.status === 401 && retryCount < 1) {
              const refreshResult = await this.refreshToken();
              
              if (refreshResult.success) {
                  return await this.getUserById(userId, retryCount + 1);
              } else {
                  console.error('Token refresh failed:', refreshResult.error);
                  utils.cleanUp(); 
                  return { 
                      success: false, 
                      error: 'Authentication expired. Please log in again.',
                      authExpired: true 
                  };
              }
          }

          
          if (!response.ok) {
              const errorData = await response.json();
              return { 
                  success: false, 
                  error: errorData.error || `Failed to fetch user: ${response.status}` 
              };
          }
          
          const userData = await response.json();
          
          return { 
              success: true, 
              data: userData 
          };
      } catch (error: any) {
          return { success: false, error: error.message };
      }
  }

  async refreshToken(): Promise<ApiResponse> {
    try {
      const refreshEndpoint = ENDPOINTS.auth.refreshToken;
   
      const response = await fetch(refreshEndpoint, {
        method: 'POST',
        credentials: 'include', 
        headers: {
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        utils.cleanUp();
        return { success: false, error: 'Token refresh failed' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Token refresh error:', error);
      return { success: false, error: error.message };
    }
  }

  async setup2FA(retryCount: number = 0): Promise<any> {
    try {
      const response = await fetch(ENDPOINTS.auth.setup2FA, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (response.status === 401 && retryCount < 1) {
        const refreshResult = await this.refreshToken();
        
        if (refreshResult.success) {
          return await this.setup2FA(retryCount + 1);
        } else {
          console.error('Token refresh failed:', refreshResult.error);
          utils.cleanUp(); 
          throw new Error('Authentication expired. Please log in again.');
        }
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API.setup2FA: Error response', errorData);
        throw new Error(errorData.error || 'Failed to setup 2FA');
      }
      
      const responseData = await response.json();
      
      return responseData;
    } catch (error: any) {
      console.error(`API.setup2FA: Error caught (attempt ${retryCount + 1})`, error);
      throw error;
    }
  }
  
  async verify2FA(code: string, retryCount: number = 0): Promise<ApiResponse> {
    try {
      
      const response = await fetch(ENDPOINTS.auth.verify2FA, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ otp_token: code })
      });
      
      if (response.status === 401 && retryCount < 1) {
        const refreshResult = await this.refreshToken();
        
        if (refreshResult.success) {
          return await this.verify2FA(code, retryCount + 1);
        } else {
          console.error('Token refresh failed:', refreshResult.error);
          utils.cleanUp(); 
          return { 
            success: false, 
            error: 'Authentication expired. Please log in again.',
            authExpired: true 
          };
        }
      }
      
      const responseData = await response.json();
      
      if (!response.ok) {
        return { 
          success: false, 
          error: responseData.error || 'Failed to verify 2FA code' 
        };
      }
      
      return { 
        success: true, 
        ...responseData 
      };
    } catch (error: any) {
      console.error(`2FA verification error (attempt ${retryCount + 1}):`, error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  async disable2FA(code: string, retryCount: number = 0): Promise<ApiResponse> {
    try {
      const response = await fetch(ENDPOINTS.auth.disable2FA, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ otp_token: code })
      });
      
      if (response.status === 401 && retryCount < 1) {
        const refreshResult = await this.refreshToken();
        
        if (refreshResult.success) {
          return await this.disable2FA(code, retryCount + 1);
        } else {
          console.error('Token refresh failed:', refreshResult.error);
          utils.cleanUp(); 
          return { 
            success: false, 
            error: 'Authentication expired. Please log in again.',
            authExpired: true 
          };
        }
      }
      
      const responseData = await response.json();
      
      if (!response.ok) {
        return { 
          success: false, 
          error: responseData.error || 'Failed to disable 2FA' 
        };
      }
      
      return { 
        success: true, 
        ...responseData 
      };
    } catch (error: any) {
      console.error(`2FA disabling error (attempt ${retryCount + 1}):`, error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async createMatch(matchData: MatchData, retryCount: number = 0): Promise<ApiResponse> {
    try {
      const response = await this.fetchWithAutoRefresh(ENDPOINTS.game.create_match, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(matchData)
      });
      if (response.status === 401 && retryCount < 1) {
        const refreshResult = await this.refreshToken();
        if (refreshResult.success) {
          return await this.createMatch(matchData, retryCount + 1);
        } else {
          console.error('Token refresh failed:', refreshResult.error);
          utils.cleanUp();
          return { success: false, error: 'Authentication expired. Please log in again.', authExpired: true };
        }
      }
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to create match' };
      }
      return { success: true, data };
    } catch (error: any) {
      console.error(`submitMatch error (attempt ${retryCount + 1}):`, error);
      return { success: false, error: error.message };
    }
  }


  
    /**
     * Submit a regular match (1v1 or 1vAi)
     */
    async submitRegularMatch(matchData: {
      matchId: number;
      player1_score: number;
      player2_score: number;
      is_multiplayer: boolean;
    }, retryCount: number = 0): Promise<ApiResponse> {
      try {
        const response = await this.fetchWithAutoRefresh(`${ENDPOINTS.game.adjust_match}/${matchData.matchId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            player1_score: matchData.player1_score,
            player2_score: matchData.player2_score,
            is_multiplayer: matchData.is_multiplayer
          })
        });

        if (response.status === 401) {
        
            console.error('Token refresh failed:', response.statusText);
            utils.cleanUp();
            return { 
              success: false, 
              error: 'Authentication expired. Please log in again.',
              authExpired: true 
            };
        }

        const data = await response.json();
        if (!response.ok) {
          return { success: false, error: data.error || 'Failed to submit Regular match' };
        }

        return { success: true, data };
      } catch (error: any) {
        console.error(`submitRegularMatch error (attempt ${retryCount + 1}):`, error);
        return { success: false, error: error.message };
      }
    }

      /**
     * Submit a multiplayer match
     */
    async submitMultiplayerMatch(matchData: {
      matchId: number;
      team1_score: number;
      team2_score: number;
      is_multiplayer: boolean;
    }, retryCount: number = 0): Promise<ApiResponse> {
      try {
        const response = await this.fetchWithAutoRefresh(`${ENDPOINTS.game.adjust_match}/${matchData.matchId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            team1_score: matchData.team1_score,
            team2_score: matchData.team2_score,
            is_multiplayer: true
          })
        });

        if (response.status === 401 && retryCount < 1) {
          const refreshResult = await this.refreshToken();
          if (refreshResult.success) {
            return await this.submitMultiplayerMatch(matchData, retryCount + 1);
          } else {
            console.error('Token refresh failed:', refreshResult.error);
            utils.cleanUp();
            return { 
              success: false, 
              error: 'Authentication expired. Please log in again.',
              authExpired: true 
            };
          }
        }

        const data = await response.json();
        if (!response.ok) {
          return { success: false, error: data.error || 'Failed to submit multiplayer match' };
        }

        return { success: true, data };
      } catch (error: any) {
        console.error(`submitMultiplayerMatch error (attempt ${retryCount + 1}):`, error);
        return { success: false, error: error.message };
      }
    }

  /**
   * Create a tournament
   */
  async createTournament(playerCapacity: number = 4, retryCount: number = 0): Promise<ApiResponse> {
    try {
      const response = await this.fetchWithAutoRefresh(ENDPOINTS.game.create_tournament, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          player_capacity: playerCapacity
        })
      });

      if (response.status === 401 && retryCount < 1) {
        const refreshResult = await this.refreshToken();
        if (refreshResult.success) {
          return await this.createTournament(playerCapacity, retryCount + 1);
        } else {
          console.error('Token refresh failed:', refreshResult.error);
          utils.cleanUp();
          return { 
            success: false, 
            error: 'Authentication expired. Please log in again.',
            authExpired: true 
          };
        }
      }

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to create tournament' };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error(`createTournament error (attempt ${retryCount + 1}):`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a tournament match
   */
  async createTournamentMatch(tournamentId: number, matchData: {
    player1_id?: number | null;
    player2_id?: number | null;
    player1_name: string;
    player2_name: string;
  }, retryCount: number = 0): Promise<ApiResponse> {
    try {
      const response = await this.fetchWithAutoRefresh(`${baseURL}/tournaments/${tournamentId}/matches`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          player1_id: matchData.player1_id,
          player2_id: matchData.player2_id,
          player1_name: matchData.player1_name,
          player2_name: matchData.player2_name,
      
        })
      });
      console.log('Creating tournament and response is', response);

      if (response.status === 401 && retryCount < 1) {
        const refreshResult = await this.refreshToken();
        if (refreshResult.success) {
          return await this.createTournamentMatch(tournamentId, matchData, retryCount + 1);
        } else {
          console.error('Token refresh failed:', refreshResult.error);
          utils.cleanUp();
          return { 
            success: false, 
            error: 'Authentication expired. Please log in again.',
            authExpired: true 
          };
        }
      }

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to create tournament match' };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error(`createTournamentMatch error (attempt ${retryCount + 1}):`, error);
      return { success: false, error: error.message };
    }
  }


    /**
     * Submit a tournament match result
     */
    async submitTournamentMatch(tournamentId: number, matchId: number, matchData: {
      player1_score: number;
      player2_score: number;
    }, retryCount: number = 0): Promise<ApiResponse> {
      try {
        const response = await this.fetchWithAutoRefresh(`${baseURL}/tournaments/${tournamentId}/matches/${matchId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            player1_score: matchData.player1_score,
            player2_score: matchData.player2_score
          })
        });
        if (!(response.status == 201 || response.status == 200)) { 
            toastManager.error( app.getUsername(),'Failed to submit tournament match');
        }

        if (response.status === 401 && retryCount < 1) {
          const refreshResult = await this.refreshToken();
          if (refreshResult.success) {
            return await this.submitTournamentMatch(tournamentId, matchId, matchData, retryCount + 1);
          } else {
            console.error('Token refresh failed:', refreshResult.error);
            utils.cleanUp();
            return { 
              success: false, 
              error: 'Authentication expired. Please log in again.',
              authExpired: true 
            };
          }
        }

        const data = await response.json();
        if (!response.ok) {
          return { success: false, error: data.error || 'Failed to submit tournament match' };
        }

        return { success: true, data };
      } catch (error: any) {
        console.error(`submitTournamentMatch error (attempt ${retryCount + 1}):`, error);
        return { success: false, error: error.message };
      }
    }

    /**
   * Get all tournaments with pagination
   */
  async getAllTournaments(page: number = 1, limit: number = 10, retryCount: number = 0): Promise<ApiResponse> {
    try {
      const response = await this.fetchWithAutoRefresh(`${baseURL}/tournaments?page=${page}&limit=${limit}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401 && retryCount < 1) {
        const refreshResult = await this.refreshToken();
        if (refreshResult.success) {
          return await this.getAllTournaments(page, limit, retryCount + 1);
        } else {
          console.error('Token refresh failed:', refreshResult.error);
          utils.cleanUp();
          return { 
            success: false, 
            error: 'Authentication expired. Please log in again.',
            authExpired: true 
          };
        }
      }

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to get tournaments' };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error(`getAllTournaments error (attempt ${retryCount + 1}):`, error);
      return { success: false, error: error.message };
    }
  }
  /**
 * Get detailed information for a specific tournament
 * Based on GET /tournaments/:tournamentId endpoint
 */
  async getTournamentDetails(tournamentId: number, retryCount: number = 0): Promise<ApiResponse> {
    try {
      // Validate tournament ID
      if (!tournamentId || isNaN(tournamentId)) {
        return { 
          success: false, 
          error: 'Invalid tournament ID provided' 
        };
      }

      const response = await this.fetchWithAutoRefresh(`${ENDPOINTS.game.get_tournament}/${tournamentId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Handle authentication errors with retry
      if (response.status === 401 && retryCount < 1) {
        const refreshResult = await this.refreshToken();
        if (refreshResult.success) {
          return await this.getTournamentDetails(tournamentId, retryCount + 1);
        } else {
          console.error('Token refresh failed:', refreshResult.error);
          utils.cleanUp();
          return { 
            success: false, 
            error: 'Authentication expired. Please log in again.',
            authExpired: true 
          };
        }
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: errorData.error || `Failed to fetch tournament details: ${response.status} ${response.statusText}` 
        };
      }

      const tournamentData = await response.json();
      
      return { 
        success: true, 
        data: tournamentData 
      };

    } catch (error: any) {
      console.error(`getTournamentDetails error (attempt ${retryCount + 1}):`, error);
      return { 
        success: false, 
        error: error.message || 'Network error occurred while fetching tournament details' 
      };
    }
  }


  /**
   * Unified submit match function that routes to appropriate API based on match type
   */
  async submitMatchByType(matchData: {
    matchId: number;
    match_type: string;
    player1_score: number;
    player2_score: number;
    tournamentId?: number | null;
  }, retryCount: number = 0): Promise<ApiResponse> {
    try {
      switch (matchData.match_type) {
        case 'multiplayer':
          return await this.submitMultiplayerMatch({
            matchId: matchData.matchId,
            team1_score: matchData.player1_score,
            team2_score: matchData.player2_score,
            is_multiplayer: true
          }, retryCount);

        case 'tournament':
          if (!matchData.tournamentId) {
            return { success: false, error: 'Tournament ID is required for tournament matches' };
          }
          return await this.submitTournamentMatch(
            matchData.tournamentId,
            matchData.matchId,
            {
              player1_score: matchData.player1_score,
              player2_score: matchData.player2_score
            },
            retryCount
          );

        case '1v1':
        case '1vAi':
        default:
          return await this.submitRegularMatch({
            matchId: matchData.matchId,
            player1_score: matchData.player1_score,
            player2_score: matchData.player2_score,
            is_multiplayer: false
          }, retryCount);
      }
    } catch (error: any) {
      console.error(`submitMatchByType error (attempt ${retryCount + 1}):`, error);
      return { success: false, error: error.message };
    }
  }

  GetFakeUserData(retryCount: number = 0):ApiResponse<UserData> {
    try {
      const isAuthenticated = true; // Simulate the user being authenticated
      
      const fakeUser: User = {
        profile_picture: "scr/assets/icons/user.png",
        username: "FakeUser123",
        email: "fakeuser123@example.com",
        is_oauth_user: false,
        total_games: 100,
        wins: 60,
        win_rate: (60 / 100) * 100, // Dynamically calculate win rate
        losses: 40,
        rank: "Gold",
        is_two_factor_enabled: true,
        matchHistory: [
          { matchId: "match1", result: "win" },
          { matchId: "match2", result: "loss" },
        ],
        tournaments: [
          { tournamentId: "tourney1", placement: 1 },
          { tournamentId: "tourney2", placement: 3 },
        ],
      };
  
      // Mock storing user data locally as in getUserData
      localStorage.setItem("user", JSON.stringify(fakeUser));
  
      // Return a successful response with the mock user data
      return {
        success: true,
        userData: { user: fakeUser, isAuthenticated },
      };
    } catch (error: any) {
      console.error("Error in GetFakeUserData:", error);
  
      return {
        success: false,
        error: error.message,
      };
    }
  }

  

async fetchWithAutoRefresh(url: string, options: RequestInit = {}) {
  console.log('Fetching URL:', url, 'with options:', options);
	const deviceId = localStorage.getItem("deviceId");
	if (!deviceId) {
		throw new Error("Missing deviceId in localStorage. Ensure it's set during login.");
	}

	const addDeviceIdToBody = (opts : any) => {
		const headers = { ...opts.headers, "Content-Type": "application/json" };
		const originalBody = opts.body ? JSON.parse(opts.body) : {};
		const body = JSON.stringify({ ...originalBody, deviceId });
		return { ...opts, headers, body };
	};

  let finalOptions = { ...options, credentials: 'include' as RequestCredentials };
  if (finalOptions.method && finalOptions.method.toUpperCase() !== "GET") {
    finalOptions = addDeviceIdToBody(finalOptions);
  }

  let res = await fetch(url, finalOptions);

	if (res.status === 401) {
		const refreshRes = await fetch(`${baseURL}/auth/refresh`, {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ deviceId }),
		});

		if (refreshRes.ok) {
      let retryOptions = { ...options, credentials: 'include' as RequestCredentials };
      if (retryOptions.method && retryOptions.method.toUpperCase() !== "GET") {
        retryOptions = addDeviceIdToBody(retryOptions);
      }
      res = await fetch(url, retryOptions);
		}
	}

	return res;
}


  //New APIs 
  // async getCurrentUser() {
  //       const res = await this.fetchWithAutoRefresh(`${CONFIG.baseURL}/users/showUser`);
  //       return res.ok ? await res.json() : null;
  //   }

    async searchUsers(query : any, page = 1, limit = 5) {
      console.log('searching users with query:', query, 'page:', page, 'limit:', limit);
        const res = await this.fetchWithAutoRefresh(
            `${CONFIG.baseURL}/users?search=${query}&page=${page}&limit=${limit}`
        );
        return res.ok ? await res.json() : [];
    }

    // async getUserById(userId : string) {
    //     const res = await this.fetchWithAutoRefresh(`${CONFIG.baseURL}/users/${userId}`);
    //     return res.ok ? await res.json() : null;
    // }

    // Chat endpoints
    async getChats() {
        const res = await this.fetchWithAutoRefresh(`${CONFIG.baseURL}/chats`);
        return res.ok ? await res.json() : [];
    }

    async getChatMessages(chatId : string) {
        const res = await this.fetchWithAutoRefresh(`${CONFIG.baseURL}/chats/${chatId}/messages`);
        return res.ok ? await res.json() : [];
    }

    async sendMessage(chatId : string, content : any) {
        return await this.fetchWithAutoRefresh(`${CONFIG.baseURL}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, content })
        });
    }

    // Notification endpoints
    async getNotifications(type = 'others', page = 1, limit = 5) {
        const res = await this.fetchWithAutoRefresh(
            `${CONFIG.baseURL}/notifications/${type}?page=${page}&limit=${limit}`
        );
        return res.ok ? await res.json() : [];
    }

    async markNotificationsAsOpened(type = 'others') {
        return await this.fetchWithAutoRefresh(`${CONFIG.baseURL}/notifications/${type}`, {
            method: 'PATCH'
        });
    }

    async markNotificationAsRead(notificationId : string) {
        return await this.fetchWithAutoRefresh(`${CONFIG.baseURL}/notifications/others/${notificationId}`, {
            method: 'PATCH'
        });
    }

    async markChatNotificationsAsRead(chatId : string) {
        return await this.fetchWithAutoRefresh(`${CONFIG.baseURL}/notifications/messages/by-chat/${chatId}`, {
            method: 'PATCH'
        });
    }

    // Friendship endpoints
    async getFriendships(status : string | null = null, direction : string | null = null) {
        let url = `${CONFIG.baseURL}/friendships`;
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (direction) params.append('direction', direction);
        if (params.toString()) url += `?${params.toString()}`;

        const res = await this.fetchWithAutoRefresh(url);
        return res.ok ? await res.json() : [];
    }

    async sendFriendRequest(friendId : string) {
        return await this.fetchWithAutoRefresh(`${CONFIG.baseURL}/friendships`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friendId })
        });
    }

    async updateFriendship(friendshipId : string, action : string) {
        return await this.fetchWithAutoRefresh(`${CONFIG.baseURL}/friendships/${friendshipId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });
    }

    async deleteFriendship(friendshipId : string) {
        return await this.fetchWithAutoRefresh(`${CONFIG.baseURL}/friendships/${friendshipId}`, {
            method: 'DELETE'
        });
    }
    /**
 * Create a multiplayer match between 4 users
 * One user is authenticated, three others are local players
 * Based on POST /matches endpoint with multiplayer structure
 */
async createMultiplayerMatch(matchData: {
  team1_name: string;
  team2_name: string;
  players: Array<{
    name: string;
    user_id: number | null;
    team: number;
  }>;
  match_type: "multiplayer";
}, retryCount: number = 0): Promise<ApiResponse> {
  try {
    // Validate multiplayer match data
    // if (!matchData.team1_name || !matchData.team2_name) {
    //   return { 
    //     success: false, 
    //     error: 'Team names are required for multiplayer matches' 
    //   };
    // }

    // if (!Array.isArray(matchData.players) || matchData.players.length !== 4) {
    //   return { 
    //     success: false, 
    //     error: 'Multiplayer matches require exactly 4 players' 
    //   };
    // }

    // // Validate that there's exactly one authenticated user
    // const authenticatedPlayers = matchData.players.filter(player => player.user_id !== null);
    // if (authenticatedPlayers.length !== 1) {
    //   return { 
    //     success: false, 
    //     error: 'Multiplayer matches require exactly one authenticated user and three local players' 
    //   };
    // }

    // Validate team assignments (should have players on both teams)
    // const team1Players = matchData.players.filter(player => player.team === 1);
    // const team2Players = matchData.players.filter(player => player.team === 2);
    
    // if (team1Players.length !== 2 || team2Players.length !== 2) {
    //   return { 
    //     success: false, 
    //     error: 'Each team must have exactly 2 players' 
    //   };
    // }
    console.log('Creating multiplayer match with data:', matchData);
    const response = await this.fetchWithAutoRefresh(ENDPOINTS.game.create_match, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(matchData)
    });
    console.log('createMultiplayerMatch response:', response);
    // Handle authentication errors with retry
    if (response.status === 401 && retryCount < 1) {
      const refreshResult = await this.refreshToken();
      if (refreshResult.success) {
        return await this.createMultiplayerMatch(matchData, retryCount + 1);
      } else {
        console.error('Token refresh failed:', refreshResult.error);
        utils.cleanUp();
        return { 
          success: false, 
          error: 'Authentication expired. Please log in again.',
          authExpired: true 
        };
      }
    }

    // Handle other HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.error || `Failed to create multiplayer match: ${response.status} ${response.statusText}` 
      };
    }

    const responseData = await response.json();
    
    return { 
      success: true, 
      data: responseData 
    };

  } catch (error: any) {
    console.error(`createMultiplayerMatch error (attempt ${retryCount + 1}):`, error);
    return { 
      success: false, 
      error: error.message || 'Network error occurred while creating multiplayer match' 
    };
  }
}
  
}

const api = new API();

export default api;
export { ApiResponse}