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
      emailField: document.getElementById('loginUseremail') as HTMLInputElement | null,
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

  // Methods merged from login with google
 /* You cannot use fetch here because Google OAuth requires a browser redirect to Google's authentication page, not an API call.
Simple explanation:

OAuth authentication flow works by redirecting the user's browser to the provider's login page (Google's page in this case)
The user then logs in directly on Google's website
After successful login, Google redirects the browser back to your callback URL

A fetch request:

Makes an HTTP request in the background
Doesn't change the user's current page
Cannot display Google's login UI to the user
Cannot handle Google's authentication cookies

What you need instead is:*/
  // =================================
  generateDeviceId() {
    return crypto.randomUUID();
  }
  // async handleGoogleLoginBtnClick(event: MouseEvent): Promise<void> {
  //   if (event)
  //     event.preventDefault();
    
  //   components.showToast('info', 'Connecting', 'Initializing google authentication...');
    
  //   try {
  //     const result = api.getGoogleAuthUrl();
  //     if (!result.success)
  //       throw new Error(result.error || 'No authorization URL received');
      
  //     components.showToast('success', 'Connected', 'Redirecting to google login page...', 3000);
      
  //     // MISSING: The actual redirect should be here!
  //     if (result.auth_url) {
  //       const data = await fetch(result.auth_url, {
  //               method: 'POST',
  //               credentials: 'include',
  //               headers: {
  //                 'Content-Type': 'application/json'
  //               },
  //             });

  //       if(data) {
  //         console.log('Google Auth data result:', data);
  //         // window.location.href = data.userPapyload;
  //         router.navigate('/home');
  //       }
  //     } else {
  //       throw new Error('Authorization URL is undefined');
  //     }
  //   } catch (error: any) {
  //     components.showToast('error', 'google Login Failed', error.message || 'Could not connect to google authentication service.', 2000);
  //   }
  // }

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
      let deviceId = localStorage.getItem("deviceId");
      if (!deviceId) {
        deviceId = this.generateDeviceId();
        localStorage.setItem("deviceId", deviceId);
      }
      
      // Create state parameter with deviceId
      const state = encodeURIComponent(btoa(JSON.stringify({ deviceId })));
      
      // Construct Google auth URL
      const authUrl = `${baseURL}/auth/google/login?state=${state}`;
      
      components.showToast('success', 'Connected', 'Redirecting to Google login page...', 1000);
      
      // IMPORTANT: This will redirect the user to Google's login page
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
  //origianl
  // handleOAuthCallback(router: any): void {
  //   const accessToken = utils.getCookie('access_token');
    
  //   const pageSection = utils.getPageSection();

  //   if (!pageSection) {
  //     console.error('OAuth Callback: pageSection not found');
  //     return;
  //   }
    
  //   if (accessToken) {
  //     utils.setCookie('access_token', accessToken);
      
  //     this.handleSuccessfulOAuth(pageSection, router);
  //   } else {
  //     console.error('OAuth Callback: No access token found in callback URL');
  //     this.handleFailedAuth(pageSection, router);
  //   }
  // }
  // In your login.ts file

  


}

const login = new Login();

export default login;