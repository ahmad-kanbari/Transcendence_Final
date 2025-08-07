import api from './api';
import utils from './utils';
import components from './components';
import { AVAILABLE_PAGES } from './constants';
import localization, { t } from './localization';
import accessibility from './accessibility';
import toastManager from './toastManager';
import app from './app';

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
      // console.log('Fetched HTML pages:', htmlPages);
      Object.entries(htmlPages as Record<string, HTMLElement>).forEach(([pageName, element]) => {
        if (element) {
          this.pages[pageName] = element.innerHTML;
        }
      });
      // console.log('All pages loaded successfully:', this.pages);
      
    } catch (error) {
      // components.showToast(
      //   'error',
      //   'Content Load Error',
      //   'Failed to load page content. Please try refreshing the page.',
      //   6000
      // );
      toastManager.error(
        app.getUsername(),
        'Failed to load page content. Please try refreshing the page.'
      );  
    } finally {
      components.hideSpinner();
    }
  }
  
  showPage(pageName: string): void {
    const content = this.pages[pageName];
    
    if (!content) {
      // components.showToast(
      //   'error',
      //   'Page Not Found',
      //   `The requested page "${pageName}" could not be found.`,
      //   5000
      // );
      toastManager.error(
        app.getUsername(),
        `The requested page "${pageName}" could not be found.`
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
      
      // Apply localization to the new page content
      this.applyLocalizationToPage();
      
      // Enhance accessibility for the new page content
      accessibility.enhanceKeyboardNavigation();
      
      document.dispatchEvent(new CustomEvent('pageShown', { 
        detail: { page: pageName } 
      }));
    } catch (error) {
      // components.showToast(
      //   'error',
      //   'Page Display Error',
      //   `There was a problem displaying the ${pageName} page.`,
      //   5000
      // );
      toastManager.error(
        app.getUsername(),
        `There was a problem displaying the ${pageName} page.`
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
  
  /**
   * Apply localization to the current page content
   * This method translates all elements with data-i18n attributes
   */
  applyLocalizationToPage(): void {
    // Let the localization service handle the translation by triggering an event
    document.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { 
        language: localization.currentLanguage, 
        isRTL: localization.isRTL 
      }
    }));
  }
}

const pages = new Pages();

export default pages;
