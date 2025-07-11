// Socket Debugging Utility
import app from './app';

export function setupSocketDebugging(): void {
    if (!app.socketService) {
        console.log('Socket Debugging: Socket service not available');
        return;
    }
    
    // Log all socket events
    const originalOn = app.socketService.on;
    app.socketService.on = function(event: string, callback: any) {
        const wrappedCallback = function(this: any, data: any) {
            console.log(`Socket Event Received [${event}]:`, data);
            return callback.apply(this, arguments);
        };
        return originalOn.call(this, event, wrappedCallback);
    };
    
    // Log socket connection states
    app.socketService.on('connect', () => {
        console.log(`Socket Debug: Connected with ID ${app.socketService.id}`);
    });
    
    app.socketService.on('disconnect', (reason: string) => {
        console.log(`Socket Debug: Disconnected, reason: ${reason}`);
    });
    
    app.socketService.on('reconnect', (attemptNumber: number) => {
        console.log(`Socket Debug: Reconnected after ${attemptNumber} attempts`);
    });
    
    app.socketService.on('reconnect_attempt', (attemptNumber: number) => {
        console.log(`Socket Debug: Reconnect attempt ${attemptNumber}`);
    });
    
    app.socketService.on('reconnect_error', (error: any) => {
        console.log(`Socket Debug: Reconnect error: ${error}`);
    });
    
    app.socketService.on('reconnect_failed', () => {
        console.log('Socket Debug: Reconnect failed');
    });
    
    app.socketService.on('error', (error: any) => {
        console.log(`Socket Debug: Error: ${error}`);
    });
    
    app.socketService.on('connect_error', (error: any) => {
        console.log(`Socket Debug: Connect error: ${error}`);
    });
    
    console.log('Socket Debugging: Initialized');
}

export default { setupSocketDebugging };
