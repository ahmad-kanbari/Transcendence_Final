import login from './login';

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

  async init(): Promise<Router> {
    if (this.initialized) return this;
    
    window.addEventListener('popstate', () => {
      this.handleURL();
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

  handleURL(): boolean {
    const path = window.location.pathname || '/';
    
    if (path.includes('/oauth/callback')) {
      login.handleOAuthCallback(this);
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