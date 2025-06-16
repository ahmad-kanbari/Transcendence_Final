
import api from './api';
import app from './app';
import utils from './utils';
import router from './router';
import register from './register';
import components from './components';
import { baseURL } from './constants';

// Define interface for the login form elements
interface LoginForm {
  tab: HTMLElement | null;
  container: HTMLElement | null;
  form: HTMLFormElement | null;
  submitBtn: HTMLButtonElement | null;
  login42Link: HTMLElement | null;
  emailField: HTMLInputElement | null;
  passwordField: HTMLInputElement | null;
  twoFactorForm: HTMLFormElement | null;
  twoFactorCodeInput: HTMLInputElement | null;
  twoFactorSubmitBtn: HTMLButtonElement | null;
  twoFactorError: HTMLElement | null;
  twoFactorModal: HTMLElement | null;
  twoFactorCloseBtn: HTMLElement | null;
}

// Login data interface
interface LoginData {
  email: string;
  password: string;
  deviceId: string | null;
}

// 2FA validation interface
interface TwoFAValidationData {
  token: string;
  tempToken: string;
  deviceId: string | null;
}

class Login {
  loginForm: LoginForm;
  router: any | null;
  register: any | null;
  initialized: boolean;
  tempToken: string | null;
  deviceId: string | null;
  
  constructor() {
    this.loginForm = {} as LoginForm;
    this.router = null;
    this.register = null;
    this.initialized = false;
    this.tempToken = null;
    this.deviceId = null;
 
  }
  
  init(): void {
    if (this.initialized) return;
    
    document.addEventListener('pageShown', (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.page === 'login')
        this.renderForms();
    });
    
    this.initialized = true;
  }
  
  renderForms(): void {
    this.initLoginForm();
    this.setupTabs();
  }
  
  getLoginForm(): LoginForm { 
  
    return {
      tab: document.getElementById('loginTab'),
      container: document.getElementById('loginFormContainer'),
      form: document.getElementById('loginForm') as HTMLFormElement | null,
      submitBtn: document.getElementById('loginBtn') as HTMLButtonElement | null,
      login42Link: document.getElementById('login42Link'),
      emailField: document.getElementById('loginUseremail') as HTMLInputElement | null,
      passwordField: document.getElementById('loginPassword') as HTMLInputElement | null,
      twoFactorForm: document.getElementById('twoFactorForm') as HTMLFormElement | null,
      twoFactorCodeInput: document.getElementById('totpCode') as HTMLInputElement | null,
      twoFactorSubmitBtn: document.getElementById('twoFactorSubmitBtn') as HTMLButtonElement | null,
      twoFactorError: document.getElementById('error2FA'),
      twoFactorModal: document.getElementById('twoFactorModal'),
      twoFactorCloseBtn: document.getElementById('twoFactorCloseBtn')
    };

  }
  
  initLoginForm(): void {
    this.loginForm = this.getLoginForm();
    
    // Initialize device ID
    this.deviceId = localStorage.getItem("deviceId");
    if (!this.deviceId) {
      this.deviceId = this.generateDeviceId();
      localStorage.setItem("deviceId", this.deviceId);
    }
    
    if (this.loginForm.login42Link)
      this.loginForm.login42Link.onclick = this.handleGoogleLoginBtnClick.bind(this);
    
    if (this.loginForm.form) {
      if (this.loginForm.emailField) 
        utils.setupInputField(this.loginForm.emailField, 'email', components);
      
      if (this.loginForm.passwordField) 
        utils.setupInputField(this.loginForm.passwordField, 'password', components);
      
      if (this.loginForm.submitBtn) 
        this.loginForm.submitBtn.onclick = this.handleLoginBtnClick.bind(this);
    }

    // Setup 2FA form
    if (this.loginForm.twoFactorForm) {
      console.log('Setting up 2FA form, form element found:', this.loginForm.twoFactorForm);
      console.log('2FA submit button found:', this.loginForm.twoFactorSubmitBtn);
      console.log('2FA code input found:', this.loginForm.twoFactorCodeInput);

      this.loginForm.twoFactorForm.addEventListener('submit',(e)=>{ 
        console.log('2FA form submitted');
        e.preventDefault(); 
        e.stopPropagation();
        this.handle2FASubmit(e);
        
      });

      // Also add click event listener directly to the submit button as backup
      if (this.loginForm.twoFactorSubmitBtn) {
        this.loginForm.twoFactorSubmitBtn.addEventListener('click', (e: Event) => {
          console.log('2FA submit button clicked');
          e.preventDefault();
          e.stopPropagation();
          this.handle2FASubmit(e);
        });
      }
      
      // Auto-format the TOTP code input
      if (this.loginForm.twoFactorCodeInput) {
        this.loginForm.twoFactorCodeInput.addEventListener('input', (e) => {
          // console.log('2FA input changed:', e);
          const target = e.target as HTMLInputElement;
          let value = target.value.replace(/\D/g, ''); // Remove non-digits
          if (value.length > 6) value = value.substring(0, 6); // Limit to 6 digits
          target.value = value;
        });
      }
    } else {
      console.error('2FA form not found during initialization');
    }

    // Setup 2FA modal close button
    if (this.loginForm.twoFactorCloseBtn) {
      this.loginForm.twoFactorCloseBtn.addEventListener('click', () => {
        this.hide2FAModal();
      });
    }

    // Setup modal backdrop click to close
    if (this.loginForm.twoFactorModal) {
      this.loginForm.twoFactorModal.addEventListener('click', (e) => {
        if (e.target === this.loginForm.twoFactorModal) {
          this.hide2FAModal();
        }
      });
    }
  }
  
  setupTabs(): void {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    
    if (loginTab && registerTab) {
      this.showLoginForm();
      loginTab.addEventListener('click', () => this.showLoginForm());
      registerTab.addEventListener('click', () => register.showRegisterForm());
    } else {
      console.warn('Login: Login/Register tabs not found');
    }
  }
  
  showLoginForm(): void {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginContainer = document.getElementById('loginFormContainer');
    const registerContainer = document.getElementById('registerFormContainer');
    
    if (!loginTab || !loginContainer || !registerTab || !registerContainer) {
      console.warn('Login: Cannot switch tabs - missing elements');
      return;
    }
    
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    
    // Show login form
    loginContainer.classList.add('show', 'active');
    loginContainer.classList.remove('fade');
    loginContainer.removeAttribute('hidden');
    
    // Hide register form
    registerContainer.classList.remove('show', 'active');
    registerContainer.classList.add('fade');
    registerContainer.setAttribute('hidden', '');
  }
  
  async handleLoginBtnClick(event: MouseEvent | null): Promise<void> {
    if (event) 
      event.preventDefault();
    
    const emailElement = document.getElementById('loginUseremail') as HTMLInputElement | null;
    const passwordElement = document.getElementById('loginPassword') as HTMLInputElement | null;
    
    if (!emailElement || !passwordElement) {
      components.showToast('error', 'Login Error', 'Login form elements not found.');
      return;
    }
    
    const email = emailElement.value;
    const password = passwordElement.value;
    
    if (!email || !password) {
      components.showToast('error', 'Login Error', 'Please enter both email and password.', 21);
      return;
    }
    
    if (email.length < utils.VALIDATION_INPUTS.email.minLength!) {
      components.showToast('error', 'Login Error', `Email must be at least ${utils.VALIDATION_INPUTS.email.minLength} characters.`, 402);
      return;
    }
    
    if (password.length < utils.VALIDATION_INPUTS.password.minLength!) {
      components.showToast('error', 'Login Error', `Password must be at least ${utils.VALIDATION_INPUTS.password.minLength} characters.`, 402);
      return;
    }
    
    utils.setFormLoading(this.loginForm.submitBtn, true);
    
    const loginData: LoginData = {
      email,
      password,
      deviceId: this.deviceId
    };
    
    try {
      const response = await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(loginData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Login failed');
      }

      const data = await response.json();
      console.log('Login response data:', data);
      if (data.requiresTwoFactor) {
        // Store temporary token and show 2FA modal
        this.tempToken = data.tempToken;
        this.show2FAModal();
      } else {
        // Regular login success
       
        this.handleSuccessfulLogin(data, passwordElement);
      }
      
      utils.setFormLoading(this.loginForm.submitBtn, false);
    } catch (error: any) {
      console.error('Login submission error:', error);
      components.showToast('error', 'Login Failed', error.message || 'Invalid email or password.');
      utils.setFormLoading(this.loginForm.submitBtn, false);
    }
  }

show2FAModal(): void {
  if (this.loginForm.twoFactorModal) {
    this.loginForm.twoFactorModal.classList.remove('hidden');
    this.loginForm.twoFactorModal.style.display = 'flex';
  }

  // Clear previous error messages
  this.hide2FAError();
  
  // Clear and focus on the TOTP input
  if (this.loginForm.twoFactorCodeInput) {
    this.loginForm.twoFactorCodeInput.value = '';
    this.loginForm.twoFactorCodeInput.focus();
  }

  // ADD THIS DEBUG CODE
  setTimeout(() => {
    const btn = document.getElementById('twoFactorSubmitBtn');
    console.log('Submit button after modal show:', btn);
    if (btn) {
      console.log('Button text:', btn.textContent);
      console.log('Button disabled:', (btn as HTMLButtonElement).disabled);
      console.log('Button type:', (btn as HTMLButtonElement).type);
      
      // Force add event listener
      btn.addEventListener('click', (e) => {
        console.log('FORCED CLICK LISTENER TRIGGERED');
        e.preventDefault();
        e.stopPropagation();
        this.handle2FASubmit(e);
      });
    }
  }, 100);

  // Re-setup 2FA listeners to ensure they work
  this.setup2FAListeners();
  
  components.showToast('info', '2FA Required', 'Please enter the 6-digit code from your authenticator app.');
}

  setup2FAListeners(): void {
    console.log('Setting up 2FA listeners');
    
    // Get fresh references to the elements
    const twoFactorForm = document.getElementById('twoFactorForm') as HTMLFormElement;
    const twoFactorSubmitBtn = document.getElementById('twoFactorSubmitBtn') as HTMLButtonElement;
    
    if (twoFactorForm) {
      console.log('Found 2FA form, adding submit listener');
      // Remove any existing listeners and add new one
      const newForm = twoFactorForm.cloneNode(true) as HTMLFormElement;
      twoFactorForm.parentNode?.replaceChild(newForm, twoFactorForm);
      
      newForm.addEventListener('submit', (e: Event) => {
        console.log('2FA form submitted via setup listeners');
        e.preventDefault();
        e.stopPropagation();
        this.handle2FASubmit(e);
      });
    }

    if (twoFactorSubmitBtn) {
      console.log('Found 2FA submit button, adding click listener');
      // Remove any existing listeners and add new one
      const newBtn = twoFactorSubmitBtn.cloneNode(true) as HTMLButtonElement;
      twoFactorSubmitBtn.parentNode?.replaceChild(newBtn, twoFactorSubmitBtn);
      
      newBtn.addEventListener('click', (e: Event) => {
        console.log('2FA submit button clicked via setup listeners');
        e.preventDefault();
        e.stopPropagation();
        this.handle2FASubmit(e);
      });
    }

    // Update the loginForm references
    this.loginForm.twoFactorForm = document.getElementById('twoFactorForm') as HTMLFormElement;
    this.loginForm.twoFactorSubmitBtn = document.getElementById('twoFactorSubmitBtn') as HTMLButtonElement;
    this.loginForm.twoFactorCodeInput = document.getElementById('totpCode') as HTMLInputElement;
  }

  
  hide2FAModal(): void {
    if (this.loginForm.twoFactorModal) {
      this.loginForm.twoFactorModal.classList.add('hidden');
      this.loginForm.twoFactorModal.style.display = 'none';
    }

    // Clear form data
    if (this.loginForm.twoFactorCodeInput) {
      this.loginForm.twoFactorCodeInput.value = '';
    }

    this.hide2FAError();
    this.tempToken = null;
  }

  async handle2FASubmit(event: Event): Promise<void> {
    console.log('Handling 2FA submit');
    event.preventDefault();
    event.stopPropagation();
    if (!this.loginForm.twoFactorCodeInput || !this.tempToken) {
      components.showToast('error', '2FA Error', 'Missing required 2FA data.');
      return;
    }

    const totpCode = this.loginForm.twoFactorCodeInput.value;

    if (!totpCode || totpCode.length !== 6 || !/^\d+$/.test(totpCode)) {
      this.show2FAError('Please enter a valid 6-digit code.');
      return;
    }

    if (this.loginForm.twoFactorSubmitBtn) {
      utils.setFormLoading(this.loginForm.twoFactorSubmitBtn, true);
    }

    const validationData: TwoFAValidationData = {
      token: totpCode,
      tempToken: this.tempToken,
      deviceId: this.deviceId
    };

    try {
      const response = await fetch(`${baseURL}/auth/2fa/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(validationData),
      });

      if (!response.ok) {
        console.log('2FA validation failed:', response.status, response.statusText);
        const errorText = await response.text();
        this.show2FAError('Invalid code. Please try again.');
        throw new Error(errorText || '2FA validation failed');
      }

      const data = await response.json();
      console.log('2FA validation worked', data);
      // 2FA validation successful
      this.hide2FAModal();
      this.handleSuccessfulLogin(data);
      
    } catch (error: any) {
      console.log('2FA validation failed:', error);
      this.show2FAError('Invalid code. Please try again.');
    } finally {
      if (this.loginForm.twoFactorSubmitBtn) {
        console.log('Setting 2FA submit button loading state to false');
        utils.setFormLoading(this.loginForm.twoFactorSubmitBtn, false);
      }
    }
  }

  show2FAError(message: string): void {
    if (this.loginForm.twoFactorError) {
      this.loginForm.twoFactorError.textContent = message;
      this.loginForm.twoFactorError.style.display = 'block';
    }
  }

  hide2FAError(): void {
    if (this.loginForm.twoFactorError) {
      this.loginForm.twoFactorError.style.display = 'none';
    }
  }

  handleSuccessfulLogin(userData: any, passwordElement?: HTMLInputElement): void {
    // Clear password field
    if (passwordElement) {
      passwordElement.value = '';
    }

    // Update character counter
    const passwordParent = passwordElement?.parentElement;
    const passwordCounter = passwordParent?.querySelector('.char-count');
    if (passwordCounter) 
      passwordCounter.textContent = `0/${utils.VALIDATION_INPUTS.password.maxLength}`;

    // Update app state
    if (app.state) {
      app.state.user = userData;
    }
    localStorage.setItem('user', JSON.stringify(userData));

    // Clear temporary data
    this.tempToken = null;
    
    this.updateUIAuthState();
    components.showToast('success', 'Login Successful', 'You have been logged in successfully.', 200);
    console.log('Login successful:', userData);
    router.navigate('/');
  }
  
  updateUIAuthState(): void {
    const loginNavBtn = document.getElementById('loginNavBtn');
    const loginBtn = document.getElementById('loginBtn');
    const loginDropdown = document.getElementById('loginDropdown');
    const loggedInUserImg = document.getElementById('loggedInUserImg') as HTMLImageElement | null;
    const loggedInEmail = document.getElementById('loggedInEmail');
    
    if (app.state?.user) {
      if (loginNavBtn?.parentElement) loginNavBtn.parentElement.style.display = 'none';
      if (loginBtn) loginBtn.style.display = 'none';
      if (loginDropdown) loginDropdown.style.display = 'block';
      
      if (typeof app.getIs42User === 'function' && app.getIs42User()) {
        if (typeof app.getUserImg === 'function' && app.getUserImg() && loggedInUserImg) {
          loggedInUserImg.src = app.getUserImg();
          loggedInUserImg.style.display = 'block';
        } else if (loggedInUserImg) {
          loggedInUserImg.style.display = 'none';
        }
      } else {
        if (typeof app.getEmail === 'function' && app.getEmail() && loggedInEmail) {
          loggedInEmail.textContent = app.getEmail();
          loggedInEmail.style.display = 'inline';
        } else if (loggedInEmail) {
          loggedInEmail.style.display = 'none';
        }
      }
    } else {
      if (loginNavBtn?.parentElement) loginNavBtn.parentElement.style.display = 'block';
      if (loginBtn) loginBtn.style.display = 'block';
      if (loginDropdown) loginDropdown.style.display = 'none';
    }
  }

  generateDeviceId(): string {
    return crypto.randomUUID();
  }

  async handleGoogleLoginBtnClick(event: MouseEvent): Promise<void> {
    if (event) {
      event.preventDefault();
    }
    
    // Disable button to prevent multiple clicks
    const googleBtn = event.currentTarget as HTMLButtonElement;
    if (googleBtn) {
      googleBtn.disabled = true;
    }
    
    components.showToast('info', 'Connecting', 'Initializing Google authentication...');
    
    try {
      // Get or generate deviceId
      if (!this.deviceId) {
        this.deviceId = this.generateDeviceId();
        localStorage.setItem("deviceId", this.deviceId);
      }
      
      // Create state parameter with deviceId
      const state = encodeURIComponent(btoa(JSON.stringify({ deviceId: this.deviceId })));
      
      // Construct Google auth URL
      const authUrl = `${baseURL}/auth/google/login?state=${state}`;
      
      components.showToast('success', 'Connected', 'Redirecting to Google login page...', 1000);
      
      // Redirect to Google's login page
      window.location.href = authUrl;
    } catch (error: any) {
      // Re-enable button on error
      if (googleBtn) {
        googleBtn.disabled = false;
      }
      
      components.showToast('error', 'Google Login Failed', 
        error.message || 'Could not connect to Google authentication service.', 2000);
    }
  }
}

const login = new Login();

export default login;