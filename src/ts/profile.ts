import api from './api';
import app from './app';
import utils from './utils';
import components from './components';
import { VALIDATION_INPUTS } from './constants';

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
  
  constructor() {
    this.profileForm = {};
    this.initialized = false;
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
      statsRank: document.getElementById('statsRank')
    };
  }
  
  initProfilePage(): void {
    this.profileForm = this.getProfileForm();
    
    this.populateProfileData();
    
    // this.init2FA();
    
    if (this.profileForm.displayNameField) 
      utils.setupInputField(this.profileForm.displayNameField, 'username', components);
    
    if (this.profileForm.emailField) 
      utils.setupInputField(this.profileForm.emailField, 'email', components);
  }
  
  populateProfileData(): void {
    if (!app.state.user) {
      console.warn('No user state found, cannot populate profile data');
      return;
    }
    
    if (this.profileForm.profileUsername)
      this.profileForm.profileUsername.textContent = app.getUsername() || 'Username';
    
    if (this.profileForm.profileAvatar)
      this.profileForm.profileAvatar.src = app.getUserImg() || '../public/assets/icons/avatar.svg';
    
    if (this.profileForm.displayNameField)
      this.profileForm.displayNameField.value = app.getUsername() || '';
    
    if (this.profileForm.emailField)
      this.profileForm.emailField.value = app.getEmail() || '';
    
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
    
    this.update2FAUI();
    this.renderMatchHistory();
  }
  
  update2FAUI(): void {
    const is2FAEnabled = app.get2FAState() || false;
    const twoFAStatus = document.getElementById('twoFAStatus');
    const enableTwoFABtn = document.getElementById('enableTwoFABtn');
    const disableTwoFABtn = document.getElementById('disableTwoFABtn');
    
    if (twoFAStatus) {
      if (is2FAEnabled) {
        twoFAStatus.textContent = 'Enabled';
        twoFAStatus.classList.remove('bg-danger');
        twoFAStatus.classList.add('bg-success');
      } else {
        twoFAStatus.textContent = 'Disabled';
        twoFAStatus.classList.remove('bg-success');
        twoFAStatus.classList.add('bg-danger');
      }
    }
    
    if (enableTwoFABtn && disableTwoFABtn) {
      if (is2FAEnabled) {
        enableTwoFABtn.classList.add('d-none');
        disableTwoFABtn.classList.remove('d-none');
      } else {
        enableTwoFABtn.classList.remove('d-none');
        disableTwoFABtn.classList.add('d-none');
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
        
        let parentForm = enableBtn.closest('form');
        if (parentForm) 
          parentForm.onsubmit = (e: Event) => e.preventDefault();
        
        if (modal) {
          const qrSection = document.getElementById('qrCodeSection');
          if (qrSection) 
            qrSection.classList.remove('d-none');
          
          const modalText = document.querySelector('.two-fa-text');
          if (modalText)
            modalText.textContent = 'After scanning the QR code, enter the 6-digit verification code from your authenticator app.';
          
          modal.classList.remove('d-none');
          
          this.setup2FA();
        }
        
        return false;
      });
    }
    
    if (disableBtn) {
      disableBtn.addEventListener('click', (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        
        let parentForm = disableBtn.closest('form');
        if (parentForm) 
          parentForm.onsubmit = (e: Event) => e.preventDefault();
        
        if (modal) {
          const qrSection = document.getElementById('qrCodeSection');
          if (qrSection) 
            qrSection.classList.add('d-none');
          
          const modalText = document.querySelector('.two-fa-text');
          if (modalText)
            modalText.textContent = 'Enter the 6-digit verification code from your authenticator app to disable 2FA.';
          
          modal.classList.remove('d-none');
        }
        
        return false;
      });
    }
    
    if (form) {
      form.addEventListener('submit', (e: Event) => {
        e.preventDefault();
        
        if (enableBtn && !enableBtn.classList.contains('d-none')) 
          this.verify2FACode();
        else 
          this.disable2FA();
        
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (modal) modal.classList.add('d-none');
      });
    }
    
    if (modal) {
      modal.addEventListener('click', (e: MouseEvent) => {
        if (e.target === modal) modal.classList.add('d-none');
      });
    }
  }
  
  async setup2FA(): Promise<void> {
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    const secretKeyElement = document.getElementById('secretKey');
    const errorElement = document.getElementById('twofa-error');
    
    if (!qrCodeContainer || !secretKeyElement) {
      console.error('setup2FA: Required elements not found', { 
        qrCodeContainer: !!qrCodeContainer, 
        secretKeyElement: !!secretKeyElement 
      });
      return;
    }
    
    
    qrCodeContainer.innerHTML = `<div class="spinner-border text-gold" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>`;
    secretKeyElement.textContent = 'Loading...';
    
    if (errorElement) errorElement.classList.add('d-none');
    
    try {
      const response = await api.setup2FA();
      
      if (!response || !response.qr_code || !response.secret_key) 
        components.showToast('error', '2FA Setup Error', response.error || 'Failed to set up 2FA');
      
      const qrImg = document.createElement('img');
      qrImg.src = response.qr_code;
      qrImg.alt = 'QR Code for 2FA';
      qrImg.className = 'qr-code';
      
      qrCodeContainer.innerHTML = '';
      qrCodeContainer.appendChild(qrImg);
      
      secretKeyElement.textContent = response.secret_key;
    } catch (error: any) {
      qrCodeContainer.innerHTML = '<div class="text-danger">Failed to load QR code</div>';
      secretKeyElement.textContent = 'Error loading secret key';
      
      if (errorElement) {
        errorElement.textContent = error.message || 'Failed to set up 2FA';
        errorElement.classList.remove('d-none');
      }
    }
  }
  
  async verify2FACode(): Promise<void> {
    const codeInput = document.getElementById('twoFACode') as HTMLInputElement | null;
    const errorElement = document.getElementById('twofa-error');
    const submitButton = document.querySelector('#twoFAForm button[type="submit"]');
    
    if (!codeInput) return;
    
    const code = codeInput.value;
    
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      if (errorElement) {
        errorElement.textContent = 'Please enter a valid 6-digit code';
        errorElement.classList.remove('d-none');
      }
      return;
    }
    
    utils.setFormLoading((submitButton as HTMLElement | null) , true);
    
    try {
      const data = await api.verify2FA(code);
      
      utils.setFormLoading(submitButton as HTMLElement | null, false);
      
      if (data.success) {
        if (app.state.user) {
          app.state.user.is_two_factor_enabled = true;
          localStorage.setItem('user', JSON.stringify(app.state.user));
        }
        
        this.update2FAUI();
        
        components.showToast('success', '2FA Enabled', 'Two-factor authentication has been successfully enabled.');
        
        const modal = document.getElementById('twoFAModal');
        if (modal) modal.classList.add('d-none');
      } else {
        if (errorElement) {
          errorElement.textContent = data.error || 'Verification failed';
          errorElement.classList.remove('d-none');
        }
      }
    } catch (error: any) {
      components.showToast('error', '2FA Verification Error', error.message || 'Failed to verify 2FA');
      
      utils.setFormLoading(submitButton as HTMLElement, false);
      
      if (errorElement) {
        errorElement.textContent = error.message || 'Failed to enable 2FA';
        errorElement.classList.remove('d-none');
      }
    }
  }
  
  async disable2FA(): Promise<void> {
    const codeInput = document.getElementById('twoFACode') as HTMLInputElement | null;
    const errorElement = document.getElementById('twofa-error');
    const submitButton = document.querySelector('#twoFAForm button[type="submit"]');
    
    if (!codeInput) return;
    
    const code = codeInput.value;
    
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      if (errorElement) {
        errorElement.textContent = 'Please enter a valid 6-digit code';
        errorElement.classList.remove('d-none');
      }
      return;
    }
    
    utils.setFormLoading(submitButton as HTMLElement, true);
    
    try {
      const data = await api.disable2FA(code);
      
      utils.setFormLoading(submitButton as HTMLElement, false);
      
      if (data.success) {
        if (app.state.user) {
          app.state.user.is_two_factor_enabled = false;
          localStorage.setItem('user', JSON.stringify(app.state.user));
        }
        
        this.update2FAUI();
        
        components.showToast('success', '2FA Disabled', 'Two-factor authentication has been successfully disabled.');
        
        const modal = document.getElementById('twoFAModal');
        if (modal) modal.classList.add('d-none');
      } else {
        if (errorElement) {
          errorElement.textContent = data.error || 'Failed to disable 2FA';
          errorElement.classList.remove('d-none');
        }
      }
    } catch (error: any) {
      components.showToast('error', '2FA Disable Error', error.message || 'Failed to disable 2FA');
      
      utils.setFormLoading(submitButton as HTMLElement, false);
      
      if (errorElement) {
        errorElement.textContent = error.message || 'Failed to disable 2FA';
        errorElement.classList.remove('d-none');
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
      <th>Type</th>
      <th>Vs</th>
      <th>Score</th>
      <th>Winner</th>
    </tr>`;

    const currentUser = app.getUsername();
    const history = app.state.user?.matchHistory || [];
    const entries = utils.extractMatchData(history, currentUser);

    tableBody.innerHTML = '';
    if (entries.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4" class="text-center">No match history available</td></tr>`;
    } else {
      entries.forEach(entry => {
        const tr = document.createElement('tr');
        if (entry.winner === currentUser) {
          tr.classList.add('match-win');
        } else {
          tr.classList.add('match-loss');
        }
        tr.innerHTML = `
          <td>${entry.type}</td>
          <td>${entry.vs}</td>
          <td>${entry.score}</td>
          <td>${entry.winner}</td>
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
      summary.classList.add('table-warning');
      summary.innerHTML = `
        <td colspan="4" class="text-center fw-bold">
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
          <td>${entry.type}</td>
          <td>${entry.vs}</td>
          <td>${entry.score}</td>
          <td>${tournament.winner}</td>
        `;
        tableBody.appendChild(tr);
      });
    });
  }
}

export default new Profile();
export { ProfileForm, MatchEntry };