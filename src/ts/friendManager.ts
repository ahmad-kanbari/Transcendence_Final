// // components/friendManager.js

// export class FriendManager {
//     private apiService: any;
//     private elements: any;

//     constructor(apiService : any, elements : any) {
//         this.apiService = apiService;
//         this.elements = elements;
//     }

//     async sendFriendRequest(userId : string) {
//         const res = await this.apiService.sendFriendRequest(userId);
//         if (res.ok) {
//             alert('Request sent ✅');
//             this.loadFriendData();
//         } else {
//             const err = await res.text();
//             alert('Failed to send request ❌\n' + err);
//         }
//     }

//     async loadFriendData() {
//         await Promise.all([
//             this.loadIncomingRequests(),
//             this.loadOutgoingRequests(),
//             this.loadFriendsList()
//         ]);
//     }

//     async loadIncomingRequests() {
//         const requests = await this.apiService.getFriendships('pending', 'received');
//         this.renderList(this.elements.incomingList, requests, (item : any) => {
//             const li = document.createElement('li');
//             li.textContent = item.senderUsername;

//             const acceptBtn = this.makeButton('Accept', async () => {
//                 await this.apiService.updateFriendship(item.friendshipId, 'accept');
//                 this.loadFriendData();
//             });

//             const rejectBtn = this.makeButton('Reject', async () => {
//                 await this.apiService.updateFriendship(item.friendshipId, 'reject');
//                 this.loadFriendData();
//             });

//             li.appendChild(acceptBtn);
//             li.appendChild(rejectBtn);
//             return li;
//         });
//     }

//     async loadOutgoingRequests() {
//         const requests = await this.apiService.getFriendships('pending', 'sent');
//         this.renderList(this.elements.outgoingList, requests, (item : any) => {
//             const li = document.createElement('li');
//             li.textContent = item.senderUsername;

//             const cancelBtn = this.makeButton('Cancel', async () => {
//                 await this.apiService.deleteFriendship(item.friendshipId);
//                 this.loadFriendData();
//             });

//             li.appendChild(cancelBtn);
//             return li;
//         });
//     }

//     async loadFriendsList() {
//         const friends = await this.apiService.getFriendships();
//         this.renderList(this.elements.friendsList, friends, (item : any) => {
//             const li = document.createElement('li');
//             li.textContent = item.username;

//             const removeBtn = this.makeButton('Remove', async () => {
//                 await this.apiService.deleteFriendship(item.friendshipId);
//                 this.loadFriendData();
//             });

//             li.appendChild(removeBtn);
//             return li;
//         });
//     }

//     renderList(
//         listEl: HTMLElement,
//         data: any[],
//         itemRenderer: (item: any) => HTMLElement
//     ) {
//         listEl.innerHTML = '';
//         if (data.length === 0) {
//             const li = document.createElement('li');
//             li.textContent = 'No items.';
//             listEl.appendChild(li);
//             return;
//         }
//         data.forEach(item => {
//             const li = itemRenderer(item);
//             listEl.appendChild(li);
//         });
//     }

//     makeButton(text: string, onClick: (this: HTMLElement, ev: MouseEvent) => any) {
//         const btn = document.createElement('button');
//         btn.textContent = text;
//         btn.style.marginTop = '0.25rem';
//         btn.addEventListener('click', onClick);
//         return btn;
//     }
// }