// // ===== 5. Notification Manager Module =====
// // components/notificationManager.js
// export class NotificationManager {
//     private apiService: any;
//     private elements: any;
//     private notificationCount: number;
//     private mailboxNotificationCount: number;

//     constructor(apiService : any, elements: any) {
//         this.apiService = apiService;
//         this.elements = elements;
//         this.notificationCount  = 0;
//         this.mailboxNotificationCount = 0;
//     }

//     addNotification(message : string, type : string= 'general') {
//         const box = type === 'message' 
//             ? this.elements.messageNotificationBox 
//             : this.elements.generalNotificationBox;
        
//         const placeholder = box.querySelector('em');
//         if (placeholder) placeholder.remove();

//         const div = document.createElement('div');
//         div.classList.add('notification');
//         div.textContent = message;
        
//         if (box.firstChild) {
//             box.insertBefore(div, box.firstChild);
//         } else {
//             box.appendChild(div);
//         }

//         if (type === 'message') {
//             this.mailboxNotificationCount++;
//             this.elements.mailboxBtn.setAttribute('data-count', this.mailboxNotificationCount);
//         } else {
//             this.notificationCount++;
//             this.elements.bellBtn.setAttribute('data-count', this.notificationCount);
//         }
//     }

//     renderNotificationList(listEl : HTMLElement, data : any[]) {
//         listEl.innerHTML = '';
        
//         if (data.length === 0) {
//             const li = document.createElement('li');
//             li.textContent = listEl.id === 'messageNotifications' 
//                 ? 'No new messages.' 
//                 : 'No notifications.';
//             listEl.appendChild(li);
//             return;
//         }

//         data.forEach(item => {
//             const li = document.createElement('li');
//             li.textContent = item.message;
//             li.style.cssText = `
//                 background-color: ${item.is_read ? 'white' : 'lightblue'};
//                 display: block;
//                 width: 100%;
//                 padding: 0.75rem 1rem;
//                 margin-bottom: 0.5rem;
//                 border: 1px solid #ccc;
//                 border-radius: 0.5rem;
//                 cursor: pointer;
//                 transition: background-color 0.3s ease;
//             `;

//             li.addEventListener('click', async () => {
//                 if (item.type === 'message' && item.chat_id) {
//                     await this.apiService.markChatNotificationsAsRead(item.chat_id);
//                     window.location.href = `chat/chat.html?chatId=${item.chat_id}`;
//                     return;
//                 }

//                 if (!item.is_read) {
//                     const res = await this.apiService.markNotificationAsRead(item.id);
//                     if (res.ok) {
//                         li.style.backgroundColor = 'white';
//                         item.is_read = true;
//                     }
//                 }
//             });

//             li.addEventListener('mouseover', () => {
//                 li.style.backgroundColor = item.is_read ? '#f5f5f5' : '#add8e6';
//             });

//             li.addEventListener('mouseout', () => {
//                 li.style.backgroundColor = item.is_read ? 'white' : 'lightblue';
//             });

//             listEl.appendChild(li);
//         });
//     }

//     async initializeCounters() {
//         try {
//             const [generalNotifications, messageNotifications] = await Promise.all([
//                 this.apiService.getNotifications('others'),
//                 this.apiService.getNotifications('messages')
//             ]);

//             this.notificationCount = generalNotifications.filter((n: any) => n.is_opened === 0).length;
//             this.mailboxNotificationCount = messageNotifications.filter((n : any) => n.is_read === 0).length;

//             this.elements.bellBtn.setAttribute('data-count', this.notificationCount);
//             this.elements.mailboxBtn.setAttribute('data-count', this.mailboxNotificationCount);
//         } catch (error) {
//             console.error('Error initializing notification counters:', error);
//         }
//     }

//     updateMailboxCount(count : number) {
//         this.mailboxNotificationCount = count;
//         this.elements.mailboxBtn.setAttribute('data-count', count);
//     }
// }