import api from './api';
import utils from './utils';
import components from './components';
import { AVAILABLE_PAGES } from './constants';

// Define interfaces for pages data structure
interface PagesCollection {
  [key: string]: string | null;
}

class Pages {
  appContainer: HTMLElement | null;
  pageSection: HTMLElement | null;
  pages: PagesCollection;
  
  constructor() {
    this.appContainer = null;
    this.pageSection = null;
    this.pages = {};
  }
  
  init(appContainer: HTMLElement): void {
    this.appContainer = appContainer;
    
    this.pageSection = document.createElement('section');
    this.pageSection.id = 'pageSection';
    this.pageSection.className = 'page-content';
    this.appContainer.appendChild(this.pageSection);

    AVAILABLE_PAGES.forEach(page => {
      this.pages[page] = null;
    });
  }
  
  async loadAllPages(): Promise<void> {
    components.showSpinner();
    
    try {
      const htmlPages = await api.fetchAllPages();
      
      Object.entries(htmlPages as Record<string, HTMLElement>).forEach(([pageName, element]) => {
        if (element) {
          this.pages[pageName] = element.innerHTML;
        }
      });
      
    } catch (error) {
      components.showToast(
        'error',
        'Content Load Error',
        'Failed to load page content. Please try refreshing the page.',
        6000
      );
    } finally {
      components.hideSpinner();
    }
  }
  
  showPage(pageName: string): void {
    const content = this.pages[pageName];
    
    if (!content) {
      components.showToast(
        'error',
        'Page Not Found',
        `The requested page "${pageName}" could not be found.`,
        5000
      );

      if (this.pages.notFound) {
        this.pageSection!.innerHTML = this.pages.notFound;
        this.updateActiveNavLink('notFound');
        document.dispatchEvent(new CustomEvent('pageShown', { 
          detail: { page: 'notFound' } 
        }));
      } else if (this.pages.home) {
        this.pageSection!.innerHTML = this.pages.home;
        this.updateActiveNavLink('home');
        document.dispatchEvent(new CustomEvent('pageShown', { 
          detail: { page: 'home' } 
        }));
      }
      return;
    }
    
    components.showSpinner();
    
    try {
      this.pageSection!.innerHTML = content;
      this.updateActiveNavLink(pageName);
      window.scrollTo(0, 0);
      
      document.dispatchEvent(new CustomEvent('pageShown', { 
        detail: { page: pageName } 
      }));
    } catch (error) {
      components.showToast(
        'error',
        'Page Display Error',
        `There was a problem displaying the ${pageName} page.`,
        5000
      );
    } finally {
      components.hideSpinner();
    }
  }
  
  updateActiveNavLink(pageName: string): void {
    utils.queryAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    
    const navLink = utils.query(`#${pageName}NavBtn`);
    if (navLink) {
      navLink.classList.add('active');
    }
  }
}

const pages = new Pages();

export default pages;