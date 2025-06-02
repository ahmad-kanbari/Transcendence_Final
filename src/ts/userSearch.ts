// export class UserSearch {
//     constructor(apiService, elements, onUserSelect) {
//         this.apiService = apiService;
//         this.elements = elements;
//         this.onUserSelect = onUserSelect;

//         this.initializeEventListeners();
//     }

//     initializeEventListeners() {
//         this.elements.userSearchInput.addEventListener('input', () => this.handleSearch());
//     }

//     async handleSearch() {
//         const query = this.elements.userSearchInput.value.trim();

//         if (!query) {
//             this.elements.userSearchResults.style.display = 'none';
//             return;
//         }

//         const users = await this.apiService.searchUsers(query);
//         this.renderSearchResults(users);
//     }

//     renderSearchResults(data) {
//         const resultsContainer = this.elements.userSearchResults;
//         resultsContainer.innerHTML = '';

//         if (data.length === 0) {
//             resultsContainer.style.display = 'none';
//             return;
//         }

//         data.forEach(user => {
//             const li = document.createElement('li');
//             li.textContent = user.username;
//             li.addEventListener('click', () => {
//                 this.onUserSelect(user);
//                 this.elements.userSearchInput.value = '';
//                 resultsContainer.style.display = 'none';
//             });
//             resultsContainer.appendChild(li);
//         });

//         resultsContainer.style.display = 'block';
//     }
// }