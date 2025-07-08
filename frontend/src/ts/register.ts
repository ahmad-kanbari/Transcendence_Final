import api from './api';
import components from './components';
import utils from './utils';
import router from './router';
import login from './login';
import { VALIDATION_INPUTS } from './constants';
import toastManager from './toastManager';
import app from './app';
// Define interface for register form elements
interface RegisterForm {
  tab: HTMLElement | null;
  container: HTMLElement | null;
  form: HTMLFormElement | null;
  submitBtn: HTMLButtonElement | null;
  usernameField: HTMLInputElement | null;
  emailField: HTMLInputElement | null;
  passwordField: HTMLInputElement | null;
  confirmPasswordField: HTMLInputElement | null;
  passwordMatchStatus: HTMLElement | null;
}

// Interface for registration data
interface RegisterData {
  username: string;
  email: string;
  password: string;
}

class Register {
  registerForm: RegisterForm;
  initialized: boolean;
  
  constructor() {
    this.registerForm = {} as RegisterForm;
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
    this.initRegisterForm();
  }
  
  getRegisterForm(): RegisterForm {
    return {
      tab: document.getElementById('registerTab'),
      container: document.getElementById('registerFormContainer'),
      form: document.getElementById('registerForm') as HTMLFormElement | null,
      submitBtn: document.getElementById('registerFormButton') as HTMLButtonElement | null,
      usernameField: document.getElementById('registerUsername') as HTMLInputElement | null,
      emailField: document.getElementById('registerEmail') as HTMLInputElement | null,
      passwordField: document.getElementById('registerPassword') as HTMLInputElement | null,
      confirmPasswordField: document.getElementById('confirmPassword') as HTMLInputElement | null,
      passwordMatchStatus: document.getElementById('passwordMatchStatus')
    };
  }
  
  initRegisterForm(): void {
    this.registerForm = this.getRegisterForm();
    
    if (this.registerForm.form) {
      if (this.registerForm.usernameField)
        utils.setupInputField(this.registerForm.usernameField, 'username', components);
      
      if (this.registerForm.emailField)
        utils.setupInputField(this.registerForm.emailField, 'email', components);
      
      if (this.registerForm.passwordField && this.registerForm.confirmPasswordField && this.registerForm.passwordMatchStatus) {
        utils.setupPasswordValidation(
          this.registerForm.passwordField,
          this.registerForm.confirmPasswordField,
          this.registerForm.passwordMatchStatus
        );
      }
      
      if (this.registerForm.submitBtn)
        this.registerForm.submitBtn.onclick = this.handleRegisterBtnClick.bind(this);
    }
  }
  
showRegisterForm(): void {
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const loginContainer = document.getElementById('loginFormContainer');
  const registerContainer = document.getElementById('registerFormContainer');
  
  if (!loginTab || !loginContainer || !registerTab || !registerContainer) {
    console.warn('Register: Cannot switch tabs - missing elements');
    return;
  }
  
  registerTab.classList.add('active');
  loginTab.classList.remove('active');
  
  // Show register form
  registerContainer.classList.add('show', 'active');
  registerContainer.classList.remove('fade');
  registerContainer.hidden = false;
  
  // Hide login form
  loginContainer.classList.remove('show', 'active');
  loginContainer.classList.add('fade');
  loginContainer.hidden = true;
}
  
  async handleRegisterBtnClick(event: MouseEvent | null): Promise<void> {
    if (event)
      event.preventDefault();
    
    const usernameElement = document.getElementById('registerUsername') as HTMLInputElement | null;
    const emailElement = document.getElementById('registerEmail') as HTMLInputElement | null;
    const passwordElement = document.getElementById('registerPassword') as HTMLInputElement | null;
    const confirmPasswordElement = document.getElementById('confirmPassword') as HTMLInputElement | null;
    
    if (!usernameElement || !emailElement || !passwordElement || !confirmPasswordElement) {
      // components.showToast('error', 'Registration Error', 'Form elements not found.');
      toastManager.error(app.getUsername(), 'Form elements not found.');
      console.error('Register: Form elements not found');
      return;
    }
    
    const username = usernameElement.value;
    const email = emailElement.value;
    const password = passwordElement.value;
    const confirmPassword = confirmPasswordElement.value;
    
    if (!username || !email || !password || !confirmPassword) {
      // components.showToast('error', 'Registration Error', 'Please fill out all fields.');
      toastManager.error(app.getUsername(), 'Please fill out all fields.');
      return;
    }
    
    //validation input
    if (username.length < utils.VALIDATION_INPUTS.username.minLength!) {
      // components.showToast('error', 'Registration Error', `Username must be at least ${utils.VALIDATION_INPUTS.username.minLength} characters.`);
      toastManager.error(app.getUsername(), `Username must be at least ${utils.VALIDATION_INPUTS.username.minLength} characters.`);
      return;
    }
    
    if (password.length < utils.VALIDATION_INPUTS.password.minLength!) {
      // components.showToast('error', 'Registration Error', `Password must be at least ${utils.VALIDATION_INPUTS.password.minLength} characters.`);
      toastManager.error(app.getUsername(), `Password must be at least ${utils.VALIDATION_INPUTS.password.minLength} characters.`);
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      // components.showToast('warning', 'Invalid Email', 'Please enter a valid email address.');
      toastManager.warning(app.getUsername(), 'Please enter a valid email address.');
      return;
    }
    
    if (password !== confirmPassword) {
      // components.showToast('warning', 'Password Mismatch', 'Passwords do not match. Please try again.');
      toastManager.warning(app.getUsername(), 'Passwords do not match. Please try again.');
      return;
    }
    
    utils.setFormLoading(this.registerForm.submitBtn, true);
    
    const registerData: RegisterData = {
      username,
      email,
      password
    };
    
    try {
      const result = await api.register(registerData);
      console.log('Registration result:', result);
      if (result.success) {
        // components.showToast('success', 'Registration Successful', 'Your account has been created. Please log in.');
        toastManager.success(app.getUsername(), 'Your account has been created. Please log in.');
        
        if (this.registerForm.form) {
          this.registerForm.form.reset();
        }
        
        if (this.registerForm.passwordMatchStatus) {
          this.registerForm.passwordMatchStatus.textContent = '';
          this.registerForm.passwordMatchStatus.className = 'form-text mt-1';
        }
        
        login.showLoginForm();
        
        utils.setFormLoading(this.registerForm.submitBtn, false);
      } else {
        // components.showToast('error', 'Registration Failed', result.error || 'Please try again with a different username or email.');
        toastManager.error(app.getUsername(), result.error || 'Please try again with a different username or email.');
        utils.setFormLoading(this.registerForm.submitBtn, false);
      }
    } catch (error: any) {
      console.error('Registration submission error:', error);
      // components.showToast('error', 'System Error', 'An unexpected error occurred. Please try again later.');
      toastManager.error(app.getUsername(), 'An unexpected error occurred. Please try again later.');
      utils.setFormLoading(this.registerForm.submitBtn, false);
    }
  }
}

const register = new Register();

export default register;