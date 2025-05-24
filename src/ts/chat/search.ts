// /**
//  * Chat Search TypeScript Module
//  * Handles user search functionality with debouncing, caching, and proper error handling
//  */

// // Type definitions
// interface SearchUser {
//     id: string | number;
//     username: string;
//     email?: string;
//     profile_image?: string;
//     is_online?: boolean;
//     last_seen?: string;
//     display_name?: string;
//   }
  
//   interface SearchResponse {
//     users: SearchUser[];
//     total: number;
//     page: number;
//     limit: number;
//     has_more: boolean;
//   }
  
//   interface ChatResponse {
//     chat_id: string | number;
//     participant_ids: (string | number)[];
//     created_at: string;
//     updated_at?: string;
//   }
  
//   interface CreateChatResponse {
//     chat_id: string | number;
//     message: string;
//     success: boolean;
//   }
  
//   interface ChatUI {
//     loadChats: () => Promise<void>;
//     refreshChatList?: () => Promise<void>;
//     showToast?: (message: string, type?: string) => void;
//   }
  
//   interface ChatMessages {
//     joinRoom: (chatId: string | number) => Promise<void>;
//     getCurrentChatId: () => string | number | null;
//   }
  
//   interface WindowExtensions {
//     chatSearch: ChatSearch;
//     chatUI: ChatUI;
//     chatMessages: ChatMessages;
//     baseURL: string;
//     fetchWithAutoRefresh: (url: string, options?: RequestInit) => Promise<Response>;
//   }
  
//   // Extend Window interface
//   declare global {
//     interface Window extends WindowExtensions {}
//   }
  
//   // Configuration
//   const CONFIG = {
//     BASE_URL: 'http://localhost:3000/api/v1',
//     SEARCH: {
//       MIN_QUERY_LENGTH: 1,
//       MAX_QUERY_LENGTH: 50,
//       DEBOUNCE_DELAY: 300,
//       DEFAULT_LIMIT: 5,
//       DEFAULT_PAGE: 1
//     },
//     SELECTORS: {
//       SEARCH_INPUT: 'userSearchInput',
//       SEARCH_RESULTS: 'userSearchResults'
//     },
//     CLASSES: {
//       SEARCH_RESULT: 'searchResult',
//       SEARCH_RESULT_ACTIVE: 'searchResult-active',
//       SEARCH_LOADING: 'search-loading',
//       SEARCH_ERROR: 'search-error',
//       SEARCH_EMPTY: 'search-empty'
//     },
//     ANIMATION_DURATION: 200
//   } as const;
  
//   /**
//    * Chat Search Manager Class
//    */
//   class ChatSearch {
//     private searchInput: HTMLInputElement | null;
//     private searchResults: HTMLElement | null;
//     private debounceTimer: NodeJS.Timeout | null = null;
//     private searchCache: Map<string, SearchUser[]> = new Map();
//     private currentQuery: string = '';
//     private isSearching: boolean = false;
//     private abortController: AbortController | null = null;
//     private selectedIndex: number = -1;
  
//     constructor() {
//       this.initializeDOMElements();
//       this.setupEventListeners();
//       this.setupKeyboardNavigation();
//     }
  
//     /**
//      * Initialize DOM elements with error checking
//      */
//     private initializeDOMElements(): void {
//       this.searchInput = document.getElementById(CONFIG.SELECTORS.SEARCH_INPUT) as HTMLInputElement;
//       this.searchResults = document.getElementById(CONFIG.SELECTORS.SEARCH_RESULTS);
  
//       if (!this.searchInput) {
//         console.error('ChatSearch: Search input element not found');
//       }
//       if (!this.searchResults) {
//         console.error('ChatSearch: Search results element not found');
//       }
  
//       // Set up initial attributes for accessibility
//       if (this.searchInput && this.searchResults) {
//         this.searchInput.setAttribute('role', 'combobox');
//         this.searchInput.setAttribute('aria-expanded', 'false');
//         this.searchInput.setAttribute('aria-autocomplete', 'list');
//         this.searchInput.setAttribute('aria-describedby', 'search-help');
        
//         this.searchResults.setAttribute('role', 'listbox');
//         this.searchResults.setAttribute('aria-label', 'Search results');
//       }
//     }
  
//     /**
//      * Setup event listeners
//      */
//     private setupEventListeners(): void {
//       if (!this.searchInput) return;
  
//       // Input event with debouncing
//       this.searchInput.addEventListener('input', this.handleSearchInput.bind(this));
      
//       // Focus and blur events
//       this.searchInput.addEventListener('focus', this.handleSearchFocus.bind(this));
//       this.searchInput.addEventListener('blur', this.handleSearchBlur.bind(this));
  
//       // Click outside to close results
//       document.addEventListener('click', this.handleOutsideClick.bind(this));
  
//       // Window resize to reposition results
//       window.addEventListener('resize', this.handleWindowResize.bind(this));
//     }
  
//     /**
//      * Setup keyboard navigation
//      */
//     private setupKeyboardNavigation(): void {
//       if (!this.searchInput) return;
  
//       this.searchInput.addEventListener('keydown', this.handleKeydown.bind(this));
//     }
  
//     /**
//      * Handle search input with debouncing
//      */
//     private handleSearchInput(event: Event): void {
//       const target = event.target as HTMLInputElement;
//       const query = target.value.trim();
  
//       // Clear existing timer
//       if (this.debounceTimer) {
//         clearTimeout(this.debounceTimer);
//       }
  
//       // Cancel ongoing request
//       this.cancelCurrentSearch();
  
//       // Validate query length
//       if (query.length > CONFIG.SEARCH.MAX_QUERY_LENGTH) {
//         this.showError('Search query too long');
//         return;
//       }
  
//       // Handle empty query
//       if (!query || query.length < CONFIG.SEARCH.MIN_QUERY_LENGTH) {
//         this.hideSearchResults();
//         return;
//       }
  
//       // Debounce the search
//       this.debounceTimer = setTimeout(() => {
//         this.performSearch(query);
//       }, CONFIG.SEARCH.DEBOUNCE_DELAY);
//     }
  
//     /**
//      * Handle search input focus
//      */
//     private handleSearchFocus(): void {
//       if (this.currentQuery && this.searchResults?.children.length) {
//         this.showSearchResults();
//       }
//     }
  
//     /**
//      * Handle search input blur
//      */
//     private handleSearchBlur(event: FocusEvent): void {
//       // Delay hiding to allow clicking on results
//       setTimeout(() => {
//         const relatedTarget = event.relatedTarget as HTMLElement;
//         if (!relatedTarget || !this.searchResults?.contains(relatedTarget)) {
//           this.hideSearchResults();
//         }
//       }, 150);
//     }
  
//     /**
//      * Handle clicks outside search area
//      */
//     private handleOutsideClick(event: Event): void {
//       const target = event.target as HTMLElement;
//       if (!this.searchInput?.contains(target) && !this.searchResults?.contains(target)) {
//         this.hideSearchResults();
//       }
//     }
  
//     /**
//      * Handle window resize
//      */
//     private handleWindowResize(): void {
//       if (this.searchResults?.style.display === 'block') {
//         this.positionSearchResults();
//       }
//     }
  
//     /**
//      * Handle keyboard navigation
//      */
//     private handleKeydown(event: KeyboardEvent): void {
//       if (!this.searchResults || this.searchResults.style.display === 'none') return;
  
//       const results = Array.from(this.searchResults.children) as HTMLElement[];
      
//       switch (event.key) {
//         case 'ArrowDown':
//           event.preventDefault();
//           this.selectedIndex = Math.min(this.selectedIndex + 1, results.length - 1);
//           this.updateSelection(results);
//           break;
          
//         case 'ArrowUp':
//           event.preventDefault();
//           this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
//           this.updateSelection(results);
//           break;
          
//         case 'Enter':
//           event.preventDefault();
//           if (this.selectedIndex >= 0 && results[this.selectedIndex]) {
//             results[this.selectedIndex].click();
//           }
//           break;
          
//         case 'Escape':
//           event.preventDefault();
//           this.hideSearchResults();
//           this.searchInput?.blur();
//           break;
//       }
//     }
  
//     /**
//      * Update selection highlighting
//      */
//     private updateSelection(results: HTMLElement[]): void {
//       results.forEach((result, index) => {
//         result.classList.toggle(CONFIG.CLASSES.SEARCH_RESULT_ACTIVE, index === this.selectedIndex);
//         result.setAttribute('aria-selected', (index === this.selectedIndex).toString());
//       });
  
//       // Update ARIA attributes
//       if (this.searchInput) {
//         this.searchInput.setAttribute('aria-activedescendant', 
//           this.selectedIndex >= 0 ? `search-result-${this.selectedIndex}` : '');
//       }
//     }
  
//     /**
//      * Perform search with caching and error handling
//      */
//     private async performSearch(query: string): Promise<void> {
//       try {
//         this.currentQuery = query;
//         this.selectedIndex = -1;
  
//         // Check cache first
//         const cachedResults = this.searchCache.get(query.toLowerCase());
//         if (cachedResults) {
//           this.renderSearchResults(cachedResults);
//           return;
//         }
  
//         // Show loading state
//         this.showLoading();
//         this.isSearching = true;
  
//         // Create abort controller for this request
//         this.abortController = new AbortController();
  
//         // Perform search
//         const response = await window.fetchWithAutoRefresh(
//           `${window.baseURL}/users?search=${encodeURIComponent(query)}&page=${CONFIG.SEARCH.DEFAULT_PAGE}&limit=${CONFIG.SEARCH.DEFAULT_LIMIT}`,
//           {
//             credentials: 'include',
//             signal: this.abortController.signal
//           }
//         );
  
//         if (!response.ok) {
//           if (response.status === 404) {
//             this.showEmptyResults();
//           } else {
//             throw new Error(`Search failed: ${response.status} ${response.statusText}`);
//           }
//           return;
//         }
  
//         const users: SearchUser[] = await response.json();
        
//         // Cache results
//         this.searchCache.set(query.toLowerCase(), users);
        
//         // Render results
//         if (users.length === 0) {
//           this.showEmptyResults();
//         } else {
//           this.renderSearchResults(users);
//         }
  
//       } catch (error: any) {
//         if (error.name === 'AbortError') {
//           // Request was cancelled, ignore
//           return;
//         }
        
//         console.error('Search error:', error);
//         this.showError('Failed to search users. Please try again.');
//       } finally {
//         this.isSearching = false;
//         this.abortController = null;
//       }
//     }
  
//     /**
//      * Cancel current search request
//      */
//     private cancelCurrentSearch(): void {
//       if (this.abortController) {
//         this.abortController.abort();
//         this.abortController = null;
//       }
//       this.isSearching = false;
//     }
  
//     /**
//      * Render search results
//      */
//     public renderSearchResults(users: SearchUser[]): void {
//       if (!this.searchResults) return;
  
//       // Clear existing results
//       this.searchResults.innerHTML = '';
  
//       users.forEach((user, index) => {
//         const resultElement = this.createSearchResultElement(user, index);
//         this.searchResults!.appendChild(resultElement);
//       });
  
//       this.showSearchResults();
//     }
  
//     /**
//      * Create search result element
//      */
//     private createSearchResultElement(user: SearchUser, index: number): HTMLElement {
//       const div = document.createElement('div');
      
//       // Set classes and attributes
//       div.classList.add(CONFIG.CLASSES.SEARCH_RESULT);
//       div.setAttribute('role', 'option');
//       div.setAttribute('id', `search-result-${index}`);
//       div.setAttribute('tabindex', '-1');
//       div.setAttribute('aria-selected', 'false');
  
//       // Create content
//       const content = document.createElement('div');
//       content.className = 'search-result-content';
  
//       // Avatar/profile image
//       const avatar = document.createElement('div');
//       avatar.className = 'search-result-avatar';
//       if (user.profile_image) {
//         const img = document.createElement('img');
//         img.src = user.profile_image;
//         img.alt = `${user.username}'s avatar`;
//         img.className = 'avatar-image';
//         avatar.appendChild(img);
//       } else {
//         avatar.innerHTML = user.username.charAt(0).toUpperCase();
//       }
  
//       // User info
//       const info = document.createElement('div');
//       info.className = 'search-result-info';
      
//       const username = document.createElement('div');
//       username.className = 'search-result-username';
//       username.textContent = user.display_name || user.username;
      
//       const email = document.createElement('div');
//       email.className = 'search-result-email';
//       email.textContent = user.email || '';
  
//       info.appendChild(username);
//       if (user.email) {
//         info.appendChild(email);
//       }
  
//       // Online status
//       const status = document.createElement('div');
//       status.className = `search-result-status ${user.is_online ? 'online' : 'offline'}`;
//       status.setAttribute('aria-label', user.is_online ? 'Online' : 'Offline');
  
//       // Assemble element
//       content.appendChild(avatar);
//       content.appendChild(info);
//       content.appendChild(status);
//       div.appendChild(content);
  
//       // Add click handler
//       div.addEventListener('click', () => this.handleUserClick(user));
      
//       // Add hover handlers
//       div.addEventListener('mouseenter', () => {
//         this.selectedIndex = index;
//         this.updateSelection(Array.from(this.searchResults!.children) as HTMLElement[]);
//       });
  
//       return div;
//     }
  
//     /**
//      * Handle user selection
//      */
//     private async handleUserClick(user: SearchUser): Promise<void> {
//       try {
//         // Hide results and clear input
//         this.hideSearchResults();
//         if (this.searchInput) {
//           this.searchInput.value = '';
//         }
  
//         // Show loading state
//         this.showToast('Starting chat...', 'info');
  
//         const chatId = await this.getOrCreateChat(user.id);
        
//         // Join the chat room
//         await window.chatMessages.joinRoom(chatId);
        
//         this.showToast(`Started chat with ${user.username}`, 'success');
  
//       } catch (error) {
//         console.error('Error starting chat:', error);
//         this.showToast('Failed to start chat. Please try again.', 'error');
//       }
//     }
  
//     /**
//      * Get existing chat or create new one
//      */
//     private async getOrCreateChat(userId: string | number): Promise<string | number> {
//       try {
//         // Check if chat exists
//         const existingResponse = await window.fetchWithAutoRefresh(
//           `${window.baseURL}/chats/between/${userId}`,
//           { credentials: 'include' }
//         );
  
//         if (existingResponse.ok) {
//           const data: ChatResponse = await existingResponse.json();
//           return data.chat_id;
//         }
  
//         // Create new chat if doesn't exist
//         if (existingResponse.status === 404) {
//           const createResponse = await window.fetchWithAutoRefresh(
//             `${window.baseURL}/chats`,
//             {
//               method: 'POST',
//               headers: { 'Content-Type': 'application/json' },
//               credentials: 'include',
//               body: JSON.stringify({ user2Id: userId })
//             }
//           );
  
//           if (!createResponse.ok) {
//             throw new Error(`Failed to create chat: ${createResponse.status}`);
//           }
  
//           const newChat: CreateChatResponse = await createResponse.json();
          
//           // Refresh chat list
//           await window.chatUI.loadChats();
          
//           return newChat.chat_id;
//         }
  
//         throw new Error(`Unexpected response: ${existingResponse.status}`);
  
//       } catch (error) {
//         console.error('Error in getOrCreateChat:', error);
//         throw error;
//       }
//     }
  
//     /**
//      * Show loading state
//      */
//     private showLoading(): void {
//       if (!this.searchResults) return;
  
//       this.searchResults.innerHTML = `
//         <div class="${CONFIG.CLASSES.SEARCH_LOADING}">
//           <div class="loading-spinner"></div>
//           <span>Searching...</span>
//         </div>
//       `;
      
//       this.showSearchResults();
//     }
  
//     /**
//      * Show empty results
//      */
//     private showEmptyResults(): void {
//       if (!this.searchResults) return;
  
//       this.searchResults.innerHTML = `
//         <div class="${CONFIG.CLASSES.SEARCH_EMPTY}">
//           <i class="icon-search"></i>
//           <span>No users found</span>
//         </div>
//       `;
      
//       this.showSearchResults();
//     }
  
//     /**
//      * Show error message
//      */
//     private showError(message: string): void {
//       if (!this.searchResults) return;
  
//       this.searchResults.innerHTML = `
//         <div class="${CONFIG.CLASSES.SEARCH_ERROR}">
//           <i class="icon-error"></i>
//           <span>${this.escapeHtml(message)}</span>
//         </div>
//       `;
      
//       this.showSearchResults();
//     }
  
//     /**
//      * Show search results container
//      */
//     private showSearchResults(): void {
//       if (!this.searchResults) return;
  
//       this.searchResults.style.display = 'block';
//       this.searchResults.setAttribute('aria-hidden', 'false');
      
//       if (this.searchInput) {
//         this.searchInput.setAttribute('aria-expanded', 'true');
//       }
  
//       this.positionSearchResults();
//     }
  
//     /**
//      * Hide search results container
//      */
//     private hideSearchResults(): void {
//       if (!this.searchResults) return;
  
//       this.searchResults.style.display = 'none';
//       this.searchResults.setAttribute('aria-hidden', 'true');
      
//       if (this.searchInput) {
//         this.searchInput.setAttribute('aria-expanded', 'false');
//         this.searchInput.removeAttribute('aria-activedescendant');
//       }
  
//       this.selectedIndex = -1;
//     }
  
//     /**
//      * Position search results relative to input
//      */
//     private positionSearchResults(): void {
//       if (!this.searchInput || !this.searchResults) return;
  
//       const inputRect = this.searchInput.getBoundingClientRect();
//       const style = this.searchResults.style;
  
//       style.position = 'absolute';
//       style.top = `${inputRect.bottom + window.scrollY}px`;
//       style.left = `${inputRect.left + window.scrollX}px`;
//       style.width = `${inputRect.width}px`;
//       style.zIndex = '1000';
//     }
  
//     /**
//      * Show toast notification
//      */
//     private showToast(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
//       if (window.chatUI?.showToast) {
//         window.chatUI.showToast(message, type);
//       } else {
//         console.log(`Toast (${type}):`, message);
//       }
//     }
  
//     /**
//      * Escape HTML to prevent XSS
//      */
//     private escapeHtml(text: string): string {
//       const div = document.createElement('div');
//       div.textContent = text;
//       return div.innerHTML;
//     }
  
//     /**
//      * Clear search cache
//      */
//     public clearCache(): void {
//       this.searchCache.clear();
//     }
  
//     /**
//      * Get search statistics
//      */
//     public getSearchStats(): { cacheSize: number; isSearching: boolean; currentQuery: string } {
//       return {
//         cacheSize: this.searchCache.size,
//         isSearching: this.isSearching,
//         currentQuery: this.currentQuery
//       };
//     }
  
//     /**
//      * Destroy instance and cleanup
//      */
//     public destroy(): void {
//       // Cancel ongoing search
//       this.cancelCurrentSearch();
  
//       // Clear timers
//       if (this.debounceTimer) {
//         clearTimeout(this.debounceTimer);
//       }
  
//       // Remove event listeners
//       this.searchInput?.removeEventListener('input', this.handleSearchInput);
//       this.searchInput?.removeEventListener('focus', this.handleSearchFocus);
//       this.searchInput?.removeEventListener('blur', this.handleSearchBlur);
//       this.searchInput?.removeEventListener('keydown', this.handleKeydown);
//       document.removeEventListener('click', this.handleOutsideClick);
//       window.removeEventListener('resize', this.handleWindowResize);
  
//       // Clear cache
//       this.clearCache();
  
//       // Hide results
//       this.hideSearchResults();
//     }
//   }
  
//   // Initialize and export
//   const chatSearch = new ChatSearch();
  
//   // Make available globally for backward compatibility
//   if (typeof window !== 'undefined') {
//     window.chatSearch = {
//       renderSearchResults: (users: SearchUser[]) => chatSearch.renderSearchResults(users),
//       clearCache: () => chatSearch.clearCache(),
//       getSearchStats: () => chatSearch.getSearchStats()
//     };
//   }
  
//   export default ChatSearch;
//   export type { SearchUser, SearchResponse, ChatResponse, CreateChatResponse };
//   export { chatSearch };