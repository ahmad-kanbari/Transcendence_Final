/**
 * Localization Service for handling multi-language support
 */

// Import all language files
import enTranslations from '../locales/en.json';
import arTranslations from '../locales/ar.json';
import trTranslations from '../locales/tr.json';

// Define language types
export type Language = 'en' | 'ar' ;
export type Translations = typeof enTranslations;

// Define interface for the localization service
interface LocalizationService {
  currentLanguage: Language;
  translations: Translations;
  isRTL: boolean;
  setLanguage(lang: Language): void;
  getTranslation(key: string, params?: Record<string, string>): string;
  getLanguageName(lang: Language): string;
  getAllLanguages(): Array<{ code: Language; name: string }>;
  applyRTL(): void;
}

/**
 * Localization service implementation
 */
class Localization implements LocalizationService {
  currentLanguage: Language;
  translations: Translations;
  isRTL: boolean;
  
  // Language mapping for display names
  private languageNames = {
    en: 'English',
    ar: 'العربية',
    // tr: 'Türkçe'
  };
  
  // Available translations map
  private translationsMap: Record<Language, Translations> = {
    en: enTranslations,
    ar: arTranslations,
    // tr: trTranslations
  };
  
  // RTL languages
  private rtlLanguages: Language[] = ['ar'];
  
  constructor() {
    // Try to load saved language preference or default to English
    const savedLanguage = localStorage.getItem('language') as Language;
    this.currentLanguage = savedLanguage && this.isValidLanguage(savedLanguage) 
      ? savedLanguage 
      : 'en';
    
    // Load translations for the current language
    this.translations = this.translationsMap[this.currentLanguage];
    
    // Set RTL flag
    this.isRTL = this.rtlLanguages.includes(this.currentLanguage);
    
    // Apply RTL if needed
    if (this.isRTL) {
      this.applyRTL();
    }
    
    // Initialize language switcher if available in DOM
    this.initializeLanguageSwitcher();

  
  // Listen for page changes
  document.addEventListener('pageShown', (event: Event) => {
    const customEvent = event as CustomEvent;
    console.log('Page shown:', customEvent.detail.page);
    // Re-apply translations when page changes
    setTimeout(() => {
      this.updatePageContent();
    }, 100);
  });

  }
  
  /**
   * Check if the language code is valid
   * @param lang Language code to check
   * @returns boolean indicating if the language is valid
   */
  private isValidLanguage(lang: string): lang is Language {
    return Object.keys(this.translationsMap).includes(lang);
  }
  
  /**
   * Set the active language
   * @param lang Language code to set
   */
  setLanguage(lang: Language): void {
    if (this.currentLanguage === lang) return;
    
    // Store the new language as current
    this.currentLanguage = lang;
    
    // Save preference to localStorage
    localStorage.setItem('language', lang);
    
    // Update translations
   this.translations = this.translationsMap[lang];
    
    // Check if we need to update RTL
    const wasRTL = this.isRTL;
    this.isRTL = this.rtlLanguages.includes(lang);
    
    // Only apply/remove RTL if the RTL state changed
    if (wasRTL !== this.isRTL) {
      if (this.isRTL) {
        this.applyRTL();
      } else {
        this.removeRTL();
      }
    }
    
    // Refresh the page content
    this.updatePageContent();
  }
  
  /**
   * Apply RTL styling to the document
   */
  applyRTL(): void {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = this.currentLanguage;
    document.body.classList.add('rtl');
    
    // Add RTL specific CSS class to main layout elements
    document.querySelectorAll('.gameArea, .player1Info, .player2Info, .gameContainer, .paddle1, .paddle2')
      .forEach(el => {
        (el as HTMLElement).classList.add('rtl');
      });
  }
  
  /**
   * Remove RTL styling from the document
   */
  private removeRTL(): void {
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = this.currentLanguage;
    document.body.classList.remove('rtl');
    
    // Remove RTL specific CSS class from elements
    document.querySelectorAll('.gameArea, .player1Info, .player2Info, .gameContainer, .paddle1, .paddle2')
      .forEach(el => {
        (el as HTMLElement).classList.remove('rtl');
      });
  }
  
  /**
   * Get a translation by key with optional parameters
   * @param key Dot notation key for the translation (e.g. 'game.title')
   * @param params Optional parameters to substitute in the translation
   * @returns The translated string
   */
/**

/**
 * Get a translation by key with optional parameters
 */
getTranslation(key: string, params?: Record<string, string>): string {
  try {
    // Split the key path by dots to traverse the nested translation object
    const keys = key.split('.');
    
    // Start with the translations object
    let translation: any = this.translations;
    
    // Traverse the nested keys
    for (const k of keys) {
      if (translation && translation[k] !== undefined) {
        translation = translation[k];
      } else {
        // If key doesn't exist, return the key itself as a fallback
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    // Handle parameter substitution if any
    if (params && typeof translation === 'string') {
      return Object.entries(params).reduce((result, [param, value]) => {
        return result.replace(`{${param}}`, value);
      }, translation);
    }
    
    return typeof translation === 'string' ? translation : key;
  } catch (error) {
    console.error(`Error getting translation for key: ${key}`, error);
    return key;
  }
}
  /**
   * Get the display name of a language
   * @param lang Language code
   * @returns Display name of the language
   */
  getLanguageName(lang: Language): string {
    return this.languageNames[lang] || lang;
  }
  
  /**
   * Get all available languages
   * @returns Array of language objects with code and name
   */
  getAllLanguages(): Array<{ code: Language; name: string }> {
    return Object.keys(this.translationsMap).map(code => ({
      code: code as Language,
      name: this.languageNames[code as Language] || code
    }));
  }
  
  /**
   * Initialize the language switcher in the DOM
   */
  private initializeLanguageSwitcher(): void {
    window.addEventListener('DOMContentLoaded', () => {
      // Create language switcher if it doesn't exist
      this.createLanguageSwitcher();
      
      // Initialize all translatable elements
      this.updatePageContent();
    });
  }
  
  /**
   * Create the language switcher UI
   */
  private createLanguageSwitcher(): void {
    // Check if we already have a language switcher
    const existingSwitcher = document.getElementById('languageSwitcher');
    if (existingSwitcher) return;
    
    // Create the language switcher container
    const switcher = document.createElement('div');
    switcher.id = 'languageSwitcher';
    switcher.className = 'language-switcher';
    
    // Create dropdown select for languages
    const select = document.createElement('select');
    select.id = 'languageSelect';
    select.className = 'language-select';
    select.setAttribute('aria-label', 'Select language');
    
    // Create options for each language
    this.getAllLanguages().forEach(lang => {
      const option = document.createElement('option');
      option.value = lang.code;
      option.text = lang.name;
      option.selected = lang.code === this.currentLanguage;
      select.appendChild(option);
    });
    
    // Add change event listener
    select.addEventListener('change', (e) => {
      const lang = (e.target as HTMLSelectElement).value as Language;
      if (this.isValidLanguage(lang)) {
        this.setLanguage(lang);
      }
    });
    
    // Add the select to the switcher
    switcher.appendChild(select);
    
    // Add the switcher to the navbar
    const navbar = document.querySelector('.navbar-nav');
    if (navbar) {
      // Create a container for the language switcher
      const liElement = document.createElement('li');
      liElement.className = 'nav-item';
      liElement.appendChild(switcher);
      navbar.appendChild(liElement);
    } else {
      // If navbar doesn't exist yet, try to add it later
      setTimeout(() => this.createLanguageSwitcher(), 1000);
    }
  }
  /**
   * Get text direction for current language
   */
  public getDirection(): 'ltr' | 'rtl' {
    return this.isRTL ? 'rtl' : 'ltr';
  }

  /**
   * Check if current language is RTL
   */
  public isCurrentLanguageRTL(): boolean {
    return this.isRTL;
  }
  
  /**
   * Update all translatable elements on the page
   */
/**
 * Update all translatable elements on the page
 */
public updatePageContent(): void {
  // Update elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      element.textContent = this.getTranslation(key);
    }
  });
  
  // Update elements with data-i18n-attr attributes
  document.querySelectorAll('[data-i18n-attr]').forEach(element => {
    const keyAndAttr = element.getAttribute('data-i18n-attr');
    if (keyAndAttr) {
      const [attr, key] = keyAndAttr.split(':');
      if (attr && key) {
        element.setAttribute(attr, this.getTranslation(key));
      }
    }
  });
  
  // Dispatch a custom event that other components can listen to
  document.dispatchEvent(new CustomEvent('languageChanged', {
    detail: { language: this.currentLanguage, isRTL: this.isRTL }
  }));
}


}
// Singleton instance of the localization service
const localization = new Localization();

// Export a helper function for easy access to translations
export function t(key: string, params?: Record<string, string>): string {
  return localization.getTranslation(key, params);
}
declare global {
  interface Window {
    localization: typeof localization;
  }
}

window.localization = localization;

export default localization;