// // Types
// interface ToastQueueItem {
//     username: string;
//     message: string;
//   }
  
//   interface NotificationData {
//     id: number;
//     message: string;
//     type: 'message' | 'general';
//     is_read: boolean;
//     is_opened?: number;
//     sender_id?: number;
//     chat_id?: number;
//   }
  
//   interface SocketData {
//     username: string;
//     message: string;
//   }
  
//   interface FriendData {
//     id: number;
//     username: string;
//     friendshipId: number;
//     senderUsername: string;
//   }
  
//   interface UserSearchResult {
//     id: number;
//     username: string;
//   }
  
//   // Toast notification queue system
//   const toastQueue: ToastQueueItem[] = [];
//   let isShowingToast = false;
  
//   function createToastElement(username: string, message: string): HTMLDivElement {
//     const toast = document.createElement("div");
//     toast.className = "fixed top-4 right-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white p-4 rounded-lg shadow-2xl transform translate-x-full transition-transform duration-300 ease-out border border-cyan-400/30 backdrop-blur-sm max-w-sm";
  
//     const header = document.createElement("div");
//     header.className = "font-bold text-cyan-200 mb-1 text-sm uppercase tracking-wide";
//     header.textContent = username;
  
//     const messageDiv = document.createElement("div");
//     messageDiv.className = "text-white/90 text-sm";
//     messageDiv.textContent = message;
  
//     toast.appendChild(header);
//     toast.appendChild(messageDiv);
//     document.body.appendChild(toast);
  
//     return toast;
//   }
  
//   async function showNextToast(): Promise<void> {
//     if (isShowingToast || toastQueue.length === 0) return;
  
//     isShowingToast = true;
//     const { username, message } = toastQueue.shift()!;
  
//     const toast = createToastElement(username, message);
  
//     // Trigger reflow to ensure transition works
//     void toast.offsetWidth;
//     toast.classList.remove("translate-x-full");
//     toast.classList.add("translate-x-0");
  
//     await new Promise((resolve) => setTimeout(resolve, 2000));
  
//     toast.classList.remove("translate-x-0");
//     toast.classList.add("translate-x-full");
//     await new Promise((resolve) => setTimeout(resolve, 300)); // Wait for fade out
  
//     toast.remove();
//     isShowingToast = false;
//     showNextToast(); // Show next toast if any
//   }
  
//   // DOM Elements
//   const userSearchInput = document.getElementById("userSearch") as HTMLInputElement;
//   const userSearchResults = document.getElementById("userSearchResults") as HTMLUListElement;
//   const logoutBtn = document.getElementById("logoutBtn") as HTMLButtonElement;
//   const showUserBtn = document.getElementById("showUserBtn") as HTMLButtonElement;
//   const bellBtn = document.getElementById("bellBtn") as HTMLDivElement;
//   const mailboxBtn = document.getElementById("mailboxBtn") as HTMLDivElement;
//   const generalNotificationBox = document.getElementById("generalNotifications") as HTMLDivElement;
//   const messageNotificationBox = document.getElementById("messageNotifications") as HTMLDivElement;
//   const incomingList = document.getElementById("incomingRequests") as HTMLUListElement;
//   const outgoingList = document.getElementById("outgoingRequests") as HTMLUListElement;
//   const friendsList = document.getElementById("friendsList") as HTMLUListElement;
  
//   const deviceId = localStorage.getItem("deviceId");
  
//   // Notification state
//   let notificationCount = 0;
//   let mailboxNotificationCount = 0;
  
//   // Socket connection
//   console.log("Trying to connect to:", window.location.hostname);
  
//   // Declare socket type
//   declare const io: any;
//   declare const baseURL: string;
//   declare const fetchWithAutoRefresh: (url: string, options?: RequestInit) => Promise<Response>;
  
//   const socket = io("http://localhost:3000", {
//     withCredentials: true,
//   });
  
//   function addNotification(message: string, type: 'general' | 'message' = 'general'): void {
//     const box = type === "message" ? messageNotificationBox : generalNotificationBox;
//     const placeholder = box.querySelector("em");
//     if (placeholder) placeholder.remove();
  
//     const div = document.createElement("div");
//     div.classList.add("notification", "p-3", "mb-2", "bg-gray-800/60", "backdrop-blur-sm", "border", "border-cyan-500/30", "rounded-lg", "text-cyan-100", "hover:bg-gray-700/60", "transition-colors", "cursor-pointer");
//     div.textContent = message;
    
//     if (box.firstChild) {
//       box.insertBefore(div, box.firstChild);
//     } else {
//       box.appendChild(div);
//     }
  
//     if (type === "message") {
//       mailboxNotificationCount++;
//       mailboxBtn.setAttribute("data-count", mailboxNotificationCount.toString());
//     } else {
//       notificationCount++;
//       bellBtn.setAttribute("data-count", notificationCount.toString());
//     }
//   }
  
//   // Socket event listeners
//   socket.on("messageReceivedInform", async (data: SocketData) => {
//     // Add to queue using the directly provided username and message content
//     toastQueue.push({
//       username: data.username,
//       message: data.message.slice(0, 100), // Only show first 100 chars in toast
//     });
  
//     // Try to show next toast
//     showNextToast();
  
//     // Add to notification box and update counter
//     addNotification(data.message, "message");
  
//     // Update mailbox counter with latest count
//     const page = 1;
//     const limit = 50;
//     const res = await fetchWithAutoRefresh(
//       `${baseURL}/notifications/messages?page=${page}&limit=${limit}`,
//       { credentials: "include" }
//     );
  
//     if (res.ok) {
//       const notifications: NotificationData[] = await res.json();
//       const uniqueSenders = new Set(
//         notifications.filter((n) => !n.is_read).map((n) => n.sender_id)
//       );
  
//       mailboxNotificationCount = uniqueSenders.size;
//       mailboxBtn.setAttribute("data-count", mailboxNotificationCount.toString());
//       renderNotificationList(messageNotificationBox, notifications);
//     }
//   });
  
//   socket.on("friendRequestInform", (data: SocketData) => {
//     addNotification(data.message, "general");
//     loadFriendData();
//   });
  
//   socket.on("friendRequestAccept", (data: SocketData) => {
//     addNotification(data.message, "general");
//     loadFriendData();
//   });
  
//   // Initialize notification counters
//   async function initializeNotificationCounter(): Promise<void> {
//     try {
//       const page = 1;
//       const limit = 5;
//       const res = await fetchWithAutoRefresh(
//         `${baseURL}/notifications/others?page=${page}&limit=${limit}`,
//         { credentials: "include" }
//       );
//       if (!res.ok) throw new Error("Failed to fetch notifications");
  
//       const notifications: NotificationData[] = await res.json();
//       notificationCount = notifications.filter(
//         (n) => n.is_opened === 0
//       ).length;
//       bellBtn.setAttribute("data-count", notificationCount.toString());
//     } catch (error) {
//       console.error("Error initializing notification counter:", error);
//     }
//   }
  
//   async function initializeMailboxNotificationCounter(): Promise<void> {
//     try {
//       const page = 1;
//       const limit = 5;
//       const res = await fetchWithAutoRefresh(
//         `${baseURL}/notifications/messages?page=${page}&limit=${limit}`,
//         { credentials: "include" }
//       );
//       if (!res.ok) throw new Error("Failed to fetch mailbox notifications");
  
//       const notifications: NotificationData[] = await res.json();
//       mailboxNotificationCount = notifications.filter(
//         (n) => n.is_read === false
//       ).length;
//       mailboxBtn.setAttribute("data-count", mailboxNotificationCount.toString());
//     } catch (error) {
//       console.error("Error initializing mailbox notification counter:", error);
//     }
//   }
  
//   // Notification click handlers
//   bellBtn.addEventListener("click", async () => {
//     const visible = generalNotificationBox.style.display === "block";
//     generalNotificationBox.style.display = visible ? "none" : "block";
//     messageNotificationBox.style.display = "none"; // Hide other box
  
//     if (!visible) {
//       try {
//         const res = await fetchWithAutoRefresh(
//           `${baseURL}/notifications/others`,
//           {
//             method: "PATCH",
//             credentials: "include",
//           }
//         );
//         if (!res.ok)
//           throw new Error("Failed to mark notifications as opened");
//         notificationCount = 0;
//         bellBtn.setAttribute("data-count", "0");
//       } catch (error) {
//         console.error("Error marking notifications as opened:", error);
//       }
//     }
  
//     const page = 1;
//     const limit = 5;
//     const notificationListRes = await fetchWithAutoRefresh(
//       `${baseURL}/notifications/others?page=${page}&limit=${limit}`,
//       { credentials: "include" }
//     );
//     if (!notificationListRes.ok) return;
  
//     const notificationListData: NotificationData[] = await notificationListRes.json();
//     renderNotificationList(generalNotificationBox, notificationListData);
//   });
  
//   mailboxBtn.addEventListener("click", async () => {
//     const visible = messageNotificationBox.style.display === "block";
//     messageNotificationBox.style.display = visible ? "none" : "block";
//     generalNotificationBox.style.display = "none"; // Hide other box
  
//     const page = 1;
//     const limit = 5;
//     const mailboxNotificationListRes = await fetchWithAutoRefresh(
//       `${baseURL}/notifications/messages?page=${page}&limit=${limit}`,
//       { credentials: "include" }
//     );
//     if (!mailboxNotificationListRes.ok) return;
  
//     const mailboxNotificationListData: NotificationData[] = await mailboxNotificationListRes.json();
//     renderNotificationList(messageNotificationBox, mailboxNotificationListData);
//   });
  
//   // Helper function to render notification lists
//   function renderNotificationList(listEl: HTMLElement, data: NotificationData[]): void {
//     listEl.innerHTML = "";
//     if (data.length === 0) {
//       const li = document.createElement("li");
//       li.className = "p-4 text-center text-gray-400 italic";
//       li.textContent = listEl.id === "messageNotifications" ? "No new messages." : "No notifications.";
//       listEl.appendChild(li);
//       return;
//     }
  
//     data.forEach((item) => {
//       const li = document.createElement("li");
//       li.className = `p-3 mb-2 rounded-lg cursor-pointer transition-all duration-200 border ${
//         item.is_read 
//           ? 'bg-gray-800/40 border-gray-600/30 text-gray-300 hover:bg-gray-700/50' 
//           : 'bg-cyan-900/30 border-cyan-500/40 text-cyan-100 hover:bg-cyan-800/40'
//       }`;
//       li.textContent = item.message;
  
//       li.addEventListener("click", async () => {
//         if (item.type === "message" && item.chat_id) {
//           await fetchWithAutoRefresh(
//             `${baseURL}/notifications/messages/by-chat/${item.chat_id}`,
//             {
//               method: "PATCH",
//               credentials: "include",
//             }
//           );
  
//           window.location.href = `chat/chat.html?chatId=${item.chat_id}`;
//           return;
//         }
  
//         if (item.is_read) return;
  
//         try {
//           await fetchWithAutoRefresh(
//             `${baseURL}/notifications/others/${item.id}`,
//             {
//               method: "PATCH",
//               credentials: "include",
//             }
//           );
//           li.className = li.className.replace('bg-cyan-900/30 border-cyan-500/40 text-cyan-100', 'bg-gray-800/40 border-gray-600/30 text-gray-300');
//           item.is_read = true;
//         } catch (error) {
//           console.error("Error marking notification as read:", error);
//         }
//       });
  
//       listEl.appendChild(li);
//     });
//   }
  
//   // Utility functions
//   function renderList<T>(listEl: HTMLElement, data: T[], itemRenderer: (item: T) => HTMLElement): void {
//     listEl.innerHTML = "";
//     if (data.length === 0) {
//       const li = document.createElement("li");
//       li.className = "p-4 text-center text-gray-400 italic";
//       li.textContent = "No items.";
//       listEl.appendChild(li);
//       return;
//     }
//     data.forEach((item) => {
//       const li = itemRenderer(item);
//       listEl.appendChild(li);
//     });
//   }
  
//   function makeButton(text: string, onClick: () => Promise<void> | void): HTMLButtonElement {
//     const btn = document.createElement("button");
//     btn.textContent = text;
//     btn.className = "mt-1 px-3 py-1 text-xs bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-md hover:from-cyan-500 hover:to-purple-500 transition-all duration-200 border border-cyan-400/30";
//     btn.addEventListener("click", onClick);
//     return btn;
//   }
  
//   const sendFriendRequest = async (userId: number): Promise<void> => {
//     const res = await fetchWithAutoRefresh(`${baseURL}/friendships`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       credentials: "include",
//       body: JSON.stringify({ friendId: userId }),
//     });
  
//     if (res.ok) {
//       alert("Request sent ✅");
//       loadFriendData();
//     } else {
//       const err = await res.text();
//       alert("Failed to send request ❌\n" + err);
//     }
//   };
  
//   // Render search results
//   const renderSearchResults = (data: UserSearchResult[]): void => {
//     userSearchResults.innerHTML = "";
//     userSearchResults.className = "absolute top-full left-0 right-0 bg-gray-900 border border-cyan-500/30 rounded-lg mt-1 max-h-60 overflow-y-auto z-50 shadow-2xl";
    
//     if (data.length === 0) {
//       userSearchResults.style.display = "none";
//       return;
//     }
  
//     data.forEach((user) => {
//       const li = document.createElement("li");
//       li.className = "p-3 hover:bg-cyan-900/30 cursor-pointer text-cyan-100 border-b border-gray-700/50 last:border-b-0 transition-colors";
//       li.textContent = user.username;
//       li.addEventListener("click", () => {
//         sendFriendRequest(user.id);
//         userSearchInput.value = "";
//         console.log(`Friend request sent to ${user.username}`);
//         userSearchResults.style.display = "none";
//       });
//       userSearchResults.appendChild(li);
//     });
  
//     userSearchResults.style.display = "block";
//   };
  
//   // Load friend data
//   async function loadFriendData(): Promise<void> {
//     // Incoming Requests
//     const incomingReqRes = await fetchWithAutoRefresh(
//       `${baseURL}/friendships?status=pending&direction=received`,
//       { credentials: "include" }
//     );
//     if (incomingReqRes.ok) {
//       const incomingReqData: FriendData[] = await incomingReqRes.json();
//       renderList(incomingList, incomingReqData, (item) => {
//         const li = document.createElement("li");
//         li.className = "p-3 mb-2 bg-gray-800/60 backdrop-blur-sm border border-yellow-500/30 rounded-lg text-yellow-100";
//         li.textContent = item.senderUsername;
  
//         const acceptBtn = makeButton("Accept", async () => {
//           await fetchWithAutoRefresh(`${baseURL}/friendships/${item.friendshipId}`, {
//             method: "PATCH",
//             headers: { "Content-Type": "application/json" },
//             credentials: "include",
//             body: JSON.stringify({ action: "accept" }),
//           });
//           loadFriendData();
//         });
  
//         const rejectBtn = makeButton("Reject", async () => {
//           await fetchWithAutoRefresh(`${baseURL}/friendships/${item.friendshipId}`, {
//             method: "PATCH",
//             headers: { "Content-Type": "application/json" },
//             credentials: "include",
//             body: JSON.stringify({ action: "reject" }),
//           });
//           loadFriendData();
//         });
  
//         li.appendChild(acceptBtn);
//         li.appendChild(rejectBtn);
//         return li;
//       });
//     }
  
//     // Outgoing Requests
//     const outgoingReqRes = await fetchWithAutoRefresh(
//       `${baseURL}/friendships?status=pending&direction=sent`,
//       { credentials: "include" }
//     );
//     if (outgoingReqRes.ok) {
//       const outgoingReqData: FriendData[] = await outgoingReqRes.json();
//       renderList(outgoingList, outgoingReqData, (item) => {
//         const li = document.createElement("li");
//         li.className = "p-3 mb-2 bg-gray-800/60 backdrop-blur-sm border border-orange-500/30 rounded-lg text-orange-100";
//         li.textContent = item.senderUsername;
  
//         const cancelBtn = makeButton("Cancel", async () => {
//           await fetchWithAutoRefresh(`${baseURL}/friendships/${item.friendshipId}`, {
//             method: "DELETE",
//             credentials: "include",
//           });
//           loadFriendData();
//         });
  
//         li.appendChild(cancelBtn);
//         return li;
//       });
//     }
  
//     // Friends List
//     const friendListRes = await fetchWithAutoRefresh(`${baseURL}/friendships`, {
//       credentials: "include",
//     });
//     if (friendListRes.ok) {
//       const friendListData: FriendData[] = await friendListRes.json();
//       renderList(friendsList, friendListData, (item) => {
//         const li = document.createElement("li");
//         li.className = "p-3 mb-2 bg-gray-800/60 backdrop-blur-sm border border-green-500/30 rounded-lg text-green-100 flex items-center justify-between";
        
//         const nameSpan = document.createElement("span");
//         nameSpan.textContent = item.username;
//         li.appendChild(nameSpan);
  
//         const removeBtn = makeButton("Remove", async () => {
//           await fetchWithAutoRefresh(`${baseURL}/friendships/${item.friendshipId}`, {
//             method: "DELETE",
//             credentials: "include",
//           });
//           loadFriendData();
//         });
  
//         li.appendChild(removeBtn);
//         return li;
//       });
//     }
//   }
  
//   // Event Listeners
//   userSearchInput.addEventListener("input", async () => {
//     const query = userSearchInput.value.trim();
  
//     if (!query) {
//       userSearchResults.style.display = "none";
//       return;
//     }
  
//     const page = 1;
//     const limit = 5;
  
//     const res = await fetchWithAutoRefresh(
//       `${baseURL}/users?search=${query}&page=${page}&limit=${limit}`,
//       { credentials: "include" }
//     );
  
//     if (res.ok) {
//       const data: UserSearchResult[] = await res.json();
//       renderSearchResults(data);
//     } else {
//       userSearchResults.style.display = "none";
//     }
//   });
  
//   if (logoutBtn) {
//     logoutBtn.addEventListener("click", async () => {
//       if (!deviceId) return alert("Missing deviceId");
//       const res = await fetchWithAutoRefresh(`${baseURL}/auth/logout`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         credentials: "include",
//         body: JSON.stringify({ deviceId }),
//       });
//       if (res.ok) {
//         window.location.href = "index.html";
//       } else {
//         alert("Logout failed ❌");
//       }
//     });
//   }
  
//   if (showUserBtn) {
//     showUserBtn.addEventListener("click", async () => {
//       const res = await fetchWithAutoRefresh(`${baseURL}/users/showUser`);
//       if (res.ok) {
//         const json = await res.json();
//         alert(`User Info:\n${JSON.stringify(json, null, 2)}`);
//       } else {
//         alert("Failed to fetch user");
//       }
//     });
//   }
  
//   // Authentication check function
//   async function checkAuthentication(): Promise<boolean> {
//     const res = await fetchWithAutoRefresh(`${baseURL}/users/showUser`);
//     return res.ok;
//   }
  
//   // Initialize app
//   checkAuthentication().then((isAuthenticated) => {
//     if (!isAuthenticated) {
//       window.location.href = "index.html";
//       return;
//     }
  
//     document.body.style.visibility = "visible";
//     document.body.style.opacity = "1";
  
//     initializeNotificationCounter();
//     initializeMailboxNotificationCounter();
//     loadFriendData();
//   });