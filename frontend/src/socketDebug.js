// // Socket debugging utilities
// (function() {
//     const debugBtn = document.createElement('button');
//     debugBtn.textContent = 'Debug Sockets';
//     debugBtn.style.cssText = `
//         position: fixed;
//         bottom: 10px;
//         right: 10px;
//         z-index: 9999;
//         background: #ff5722;
//         color: white;
//         border: none;
//         padding: 8px 15px;
//         border-radius: 4px;
//         cursor: pointer;
//         font-weight: bold;
//         box-shadow: 0 2px 5px rgba(0,0,0,0.3);
//     `;
    
//     debugBtn.addEventListener('click', () => {
//         const debugPanel = document.createElement('div');
//         debugPanel.style.cssText = `
//             position: fixed;
//             bottom: 50px;
//             right: 10px;
//             width: 300px;
//             background: #333;
//             color: white;
//             border-radius: 4px;
//             padding: 15px;
//             z-index: 9999;
//             box-shadow: 0 5px 15px rgba(0,0,0,0.5);
//             font-family: monospace;
//             font-size: 12px;
//         `;
        
//         // Create debug actions
//         const actions = [
//             { name: 'Toggle NotificationManager Debug', fn: () => window.notificationManager.toggleDebugMode() },
//             { name: 'Reinit Socket Handlers', fn: () => window.notificationManager.reinitializeSocketHandlers() },
//             { name: 'Check Socket Connection', fn: () => {
//                 const isConnected = window.app.socketService && window.app.socketService.connected;
//                 alert(`Socket status: ${isConnected ? 'Connected' : 'Disconnected'}\nSocket ID: ${window.app.socketService?.id || 'N/A'}`);
//             }},
//             { name: 'Force Emit Test Event', fn: () => {
//                 if (window.app.socketService) {
//                     window.app.socketService.emit('echoTest', { time: new Date().toISOString() });
//                     console.log('Test event emitted');
//                     alert('Test event emitted, check console for response');
//                 } else {
//                     alert('Socket service not available');
//                 }
//             }},
//             { name: 'Close', fn: () => document.body.removeChild(debugPanel) }
//         ];
        
//         actions.forEach(action => {
//             const btn = document.createElement('button');
//             btn.textContent = action.name;
//             btn.style.cssText = `
//                 display: block;
//                 width: 100%;
//                 padding: 8px;
//                 margin-bottom: 8px;
//                 background: #444;
//                 border: none;
//                 color: white;
//                 border-radius: 3px;
//                 cursor: pointer;
//                 text-align: left;
//             `;
//             btn.addEventListener('click', action.fn);
//             debugPanel.appendChild(btn);
//         });
        
//         document.body.appendChild(debugPanel);
//     });
    
//     // Add button when page loads
//     window.addEventListener('DOMContentLoaded', () => {
//         document.body.appendChild(debugBtn);
//     });
    
//     // Or add immediately if page already loaded
//     if (document.readyState === 'complete' || document.readyState === 'interactive') {
//         document.body.appendChild(debugBtn);
//     }
// })();
