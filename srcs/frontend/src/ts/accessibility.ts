/**
 * Accessibility Module
 * Provides accessibility features including high contrast mode, 
 * text resizing, and keyboard navigation improvements
 */

interface AccessibilityOptions {
  highContrast: boolean;
  textSize: 'small' | 'medium' | 'large';
}

class AccessibilityService {
  private options: AccessibilityOptions;
  
  constructor() {
    // Try to load saved preferences or use defaults
    const savedOptions = localStorage.getItem('accessibility');
    this.options = savedOptions 
      ? JSON.parse(savedOptions) 
      : {
          highContrast: false,
          textSize: 'medium'
        };
    
    // Apply saved settings
    this.applySettings();
    
    // Initialize accessibility controls once DOM is loaded
    window.addEventListener('DOMContentLoaded', () => {
      this.initAccessibilityControls();
    });
    
    // Also initialize controls when the language changes
    document.addEventListener('languageChanged', () => {
      this.updateControlLabels();
    });
  }
  
  /**
   * Create and append accessibility controls to the document
   */
  private initAccessibilityControls(): void {
    // Check if controls already exist
    if (document.getElementById('accessibilityControls')) return;
    
    // Create skip to content link for keyboard users
    this.createSkipToContentLink();
    
    // Create accessibility navigation
    const accessibilityNav = document.createElement('div');
    accessibilityNav.id = 'accessibilityControls';
    accessibilityNav.className = 'accessibility-nav';
    
    // Create high contrast toggle
    const contrastBtn = document.createElement('button');
    contrastBtn.id = 'highContrastToggle';
    contrastBtn.setAttribute('aria-pressed', this.options.highContrast.toString());
    contrastBtn.setAttribute('data-i18n', 'accessibility.highContrast');
    contrastBtn.textContent = 'Contrast'; // Default, will be updated by i18n
    if (this.options.highContrast) contrastBtn.classList.add('active');
    
    contrastBtn.addEventListener('click', () => {
      this.toggleHighContrast();
      contrastBtn.classList.toggle('active');
      contrastBtn.setAttribute('aria-pressed', this.options.highContrast.toString());
    });
    
    // Create text size controls
    const textSizeControls = document.createElement('div');
    textSizeControls.className = 'text-size-controls';
    
    // Text size label - screen reader only
    const textSizeLabel = document.createElement('span');
    textSizeLabel.className = 'sr-only';
    textSizeLabel.setAttribute('data-i18n', 'accessibility.textSize');
    textSizeLabel.textContent = 'Text Size';
    
    // Small text button
    const smallTextBtn = document.createElement('button');
    smallTextBtn.id = 'smallTextBtn';
    smallTextBtn.textContent = 'A';
    smallTextBtn.style.fontSize = '0.8rem';
    smallTextBtn.setAttribute('aria-label', 'Small Text');
    smallTextBtn.setAttribute('data-i18n-attr', 'aria-label:accessibility.textSizeSmall');
    if (this.options.textSize === 'small') smallTextBtn.classList.add('active');
    
    smallTextBtn.addEventListener('click', () => {
      this.setTextSize('small');
      this.updateTextSizeButtons(smallTextBtn);
    });
    
    // Medium text button
    const mediumTextBtn = document.createElement('button');
    mediumTextBtn.id = 'mediumTextBtn';
    mediumTextBtn.textContent = 'A';
    mediumTextBtn.style.fontSize = '1rem';
    mediumTextBtn.setAttribute('aria-label', 'Medium Text');
    mediumTextBtn.setAttribute('data-i18n-attr', 'aria-label:accessibility.textSizeMedium');
    if (this.options.textSize === 'medium') mediumTextBtn.classList.add('active');
    
    mediumTextBtn.addEventListener('click', () => {
      this.setTextSize('medium');
      this.updateTextSizeButtons(mediumTextBtn);
    });
    
    // Large text button
    const largeTextBtn = document.createElement('button');
    largeTextBtn.id = 'largeTextBtn';
    largeTextBtn.textContent = 'A';
    largeTextBtn.style.fontSize = '1.2rem';
    largeTextBtn.setAttribute('aria-label', 'Large Text');
    largeTextBtn.setAttribute('data-i18n-attr', 'aria-label:accessibility.textSizeLarge');
    if (this.options.textSize === 'large') largeTextBtn.classList.add('active');
    
    largeTextBtn.addEventListener('click', () => {
      this.setTextSize('large');
      this.updateTextSizeButtons(largeTextBtn);
    });
    
    // Add buttons to the accessibility navigation
    accessibilityNav.appendChild(contrastBtn);
    textSizeControls.appendChild(textSizeLabel);
    textSizeControls.appendChild(smallTextBtn);
    textSizeControls.appendChild(mediumTextBtn);
    textSizeControls.appendChild(largeTextBtn);
    accessibilityNav.appendChild(textSizeControls);
    
    // Add accessibility navigation to the document
    document.body.appendChild(accessibilityNav);
    
    // Update control labels with current language
    this.updateControlLabels();
  }
  
  /**
   * Create a skip to content link for keyboard users
   */
  private createSkipToContentLink(): void {
    const skipLink = document.createElement('a');
    skipLink.href = '#pageSection';
    skipLink.className = 'skip-to-content';
    skipLink.textContent = 'Skip to content';
    skipLink.setAttribute('data-i18n', 'accessibility.skipToContent');
    document.body.prepend(skipLink);
  }
  
  /**
   * Update text size buttons active state
   * @param activeBtn The button that was clicked
   */
  private updateTextSizeButtons(activeBtn: HTMLElement): void {
    const textSizeBtns = document.querySelectorAll('.text-size-controls button');
    textSizeBtns.forEach(btn => {
      btn.classList.remove('active');
    });
    activeBtn.classList.add('active');
  }
  
  /**
   * Update control labels when language changes
   */
  private updateControlLabels(): void {
    // This will be handled by the localization service
    // through data-i18n attributes
  }
  
  /**
   * Toggle high contrast mode
   */
  toggleHighContrast(): void {
    this.options.highContrast = !this.options.highContrast;
    this.applySettings();
    this.saveSettings();
  }
  
  /**
   * Set text size
   * @param size Text size to set (small, medium, or large)
   */
  setTextSize(size: 'small' | 'medium' | 'large'): void {
    this.options.textSize = size;
    this.applySettings();
    this.saveSettings();
  }
  
  /**
   * Apply current accessibility settings to the document
   */
  private applySettings(): void {
    // Apply high contrast mode
    if (this.options.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
    
    // Apply text size
    document.body.classList.remove('text-size-small', 'text-size-medium', 'text-size-large');
    document.body.classList.add(`text-size-${this.options.textSize}`);
  }
  
  /**
   * Save current settings to localStorage
   */
  private saveSettings(): void {
    localStorage.setItem('accessibility', JSON.stringify(this.options));
  }
  
  /**
   * Enhance keyboard navigation for interactive elements
   */
  enhanceKeyboardNavigation(): void {
    // Ensure all interactive elements have appropriate tabindex
    document.querySelectorAll('a, button, input, select, textarea, [role="button"]').forEach(el => {
      if (!(el as HTMLElement).hasAttribute('tabindex')) {
        (el as HTMLElement).setAttribute('tabindex', '0');
      }
    });
    
    // Add keyboard handling for custom UI components
    this.addKeyboardHandlersToCustomComponents();
  }
  
  /**
   * Add keyboard event handlers to custom components
   */
  private addKeyboardHandlersToCustomComponents(): void {
    // Add keyboard support for UI components that might not be natively accessible
    document.querySelectorAll('[role="button"]:not(button)').forEach(el => {
      el.addEventListener('keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent;
        // Activate on Space or Enter key
        if (keyEvent.key === ' ' || keyEvent.key === 'Enter') {
          e.preventDefault();
          (el as HTMLElement).click();
        }
      });
    });
  }
  
  /**
   * Get the current accessibility options
   * @returns The current accessibility options
   */
  getOptions(): AccessibilityOptions {
    return { ...this.options };
  }
}

// Create a singleton instance
const accessibility = new AccessibilityService();
export default accessibility;
