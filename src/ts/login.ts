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
}

// Login data interface
interface LoginData {
  email: string;
  password: string;
  deviceId: string | null;
}

class Login {
  loginForm: LoginForm;
  router: any | null;
  register: any | null;
  initialized: boolean;
  
  constructor() {
    this.loginForm = {} as LoginForm;
    this.router = null;
    this.register = null;
    this.initialized = false;
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
      emailField: document.getElementById('loginemail') as HTMLInputElement | null,
      passwordField: document.getElementById('loginPassword') as HTMLInputElement | null
    };
  }
  
  initLoginForm(): void {
    this.loginForm = this.getLoginForm();
    
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
    
    loginContainer.classList.add('show', 'active');
    loginContainer.classList.remove('fade');
    
    registerContainer.classList.remove('show', 'active');
    registerContainer.classList.add('fade');
  }
  
  async handleLoginBtnClick(event: MouseEvent | null): Promise<void> {
    if (event) 
      event.preventDefault();
    
    const emailiElement = document.getElementById('loginUseremail') as HTMLInputElement | null;
    const passwordElement = document.getElementById('loginPassword') as HTMLInputElement | null;
    let deviceId = localStorage.getItem("deviceId")?? null;
		if (!deviceId) {
			deviceId = api.generateDeviceId();
			localStorage.setItem("deviceId", deviceId);
		}
    if (!emailiElement || !passwordElement) {
      components.showToast('error', 'Login Error', 'Login form elements not found.');
      return;
    }
    
    const email = emailiElement.value;
    const password = passwordElement.value;
    
    if (!email || !password) {
      components.showToast('error', 'Login Error', 'Please enter both email and password.', 21);
      return;
    }
    
    if (email.length < utils.VALIDATION_INPUTS.email.minLength!) {
      components.showToast('error', 'Login Error', `email must be at least ${utils.VALIDATION_INPUTS.email.minLength} characters.`, 402);
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
      deviceId
    };
    
    try {
      console.log('Login data:', loginData);
      const result = await api.login(loginData);
      if (result.success) {
        if (passwordElement) {
          passwordElement.value = '';
        }
        
        const passwordParent = passwordElement?.parentElement;
        const passwordCounter = passwordParent?.querySelector('.char-count');
        if (passwordCounter) 
          passwordCounter.textContent = `0/${utils.VALIDATION_INPUTS.password.maxLength}`;
        
        const userData = result.data;
        if (app.state) {
          app.state.user = userData;
        }
        localStorage.setItem('user', JSON.stringify(userData));
        
        this.updateUIAuthState();
        components.showToast('success', 'Login Successful', 'You have been logged in successfully.', 200);
        
        router.navigate('/');
      } else {
        components.showToast('error', 'Login Failed', result.error || 'Invalid email or password.', 200);
      }
      
      utils.setFormLoading(this.loginForm.submitBtn, false);
    } catch (error: any) {
      console.error('Login submission error:', error);
      components.showToast('error', 'System Error', 'An unexpected error occurred. Please try again later.', 200);
      utils.setFormLoading(this.loginForm.submitBtn, false);
    }
  }
  
  updateUIAuthState(): void {
    const loginNavBtn = document.getElementById('loginNavBtn');
    const loginBtn = document.getElementById('loginBtn');
    const loginDropdown = document.getElementById('loginDropdown');
    const loggedInUserImg = document.getElementById('loggedInUserImg') as HTMLImageElement | null;
    const loggedInemail = document.getElementById('loggedInemail');
    
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
        if (typeof app.getEmail === 'function' && app.getEmail() && loggedInemail) {
          loggedInemail.textContent = app.getEmail();
          loggedInemail.style.display = 'inline';
        } else if (loggedInemail) {
          loggedInemail.style.display = 'none';
        }
      }
    } else {
      if (loginNavBtn?.parentElement) loginNavBtn.parentElement.style.display = 'block';
      if (loginBtn) loginBtn.style.display = 'block';
      if (loginDropdown) loginDropdown.style.display = 'none';
    }
  }

  // Methods merged from login with 42
  // =================================

  async handleGoogleLoginBtnClick(event: MouseEvent): Promise<void> {
    if (event)
      event.preventDefault();
    
    components.showToast('info', 'Connecting', 'Initializing google authentication...');
    
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
      const result = await api.getGoogleAuthUrl();
      console.log('Google Auth URL in handle function:', result);
      if (!result.success || !result.auth_url)
        throw new Error(result.error || 'No authorization URL received');
      
      components.showToast('success', 'Connected', 'Redirecting to google login page...', 20);
      
      window.location.href = `${baseURL}/auth/google/login?state=${state}`;
    } catch (error: any) {
      components.showToast('error', 'google Login Failed', error.message || 'Could not connect to google authentication service.', 2000);
    }
  }

  handleOAuthCallback(router: any): void {
    const accessToken = utils.getCookie('access_token');
    
    const pageSection = utils.getPageSection();

    if (!pageSection) {
      console.error('OAuth Callback: pageSection not found');
      return;
    }
    
    if (accessToken) {
      utils.setCookie('access_token', accessToken);
      
      this.handleSuccessfulOAuth(pageSection, router);
    } else {
      console.error('OAuth Callback: No access token found in callback URL');
      this.handleFailedAuth(pageSection, router);
    }
  }

  async handleSuccessfulOAuth(pageSection: HTMLElement, router: any): Promise<void> {
    pageSection.innerHTML = `
      <div class="auth-container text-center p-5">
        <h2 class="text-gold mb-4">Authentication Successful</h2>
        <div class="mb-4">
          <div class="progress">
            <div id="authProgress" class="progress-bar bg-success" role="progressbar" style="width: 100%"></div>
          </div>
        </div>
        <p class="text-white">Verifying account...</p>
      </div>
    `;
    
    try {
      const result = await api.getUserData();
      
      if (!result.success || !result.userData) 
        throw new Error('Could not retrieve user data');
      
      const userData = result.userData;
      
      this.completeOAuthLogin(pageSection, userData);
    } catch (error) {
      console.error('OAuth user data error:', error);
      this.handleFailedAuth(pageSection, router);
    }
  }
  
  completeOAuthLogin(pageSection: HTMLElement, userData: any): void {
    if (app.state) {
      app.state.user = userData;
    }
    localStorage.setItem('user', JSON.stringify(userData));
    
    pageSection.innerHTML = `
      <div class="auth-container text-center p-5">
        <h2 class="text-gold mb-4">Authentication Successful</h2>
        <div class="mb-4">
          <div class="progress">
            <div id="authProgress" class="progress-bar bg-success" role="progressbar" style="width: 100%"></div>
          </div>
        </div>
        <p class="text-white">You have been successfully authenticated.</p>
        <p class="text-white">Redirecting you to the homepage...</p>
      </div>
    `;
    
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  }
  
  handleFailedAuth(pageSection: HTMLElement, router: any): void {
    pageSection.innerHTML = `
      <div class="auth-container text-center p-5">
        <h2 class="text-danger mb-4">Authentication Failed</h2>
        <p class="text-white">We couldn't complete the authentication process.</p>
        <p class="text-white">Please try again.</p>
        <button id="retryAuthBtn" class="btn btn-gold mt-3">Return to Login</button>
      </div>
    `;
    
    setTimeout(() => {
      const retryBtn = document.getElementById('retryAuthBtn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          if (router && typeof router.navigate === 'function') {
            router.navigate('/login');
          } else {
            window.location.href = '/login';
          }
        });
      }
    }, 100);
  }
}

const login = new Login();

export default login;