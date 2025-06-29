import { VALIDATION_INPUTS } from './constants';
import components from './components';

// Define interface for match data
interface MatchData {
  player1Name?: string;
  Player1Name?: string;
  player2Name?: string;
  Player2Name?: string;
  player1Score?: number;
  Player1Score?: number;
  player2Score?: number;
  Player2Score?: number;
  winner?: string;
  matchType?: string;
}

// Define interface for match entry
interface MatchEntry {
  type: string;
  vs: string;
  score: string;
  winner: string;
}

// Define interface for validation input
interface ValidationInput {
  minLength?: number;
  maxLength: number;
}

// Define interface for validation inputs collection
interface ValidationInputs {
  [key: string]: ValidationInput;
}

class Utils {
  access_token: string | null;
  VALIDATION_INPUTS: ValidationInputs;
  
  constructor() {
    this.access_token = null;
    this.VALIDATION_INPUTS = VALIDATION_INPUTS;
  }
  
  getById(id: string): HTMLElement | null {
    return document.getElementById(id);
  }
  
  queryAll(selector: string): NodeListOf<Element> {
    return document.querySelectorAll(selector);
  }
  
  query(selector: string): Element | null {
    return document.querySelector(selector);
  }
  
  getAppContainer(): HTMLElement | null {
    return this.getById('App');
  }
  
  getPageSection(): HTMLElement | null {
    return this.getById('pageSection');
  }
  
  getUrlParameter(name: string): string {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
  }

  startProgressAnimation(progressBar: HTMLElement | null): number | null {
    if (!progressBar) {
      console.error('Utils: progressBar element not provided for animation');
      return null;
    }
    
    let progress = 0;
    const progressInterval = window.setInterval(() => {
      progress += 5;
      progressBar.style.width = `${progress}%`;
      progressBar.setAttribute('aria-valuenow', progress.toString());
      
      if (progress >= 100) clearInterval(progressInterval);
    }, 100);
    
    return progressInterval;
  }
  
  setCookie(name: string, value: string): void {
    let expires = ""; 
    const date = new Date();
    date.setTime(date.getTime() + (60 * 60 * 1000)); // 1 hour
    expires = "; expires=" + date.toUTCString();
    
    document.cookie = name + "=" + (value || "") + expires + "; path=/; Secure; SameSite=Strict";
  }

  getCookie(name: string): string | null {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [cookieName, cookieValue] = cookie.trim().split('=');
      if (cookieName === name) {
        // Handle signed cookies - you might need to unsign them
        // For now, return the raw value (backend should handle unsigning)
        return decodeURIComponent(cookieValue);
      }
    }
    return null;
  }
  
  deleteCookie(name: string): void {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; Secure; SameSite=Strict';
  }

  cleanUp(): void {
    this.deleteCookie('access_token');
    this.deleteCookie('refresh_token');
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('access_token'); // Duplicate in original code
    localStorage.removeItem('refresh_token');
    
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    
    this.access_token = null;
  }
  
  validatePasswordMatch(
    passwordField: HTMLInputElement | null, 
    confirmPasswordField: HTMLInputElement | null, 
    statusElement: HTMLElement | null
  ): void {
    if (!passwordField || !confirmPasswordField || !statusElement)
      return;
    
    const password = passwordField.value;
    const confirmPassword = confirmPasswordField.value;
    
    if (!confirmPassword) {
      statusElement.textContent = '';
      statusElement.className = 'form-text mt-1';
      confirmPasswordField.classList.remove('is-valid', 'is-invalid');
      return;
    }
    
    if (password === confirmPassword) {
      statusElement.textContent = 'Passwords match';
      statusElement.className = 'form-text mt-1 text-success';
      confirmPasswordField.classList.add('is-valid');
      confirmPasswordField.classList.remove('is-invalid');
    } else {
      statusElement.textContent = 'Passwords do not match';
      statusElement.className = 'form-text mt-1 text-danger';
      confirmPasswordField.classList.add('is-invalid');
      confirmPasswordField.classList.remove('is-valid');
    }
  }

  initializeCharCount(inputElement: HTMLInputElement, fieldType: string): void {
    if (!inputElement) return;
    
    const charCountElement = inputElement.parentElement?.querySelector('.char-count');
    if (charCountElement) {
      const currentLength = inputElement.value.length;
      const maxLength = this.VALIDATION_INPUTS[fieldType].maxLength;
      charCountElement.textContent = `${currentLength}/${maxLength}`;
      
      if (maxLength - currentLength <= 5) {
        charCountElement.classList.add('text-danger');
        charCountElement.classList.remove('text-white');
      } else {
        charCountElement.classList.remove('text-danger');
        charCountElement.classList.add('text-white');
      }
    }
  }
  
  validateInputLength(fieldType: string, event: Event, componentsRef: any): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const validation = this.VALIDATION_INPUTS[fieldType];
    
    if (value.length > validation.maxLength) {
      input.value = value.slice(0, validation.maxLength);
      
      if (componentsRef) {
        const toastMessage = `${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} cannot exceed ${validation.maxLength} characters.`;
        componentsRef.showToast('warning', 'Input Limit Reached', toastMessage);
      }
      return;
    }
    
    const charCountElement = input.parentElement?.querySelector('.char-count');
    
    if (charCountElement) {
      charCountElement.textContent = `${value.length}/${validation.maxLength}`;
      
      if (validation.maxLength - value.length <= 5) {
        charCountElement.classList.add('text-danger');
        charCountElement.classList.remove('text-white');
      } else {
        charCountElement.classList.remove('text-danger');
        charCountElement.classList.add('text-white');
      }
    }
  }

  setupInputField(inputField: HTMLInputElement, fieldType: string, componentsRef: any): void {
    if (!inputField) return;
    
    inputField.maxLength = this.VALIDATION_INPUTS[fieldType].maxLength;
    inputField.addEventListener('input', (event) => {
      this.validateInputLength(fieldType, event, componentsRef);
    });
    this.initializeCharCount(inputField, fieldType);
  }

  setupPasswordField(
    passwordField: HTMLInputElement, 
    fieldType: string, 
    validatePasswordMatchFn: () => void
  ): void {
    if (!passwordField) return;
    
    this.setupInputField(passwordField, fieldType, components);
    
    passwordField.addEventListener('input', () => {
      validatePasswordMatchFn();
    });
  }

  setupPasswordValidation(
    passwordField: HTMLInputElement, 
    confirmPasswordField: HTMLInputElement, 
    statusElement: HTMLElement
  ): void {
    if (!passwordField || !confirmPasswordField || !statusElement) return;
    
    this.setupInputField(passwordField, 'password', components);
    this.setupInputField(confirmPasswordField, 'password', components);
    
    const validateFn = () => this.validatePasswordMatch(passwordField, confirmPasswordField, statusElement);
    
    passwordField.addEventListener('input', validateFn);
    confirmPasswordField.addEventListener('input', validateFn);
  }

  validatePasswordMatchFields(
    passwordField: HTMLInputElement | null, 
    confirmPasswordField: HTMLInputElement | null, 
    statusElement: HTMLElement | null
  ): void {
    if (!passwordField || !confirmPasswordField || !statusElement) 
      return;
    
    this.validatePasswordMatch(
      passwordField,
      confirmPasswordField,
      statusElement
    );
  }

  setFormLoading(submitBtn: HTMLElement | null, isLoading: boolean): void {
    if (!submitBtn) return;
    
    if (isLoading) {
      submitBtn.dataset.originalText = submitBtn.textContent || '';
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
      (submitBtn as HTMLButtonElement).disabled = true;
    } else {
      submitBtn.innerHTML = submitBtn.dataset.originalText || submitBtn.innerHTML;
      (submitBtn as HTMLButtonElement).disabled = false;
    }
  }
  
  initLogoutButton(app: any): void {
    if (app.logoutInitialized) return;
    
    document.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const logoutBtn = target.closest('#logoutBtn');
      if (logoutBtn) {
        event.preventDefault();
        app.logout(); 
      }
    });
    
    app.logoutInitialized = true;
  }

  extractMatchData(matchHistory: any[], currentUsername: string): MatchEntry[] {
    if (!Array.isArray(matchHistory)) return [];
    const entries: MatchEntry[] = [];
    matchHistory.forEach(item => {
      if (item && typeof item === 'object') {
        entries.push(this.makeEntry(item, currentUsername));
      }
    });
    return entries;
  }

  makeEntry(match: MatchData, currentUsername: string): MatchEntry {
    const p1 = match.player1Name || match.Player1Name || '';
    const p2 = match.player2Name || match.Player2Name || '';
    const vs = `${p1} vs ${p2}`;
    
    // Handle different score property names and possible undefined values
    const p1Score = match.player1Score !== undefined ? match.player1Score : 
                    (match.Player1Score !== undefined ? match.Player1Score : 0);
    const p2Score = match.player2Score !== undefined ? match.player2Score : 
                    (match.Player2Score !== undefined ? match.Player2Score : 0);
    
    const score = `${p1Score} - ${p2Score}`;
    const winner = match.winner || '';
    
    return {
      type: match.matchType || '',
      vs,
      score,
      winner,
    };
  }

  
}

const utils = new Utils();

export default utils;