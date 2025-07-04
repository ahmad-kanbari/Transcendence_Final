import login from './login';
import utils from './utils';

// Define type for route handlers
type RouteHandler = (path: string) => void;

// Define interface for routes collection
interface Routes {
  [path: string]: RouteHandler;
}

class Router {
  routes: Routes;
  initialized: boolean;
  currentPage: string | null;

  constructor() {
    this.routes = {};
    this.initialized = false;
    this.currentPage = null;
  }


listenForPageChanges(): void {
  // Check if we're on a callback URL when the page first loads
  if (this.isCallbackUrl(window.location.pathname)) {
    console.log('Initial page load is a callback URL');
    setTimeout(() => this.handleGoogleCallback(), 200);
  }

  // Use the 'load' event to detect when page content is loaded
  window.addEventListener('load', () => {
    console.log('Page loaded, checking if callback URL', window.location.pathname);
    if (this.isCallbackUrl(window.location.pathname)) {
      setTimeout(() => this.handleGoogleCallback(), 200);
          window.location.href = '/';
      
    }
  });



  // Add event listener for URL changes via History API
  window.addEventListener('popstate', () => {
    console.log('URL changed via back/forward button');
    if (this.isCallbackUrl(window.location.pathname)) {
      this.handleGoogleCallback();

    }
  

  });
}

// Helper method to check if current URL is a callback URL
isCallbackUrl(path: string): boolean {
  console.log('Checking if URL is a callback URL:', path);
  return path.includes('callback') || path.includes('/oauth/callback');
}

  async init(): Promise<Router> {
    if (this.initialized) return this;

  
    // Add this line to listen for page changes
    this.listenForPageChanges();
    window.addEventListener('popstate', () => {
      
      this.handleURL();
    });

    window.addEventListener('load', () => {
      console.log('Page loaded, checking if callback URL');
      if (this.isCallbackUrl(window.location.pathname)) {
        this.handleGoogleCallback();
      }
    });
    
    document.body.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const navBtn = target.closest('[id$="NavBtn"], [id$="Btn"]');
      // .closest() - Checks if the clicked element or any of its ancestors matches a selector
      // [id$="NavBtn"] - A CSS attribute selector that matches any element with an ID ending in "NavBtn"
      // [id$="Btn"] - A CSS attribute selector that matches any element with an ID ending in "Btn"
      if (navBtn) {
        event.preventDefault();
        
        const id = navBtn.id.toLowerCase();
        let targetPath = '/';
        
        if (id.includes('home')) targetPath = '/home';
        else if (id.includes('game')) targetPath = '/game';
        else if (id.includes('login')) targetPath = '/login';
        else if (id.includes('profile')) targetPath = '/profile';
        else if (id.includes('chat')) targetPath = '/chat';
        
        if (navBtn.getAttribute('href') && navBtn.getAttribute('href') !== '#') {
          targetPath = navBtn.getAttribute('href') || '/';
        }
        
        this.navigate(targetPath);

        return;
      }
      
      const link = target.closest('a');
      
      if (link && 
          link.href && 
          link.href.startsWith(window.location.origin) && 
          !link.hasAttribute('target') &&
          !link.id.includes('NavBtn') && 
          !link.id.includes('Btn')) {
        
        event.preventDefault();
        
        const path = new URL(link.href).pathname;
        
        this.navigate(path);

        return;
      }

      const pageElement = target.closest('[data-page]');
      if (pageElement) {
        event.preventDefault();
        const pageName = pageElement.getAttribute('data-page');
        if (pageName) {
          this.navigate(`/${pageName}`);
        }
      }
    });
    
    this.initialized = true;
    
    this.handleURL();
    
    return this;
  }



  
  registerRoutes(routes: Routes): Router {
    this.routes = {
      ...this.routes,
      ...routes
    };
    return this;
  }

  async handleGoogleCallback(): Promise<void> {
    console.log('Handling Google callback...');
    try {
      // Get the page content element
      const pageSection = utils.getPageSection();
      if (!pageSection) return;
      
      // Show loading state
      pageSection.innerHTML = `
        <div class="auth-container text-center p-5">
          <h2 class="text-gold mb-4">Processing Login</h2>
          <div class="mb-4">
            <div class="progress">
              <div class="progress-bar bg-success" role="progressbar" style="width: 50%"></div>
            </div>
          </div>
          <p>Finalizing your Google login...</p>
        </div>
      `;
  
      // First check for data in URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const dataParam = urlParams.get('data');
      
      let userData = null;
      
      if (dataParam) {
        // Parse the URL parameter data
        try {
          const decodedData = decodeURIComponent(dataParam);
          const data = JSON.parse(decodedData);
          
          if (data.success && data.userPayload) {
            userData = data.userPayload.user;
          }
        } catch (parseError) {
          console.error('Error parsing URL data:', parseError);
        }
      }
      
      // If no URL parameter data, try to parse page content
      if (!userData) {
        try {
          const jsonText = document.body.textContent || '';
          const data = JSON.parse(jsonText.trim());
          
          if (data.success && data.userPayload) {
            userData = data.userPayload.user;
          }
        } catch (parseError) {
          console.error('Error parsing page content:', parseError);
        }
      }
      
      // Process the user data if found
      if (userData) {
        console.log('Successfully found user data:', userData);
        
        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('isAuthenticated', 'true');
        
        // Show success UI
        pageSection.innerHTML = `
          <div class="auth-container text-center p-5">
            <h2 class="text-gold mb-4">Login Successful</h2>
            <div class="mb-4">
              <div class="progress">
                <div class="progress-bar bg-success" role="progressbar" style="width: 100%"></div>
              </div>
            </div>
            <p>You have been successfully logged in with Google.</p>
            <p>Redirecting to dashboard...</p>
          </div>
        `;
        
        // Redirect after a delay
        setTimeout(() => {
          window.location.href = '/'; // Redirect to home page
        }, 2000);
      } else {
        throw new Error('No valid user data found');
      }
    } catch (error) {
      console.error('Error in Google callback:', error);
      
      // Show error UI
      const pageSection = utils.getPageSection();
      if (pageSection) {
        pageSection.innerHTML = `
          <div class="auth-container text-center p-5">
            <h2 class="text-danger mb-4">Authentication Failed</h2>
            <p>Could not process the authentication response.</p>
            <button id="retryAuthBtn" class="btn btn-gold mt-3">Return to Login</button>
          </div>
        `;
        
        // Add retry button handler
        setTimeout(() => {
          const retryBtn = document.getElementById('retryAuthBtn');
          if (retryBtn) {
            retryBtn.addEventListener('click', () => {
              window.location.href = '/login';
            });
          }
        }, 100);
      }
    }
  }
  handleURL(): boolean {
    const path = window.location.pathname || '/';
    console.log('Handling URL:', path);
    if (path.includes('/callback') || path.includes('/oauth/callback')) {
      // Show loading state while we process the callback
      console.log('Handling Google callback...');
      const pageSection = utils.getPageSection();
      if (pageSection) {
        pageSection.innerHTML = `
          <div class="auth-container text-center p-5">
            <h2 class="text-gold mb-4">Processing Login</h2>
            <div class="mb-4">
              <div class="progress">
                <div class="progress-bar bg-success" role="progressbar" style="width: 50%"></div>
              </div>
            </div>
            <p>Finalizing your Google login...</p>
          </div>
        `;
      }
      
      // Process the callback response
      this.handleGoogleCallback();
      return true;
    }
    
    let handler = this.routes[path];
    
    if (!handler && this.routes['*'])
      handler = this.routes['*'];
    else if (!handler && this.routes['/'])
      handler = this.routes['/'];
    
    
    if (!handler) {
      console.error(`No route handler found for path: ${path}`);
      return false;
    }
    
    try {
      this.currentPage = path;
      handler(path);
      
      document.dispatchEvent(new CustomEvent('navigationComplete', {
        detail: { path }
      }));
      
      return true;
    } catch (error) {
      console.error('Error in route handler:', error);
      return false;
    }
  }

  navigate(path: string): void {
    if (this.currentPage === path)
      return;
    
    window.history.pushState({}, '', path);
    
    this.handleURL();
  }
}

const router = new Router();

export default router;