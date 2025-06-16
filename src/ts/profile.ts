import api from './api';
import app from './app';
import utils from './utils';
import components from './components';
import { VALIDATION_INPUTS } from './constants';
import { baseURL } from './constants';
// Interface for profile form elements
interface ProfileForm {
  profileUsername?: HTMLElement | null;
  profileAvatar?: HTMLImageElement | null;
  displayNameField?: HTMLInputElement | null;
  emailField?: HTMLInputElement | null;
  statsTotalGames?: HTMLElement | null;
  statsWins?: HTMLElement | null;
  statsLosses?: HTMLElement | null;
  statsWinRate?: HTMLElement | null;
  statsRank?: HTMLElement | null;
  profilePictureInput?: HTMLInputElement | null;
  uploadBtn?: HTMLButtonElement | null;
  removeBtn?: HTMLButtonElement | null;
}

// Interface for match entry
interface MatchEntry {
  type: string;
  vs: string;
  score: string;
  winner: string;
}

// Interface for tournament data
interface Tournament {
  tournament_id: number;
  winner: string;
  matches: any[];
}

class Profile {
  profileForm: ProfileForm;
  initialized: boolean;
  socket: any;
  baseURL: string;
 
  
  constructor() {
    this.profileForm = {};
    this.initialized = false;
    this.baseURL = baseURL;


  }

  
  init(): void {
    if (this.initialized) return;
    
    document.addEventListener('pageShown', (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.page === 'profile')
        this.initProfilePage();
    });
    
    this.initialized = true;
  }
  
  getProfileForm(): ProfileForm {
  
    return {
      profileUsername: document.getElementById('profileUsername'),
      profileAvatar: document.getElementById('profileAvatar') as HTMLImageElement | null,
      displayNameField: document.getElementById('settingDisplayName') as HTMLInputElement | null,
      emailField: document.getElementById('settingEmail') as HTMLInputElement | null,
      statsTotalGames: document.getElementById('statsTotalGames'),
      statsWins: document.getElementById('statsWins'),
      statsLosses: document.getElementById('statsLosses'),
      statsWinRate: document.getElementById('statsWinRate'),
      statsRank: document.getElementById('statsRank'),
      profilePictureInput: document.getElementById('profilePictureInput') as HTMLInputElement | null,
      uploadBtn: document.getElementById('uploadBtn') as HTMLButtonElement | null,
      removeBtn: document.getElementById('removeBtn') as HTMLButtonElement | null
    };
  }
  
  initProfilePage(): void {
    this.profileForm = this.getProfileForm();
    
    this.loadProfileData();
    this.setupProfilePictureHandlers();
    this.init2FA();

    if (this.profileForm.displayNameField) 
      utils.setupInputField(this.profileForm.displayNameField, 'username', components);
    
    if (this.profileForm.emailField) 
      utils.setupInputField(this.profileForm.emailField, 'email', components);
  }

   async loadProfileData(): Promise<void> {
    try {
      // Check authentication first
      const authRes = await this.fetchWithAutoRefresh(`${this.baseURL}/users/showUser`);
      if (!authRes.ok) {
        window.location.href = 'index.html';
        return;
      }

      // Make body visible
      document.body.style.visibility = 'visible';
      document.body.style.opacity = '1';

      // Get user ID from URL params or current user
      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get('userId');

       let usertest =await api.getUserById('10');
        console.log('User test data:', usertest);
      let userData;
      if (userId) {
        // Loading another user's profile
        const userRes = await this.fetchWithAutoRefresh(`${this.baseURL}/users/${userId}`);
        if (!userRes.ok) throw new Error('Failed to fetch user data');
        userData = await userRes.json();
      } else {
        // Loading current user's profile
        userData = await authRes.json();
        console.log('Current user data in the profile: ', userData.user.user);
        userData = userData.user.user;
      }

      let userFullData = await api.getUserById(userData.id);

      this.populateProfileData(userFullData);
      
    } catch (err) {
      console.error('Error loading profile:', err);
      components.showToast('error', 'Profile Error', 'Failed to load profile data');
    }
  }
  
  populateProfileData(userData?: any): void {
    
    const user = userData || app.state.user;
        
    console.log('populate with userData:', userData, "app user data: ", app.state.user);

    if (!user) {
      console.warn('No user data found, cannot populate profile data');
      return;
    }

    //get full user Data

    if (this.profileForm.profileUsername)
      this.profileForm.profileUsername.textContent = user.username || app.getUsername() || 'Username';
    
    if (this.profileForm.profileAvatar) {
      // First check localStorage for cached profile picture
      const cachedImage = this.getProfilePictureFromLocalStorage();
      
      if (cachedImage) {
        this.profileForm.profileAvatar.src = cachedImage;
        console.log('Using cached profile picture from localStorage');
      } else if (user.profile_picture) {
        // Use server URL if no cached version
        this.profileForm.profileAvatar.src = user.profile_picture;
      } else {
        // Fallback to default
        this.profileForm.profileAvatar.src = app.getUserImg() || 'src/assets/icons/user.png';
      }
    }
    
    if (this.profileForm.displayNameField)
      this.profileForm.displayNameField.value = user.username || app.getUsername() || '';
    
    if (this.profileForm.emailField)
      console.log('Setting email field value:', app.state.user!.email,'another way : ', app.getEmail());
      this.profileForm.emailField!.value = app.state.user!.email || app.getEmail() || '';
    
    if (this.profileForm.statsTotalGames)
      this.profileForm.statsTotalGames.textContent = app.getTotalGamesPlayed().toString() || '0';
    
    if (this.profileForm.statsWins)
      this.profileForm.statsWins.textContent = app.getTotalWins().toString() || '0';
    
    if (this.profileForm.statsLosses)
      this.profileForm.statsLosses.textContent = app.getTotalLosses().toString() || '0';
    
    if (this.profileForm.statsWinRate)
      this.profileForm.statsWinRate.textContent = app.getWinRate().toString() || '0';
    
    if (this.profileForm.statsRank)
      this.profileForm.statsRank.textContent = app.getRank() || 'Beginner';
    
    this.update2FAUI(user);
    this.renderMatchHistory();
  }

  setupProfilePictureHandlers(): void {
    const { uploadBtn, removeBtn, profilePictureInput, profileAvatar } = this.profileForm;

    if (!uploadBtn || !profilePictureInput) return;

    uploadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      profilePictureInput.click();
    });

    profilePictureInput.addEventListener('change', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        components.showToast('error', 'File Too Large', 'Please select an image smaller than 5MB');
        return;
      }
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await this.fetchWithAutoRefresh(
          `${this.baseURL}/users/uploads/profile-picture`,
          {
            method: 'POST',
            credentials: 'include',
            body: formData,
          }
        );

        if (!res.ok) throw new Error('Failed to upload profile picture');

        const data = await res.json();
        // Convert file to base64 and save to localStorage
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64String = event.target?.result as string;
          this.saveProfilePictureToLocalStorage(base64String);
          
          if (profileAvatar) {
            profileAvatar.src = base64String;
          }
          
          // Update user state if available
          if (app.state.user) {
            app.state.user.profile_picture = data.url;
            localStorage.setItem('user', JSON.stringify(app.state.user));
          }
        };
        reader.readAsDataURL(file);
        
        components.showToast('success', 'Success', 'Profile picture updated successfully');
      } catch (err) {
        console.error('Error uploading profile picture:', err);
        components.showToast('error', 'Upload Error', 'Failed to upload profile picture');
      }
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        try {
          const res = await this.fetchWithAutoRefresh(
            `${this.baseURL}/users/uploads/profile-picture`,
            {
              method: 'DELETE',
              credentials: 'include',
            }
          );

          if (!res.ok) throw new Error('Failed to remove profile picture');

          // Remove from localStorage
          this.removeProfilePictureFromLocalStorage();

          if (profileAvatar) {
            profileAvatar.src = 'src/assets/icons/user.png';
          }

          // Update user state if available
          if (app.state.user) {
            app.state.user.profile_picture = 'src/assets/icons/user.svg';
            localStorage.setItem('user', JSON.stringify(app.state.user));
          }
          
          components.showToast('success', 'Success', 'Profile picture removed successfully');
        } catch (err) {
          console.error('Error removing profile picture:', err);
          components.showToast('error', 'Remove Error', 'Failed to remove profile picture');
        }
      });
    }
  }
saveProfilePictureToLocalStorage(base64String: string): void {
    try {
      const userId = app.state.user?.id || 'default';
      const storageKey = `profile_picture_${userId}`;
      
      // Store with timestamp for cache management
      const profilePictureData = {
        image: base64String,
        timestamp: Date.now(),
        userId: userId
      };
      
      localStorage.setItem(storageKey, JSON.stringify(profilePictureData));
      
      // Also store the current active profile picture key
      localStorage.setItem('current_profile_picture_key', storageKey);
      
      console.log('Profile picture saved to localStorage');
    } catch (error) {
      console.error('Failed to save profile picture to localStorage:', error);
      // Handle localStorage quota exceeded
      if (error instanceof DOMException && error.code === 22) {
        components.showToast('warning', 'Storage Full', 'Unable to cache profile picture locally');
      }
    }
  }

  removeProfilePictureFromLocalStorage(): void {
    try {
      const userId = app.state.user?.id || 'default';
      const storageKey = `profile_picture_${userId}`;
      
      localStorage.removeItem(storageKey);
      localStorage.removeItem('current_profile_picture_key');
      
      console.log('Profile picture removed from localStorage');
    } catch (error) {
      console.error('Failed to remove profile picture from localStorage:', error);
    }
  }

  getProfilePictureFromLocalStorage(): string | null {
    try {
      console.log('Checking localStorage for profile picture...', app.state.user);
      const userId = app.state.user?.id || app.state.user?.id || 'default';
      const storageKey = `profile_picture_${userId}`;
      
      const savedData = localStorage.getItem(storageKey);
      if (!savedData) return null;
      
      const profilePictureData = JSON.parse(savedData);
      
      // Check if data is less than 7 days old (optional cache expiration)
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - profilePictureData.timestamp > sevenDaysInMs) {
        this.removeProfilePictureFromLocalStorage();
        return null;
      }
      
      return profilePictureData.image;
    } catch (error) {
      console.error('Failed to get profile picture from localStorage:', error);
      return null;
    }
  }

 

  async fetchWithAutoRefresh(url: string, options: RequestInit = {}): Promise<Response> {
    // Implement your fetch with auto refresh logic here
    // This should handle authentication and token refresh
    return fetch(url, {
      credentials: 'include',
      ...options
    });
  }
  
  update2FAUI(userData?: any): void {
    console.log('Updating 2FA UI with userData:', userData, "app user data: ", app.state.user);
    const user = userData || app.state.user;
    const is2FAEnabled = user?.two_factor_enabled || user?.is_two_factor_enabled || app.get2FAState() || false;
    
    const twoFAStatus = document.getElementById('twoFAStatus');
    const enableTwoFABtn = document.getElementById('enableTwoFABtn');
    const disableTwoFABtn = document.getElementById('disableTwoFABtn');
    
    if (twoFAStatus) {
      if (is2FAEnabled) {
        twoFAStatus.textContent = 'Enabled';
        twoFAStatus.className = 'font-cyber bg-cyber-green text-cyber-dark px-2 py-1 rounded text-sm';
      } else {
        twoFAStatus.textContent = 'Disabled';
        twoFAStatus.className = 'font-cyber bg-cyber-pink text-cyber-dark px-2 py-1 rounded text-sm';
      }
    }
    
    if (enableTwoFABtn && disableTwoFABtn) {
      if (is2FAEnabled) {
        enableTwoFABtn.style.display = 'none';
        disableTwoFABtn.style.display = 'block';
        disableTwoFABtn.classList.remove('hidden');
      } else {
        enableTwoFABtn.style.display = 'block';
        enableTwoFABtn.classList.remove('hidden');
        disableTwoFABtn.style.display = 'none';
        disableTwoFABtn.classList.add('hidden');
      }
    }
  }
  
init2FA(): void {
    const modal = document.getElementById('twoFAModal');
    const enableBtn = document.getElementById('enableTwoFABtn');
    const disableBtn = document.getElementById('disableTwoFABtn');
    const closeBtn = document.getElementById('twoFACloseButton');
    const form = document.getElementById('twoFAForm');
    
    if (enableBtn) {
      enableBtn.addEventListener('click', (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        
        if (modal) {
          const qrSection = document.getElementById('qrCodeSection');
          if (qrSection) {
            qrSection.classList.remove('hidden');
            qrSection.style.display = 'block';
          }
          
          modal.classList.remove('hidden');
          modal.style.display = 'flex';
          
          this.setup2FA();
        }
        
        return false;
      });
    }
    
    if (disableBtn) {
      disableBtn.addEventListener('click', (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        
        if (modal) {
          const qrSection = document.getElementById('qrCodeSection');
          if (qrSection) {
            qrSection.classList.add('hidden');
            qrSection.style.display = 'none';
          }
          
          // Update modal for disable flow
          const modalTitle = modal.querySelector('.two-fa-title');
          if (modalTitle) modalTitle.textContent = 'Disable Two-Factor Authentication';
          
          const buttonText = modal.querySelector('[data-button-text]');
          if (buttonText) buttonText.textContent = 'Disable 2FA';
          
          modal.classList.remove('hidden');
          modal.style.display = 'flex';
        }
        
        return false;
      });
    }
    
    if (form) {
      form.addEventListener('submit', (e: Event) => {
        e.preventDefault();
        
        if (enableBtn && !enableBtn.classList.contains('hidden') && enableBtn.style.display !== 'none') 
          this.verify2FACode();
        else 
          this.disable2FA();
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (modal) {
          modal.classList.add('hidden');
          modal.style.display = 'none';
          this.resetModalState();
        }
      });
    }
    
    if (modal) {
      modal.addEventListener('click', (e: MouseEvent) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
          modal.style.display = 'none';
          this.resetModalState();
        }
      });
    }
  }

  resetModalState(): void {
    const modal = document.getElementById('twoFAModal');
    if (!modal) return;

    const modalTitle = modal.querySelector('.two-fa-title');
    if (modalTitle) modalTitle.textContent = 'Two-Factor Authentication';

    const buttonText = modal.querySelector('[data-button-text]');
    if (buttonText) buttonText.textContent = 'Verify';

    const codeInput = document.getElementById('twoFACode') as HTMLInputElement;
    if (codeInput) codeInput.value = '';

    const errorElement = document.getElementById('twofa-error');
    if (errorElement) {
      errorElement.classList.add('hidden');
      errorElement.style.display = 'none';
    }
  }
  
 async setup2FA(): Promise<void> {
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    const secretKeyElement = document.getElementById('secretKey');
    const errorElement = document.getElementById('twofa-error');
    
    if (!qrCodeContainer || !secretKeyElement) {
      console.error('setup2FA: Required elements not found');
      return;
    }
    
    qrCodeContainer.innerHTML = `<div class="animate-spin text-cyber-blue h-12 w-12 border-4 border-cyber-blue border-t-transparent rounded-full mx-auto" role="status">
      <span class="sr-only">Loading...</span>
    </div>`;
    secretKeyElement.textContent = 'Loading...';
    
    if (errorElement) {
      errorElement.classList.add('hidden');
      errorElement.style.display = 'none';
    }
    
    try {
      const response = await this.fetchWithAutoRefresh(`${this.baseURL}/auth/2fa/setup`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to start 2FA setup');
      }

      const data = await response.json();
      
      if (!data || !data.qrCode) {
        throw new Error(data.error || 'Failed to set up 2FA');
      }
      
      const qrImg = document.createElement('img');
      qrImg.src = data.qrCode;
      qrImg.alt = 'QR Code for 2FA';
      qrImg.className = 'max-w-full';
      
      qrCodeContainer.innerHTML = '';
      qrCodeContainer.appendChild(qrImg);
      
      if (data.secret) {
        secretKeyElement.textContent = data.secret;
      }
    } catch (error: any) {
      qrCodeContainer.innerHTML = '<div class="text-cyber-pink">Failed to load QR code</div>';
      secretKeyElement.textContent = 'Error loading secret key';
      
      if (errorElement) {
        errorElement.textContent = error.message || 'Failed to set up 2FA';
        errorElement.classList.remove('hidden');
        errorElement.style.display = 'block';
      }
    }
  }
  
  async verify2FACode(): Promise<void> {
    const codeInput = document.getElementById('twoFACode') as HTMLInputElement | null;
    const errorElement = document.getElementById('twofa-error');
    const submitButton = document.querySelector('#twoFAForm button[type="submit"]') as HTMLButtonElement;
    
    if (!codeInput) return;
    
    const code = codeInput.value;
    
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      if (errorElement) {
        errorElement.textContent = 'Please enter a valid 6-digit code';
        errorElement.classList.remove('hidden');
        errorElement.style.display = 'block';
      }
      return;
    }
    
    utils.setFormLoading(submitButton, true);
    
    try {
      const response = await this.fetchWithAutoRefresh(`${this.baseURL}/auth/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: code }),
      });

      if (!response.ok) {
        throw new Error('Invalid verification code');
      }

      const data = await response.json();
      
      utils.setFormLoading(submitButton, false);
      
      if (data.success) {
        if (app.state.user) {
          app.state.user.is_two_factor_enabled = true;
          localStorage.setItem('user', JSON.stringify(app.state.user));
     
        }
        
        this.update2FAUI();
        
        components.showToast('success', '2FA Enabled', 'Two-factor authentication has been successfully enabled.');
        
        const modal = document.getElementById('twoFAModal');
        if (modal) {
          modal.classList.add('hidden');
          modal.style.display = 'none';
        }

        // Reload profile data to update UI
        setTimeout(() => {
          this.loadProfileData();
        }, 1500);
      } else {
        if (errorElement) {
          errorElement.textContent = data.error || 'Verification failed';
          errorElement.classList.remove('hidden');
          errorElement.style.display = 'block';
        }
      }
    } catch (error: any) {
      components.showToast('error', '2FA Verification Error', error.message || 'Failed to verify 2FA');
      
      utils.setFormLoading(submitButton, false);
      
      if (errorElement) {
        errorElement.textContent = error.message || 'Failed to enable 2FA';
        errorElement.classList.remove('hidden');
        errorElement.style.display = 'block';
      }
    }
  }
  
  async disable2FA(): Promise<void> {
    const codeInput = document.getElementById('twoFACode') as HTMLInputElement | null;
    const errorElement = document.getElementById('twofa-error');
    const submitButton = document.querySelector('#twoFAForm button[type="submit"]') as HTMLButtonElement;
    
    if (!codeInput) return;
    
    const code = codeInput.value;
    
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      if (errorElement) {
        errorElement.textContent = 'Please enter a valid 6-digit code';
        errorElement.classList.remove('hidden');
        errorElement.style.display = 'block';
      }
      return;
    }
    
    utils.setFormLoading(submitButton, true);
    
    try {
      const response = await this.fetchWithAutoRefresh(`${this.baseURL}/auth/2fa/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: code }),
      });

      if (!response.ok) {
        throw new Error('Failed to disable 2FA');
      }

      const data = await response.json();
      
      utils.setFormLoading(submitButton, false);
      
      if (data.success) {
        if (app.state.user) {
          app.state.user.is_two_factor_enabled = false;
          localStorage.setItem('user', JSON.stringify(app.state.user));
        }
        
        this.update2FAUI();
        
        components.showToast('success', '2FA Disabled', 'Two-factor authentication has been successfully disabled.');
        
        const modal = document.getElementById('twoFAModal');
        if (modal) {
          modal.classList.add('hidden');
          modal.style.display = 'none';
        }

        this.resetModalState();
        this.loadProfileData();
      } else {
        if (errorElement) {
          errorElement.textContent = data.error || 'Failed to disable 2FA';
          errorElement.classList.remove('hidden');
          errorElement.style.display = 'block';
        }
      }
    } catch (error: any) {
      components.showToast('error', '2FA Disable Error', error.message || 'Failed to disable 2FA');
      
      utils.setFormLoading(submitButton, false);
      
      if (errorElement) {
        errorElement.textContent = error.message || 'Failed to disable 2FA';
        errorElement.classList.remove('hidden');
        errorElement.style.display = 'block';
      }
    }
  }

  renderMatchHistory(): void {
    const tableBody = document.getElementById('matchHistoryTable');
    if (!tableBody) return;
    
    const table = tableBody.closest('table');
    if (!table) return;
    
    const tableHead = table.querySelector('thead');
    if (!tableHead) return;

    tableHead.innerHTML = `<tr>
      <th class="font-cyber text-cyber-blue px-4 py-3 text-left">Type</th>
      <th class="font-cyber text-cyber-blue px-4 py-3 text-left">Vs</th>
      <th class="font-cyber text-cyber-blue px-4 py-3 text-left">Score</th>
      <th class="font-cyber text-cyber-blue px-4 py-3 text-left">Result</th>
    </tr>`;

    const currentUser = app.getUsername();
    const history = app.state.user?.matchHistory || [];
    const entries = utils.extractMatchData(history, currentUser);

    tableBody.innerHTML = '';
    if (entries.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-gray-400">No match history available</td></tr>`;
    } else {
      entries.forEach(entry => {
        const tr = document.createElement('tr');
        if (entry.winner === currentUser) {
          tr.classList.add('match-win');
        } else {
          tr.classList.add('match-loss');
        }
        tr.innerHTML = `
          <td class="px-4 py-3">${entry.type}</td>
          <td class="px-4 py-3">${entry.vs}</td>
          <td class="px-4 py-3">${entry.score}</td>
          <td class="px-4 py-3">${entry.winner}</td>
        `;
        tableBody.appendChild(tr);
      });
    }
    // Render tournaments after match history
    this.renderTournamentMatches(tableBody);
  }

  // Render tournament matches grouped with a blank separator before each
  renderTournamentMatches(tableBody: HTMLElement): void {
    const currentUser = app.getUsername();
    const tournaments = app.state.user?.tournaments || [];
    tournaments.forEach((tournament: Tournament) => {
      // Tournament summary row (ID and winner)
      const summary = document.createElement('tr');
      summary.classList.add('bg-cyber-blue', 'bg-opacity-20');
      summary.innerHTML = `
        <td colspan="4" class="text-center font-cyber text-cyber-blue px-4 py-3">
          Tournament #${tournament.tournament_id} — Winner: ${tournament.winner}
        </td>`;
      tableBody.appendChild(summary);
      // Add each tournament match
      tournament.matches.forEach(match => {
        const entry = utils.makeEntry(match, currentUser);
        const tr = document.createElement('tr');
        // Style all tournament match rows by the tournament winner
        if (tournament.winner === currentUser) tr.classList.add('match-win');
        else tr.classList.add('match-loss');
        tr.innerHTML = `
          <td class="px-4 py-3">${entry.type}</td>
          <td class="px-4 py-3">${entry.vs}</td>
          <td class="px-4 py-3">${entry.score}</td>
          <td class="px-4 py-3">${tournament.winner}</td>
        `;
        tableBody.appendChild(tr);
      });
    });
  }
}

export default new Profile();
export { ProfileForm, MatchEntry };