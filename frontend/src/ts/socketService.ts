import { baseURL } from './constants';

declare const io: any;

export class SocketService {
    private socket: any = null;
    private isInitialized: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private eventHandlers: Map<string, Function[]> = new Map();

    constructor() {
        // Don't initialize socket in constructor
        // Wait for explicit initialization
    }

    /**
     * Initialize socket connection
     */
    initialize(): void {
        if (this.isInitialized || !this.isSocketIOAvailable()) {
            return;
        }

        try {
            this.socket = io(baseURL, {
                withCredentials: true,
                autoConnect: true,
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
            });

            this.setupBaseHandlers();
            this.isInitialized = true;
            
            console.log('Socket service initialized');
        } catch (error) {
            console.error('Failed to initialize socket:', error);
        }
    }

    /**
     * Check if Socket.IO is available
     */
    private isSocketIOAvailable(): boolean {
        return typeof io !== 'undefined';
    }

    /**
     * Setup base socket event handlers
     */
    private setupBaseHandlers(): void {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket.id);
            this.reconnectAttempts = 0;
            
            // Dispatch custom event for other modules
            document.dispatchEvent(new CustomEvent('socketConnected', {
                detail: { socketId: this.socket.id }
            }));
        });

        this.socket.on('disconnect', (reason: string) => {
            console.log('Socket disconnected:', reason);
            
            // Dispatch custom event
            document.dispatchEvent(new CustomEvent('socketDisconnected', {
                detail: { reason }
            }));
        });

        this.socket.on('connect_error', (error: any) => {
            console.error('Socket connection error:', error);
            this.reconnectAttempts++;
            
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('Max reconnection attempts reached');
                // Dispatch custom event
                document.dispatchEvent(new CustomEvent('socketConnectionFailed', {
                    detail: { error, attempts: this.reconnectAttempts }
                }));
            }
        });

        this.socket.on('reconnect', (attemptNumber: number) => {
            console.log('Socket reconnected after', attemptNumber, 'attempts');
            
            // Dispatch custom event
            document.dispatchEvent(new CustomEvent('socketReconnected', {
                detail: { attempts: attemptNumber }
            }));
        });
    }

    /**
     * Add event listener
     */
    on(event: string, handler: Function): void {
        if (!this.socket) {
            console.warn('Socket not initialized. Call initialize() first.');
            return;
        }

        this.socket.on(event, handler);
        
        // Keep track of handlers for cleanup
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)!.push(handler);
    }

    /**
     * Remove event listener
     */
    off(event: string, handler?: Function): void {
        if (!this.socket) return;

        if (handler) {
            this.socket.off(event, handler);
            
            // Remove from our tracking
            if (this.eventHandlers.has(event)) {
                const handlers = this.eventHandlers.get(event)!;
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
        } else {
            this.socket.off(event);
            this.eventHandlers.delete(event);
        }
    }

    /**
     * Emit event
     */
    emit(event: string, data?: any): void {
        if (!this.socket) {
            console.warn('Socket not initialized. Cannot emit event:', event);
            return;
        }

        this.socket.emit(event, data);
    }

    /**
     * Check if socket is connected
     */
    isConnected(): boolean {
        return this.socket?.connected || false;
    }

    /**
     * Get socket ID
     */
    getSocketId(): string | null {
        return this.socket?.id || null;
    }

    /**
     * Manually connect socket
     */
    connect(): void {
        if (this.socket && !this.socket.connected) {
            this.socket.connect();
        }
    }

    /**
     * Manually disconnect socket
     */
    disconnect(): void {
        if (this.socket && this.socket.connected) {
            this.socket.disconnect();
        }
    }

    /**
     * Clean up and destroy socket
     */
    destroy(): void {
        if (this.socket) {
            // Remove all tracked event handlers
            this.eventHandlers.forEach((handlers, event) => {
                handlers.forEach(handler => {
                    this.socket.off(event, handler);
                });
            });
            this.eventHandlers.clear();

            // Disconnect and clean up
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.isInitialized = false;
        console.log('Socket service destroyed');
    }

    /**
     * Get socket instance (for advanced usage)
     */
    getSocket(): any {
        return this.socket;
    }
}

// Create singleton instance
const socketService = new SocketService();

// Make it globally accessible
declare global {
    interface Window {
        socketService: SocketService;
        chatSocket: any; // For backward compatibility
    }
}

export default socketService;