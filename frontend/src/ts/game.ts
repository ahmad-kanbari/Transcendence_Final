/**
 * Pong Game Implementation
 * A class-based implementation of the classic Pong game with multiple game modes
 */

import api from "./api";
import app from "./app";
import { t } from "./localization";
import toastManager from "./toastManager";
import utils from "./utils";

class PongGame {
 
    // Game state
    userName: string | null = null;
    userId: number | null = null;
    gameRunning: boolean = false;
    gameOver: boolean = false;
    lastTime: number = 0;
    deltaTime: number = 0;
    initializationAttempts: number = 0;
    maxInitializationAttempts: number = 10;
    isInitialized: boolean = false;

    // Game elements
    gameArea: HTMLElement | null = null;
    ball: HTMLElement | null = null;
    paddle1: HTMLElement | null = null;
    paddle2: HTMLElement | null = null;
    paddle3: HTMLElement | null = null;
    paddle4: HTMLElement | null = null;
    player1Score: HTMLElement | null = null;
    player2Score: HTMLElement | null = null;
    player1Name: HTMLElement | null = null;
    player2Name: HTMLElement | null = null;
    player1NameInput: HTMLInputElement | null = null;
    player2NameInput: HTMLInputElement | null = null;
    // Game mode flags
    isAIMode: boolean = false;
    isMultiplayerMode: boolean = false;
    isTournamentMode: boolean = false;

    // Tournament variables
    tournamentPlayers: string[] = [];
    currentTournamentMatch: number = 0;
    tournamentWinners: string[] = [];

    // Game settings
    winScore: number = 3;
    initialBallSpeedX: number = 3;
    initialBallSpeedY: number = 3;
    ballSpeedX: number = this.initialBallSpeedX;
    ballSpeedY: number = this.initialBallSpeedY;
    ballSpeedMultiplier: number = 1.05;
    aiDifficulty: string = 'medium';
    paddleSizeClass: string = 'normal';

    // Paddle positions and sizes
    paddle1Y: number = 0;
    paddle2Y: number = 0;
    paddle3Y: number = 0;
    paddle4Y: number = 0;
    paddleHeight: number = 0;
    paddleWidth: number = 0;
    gameWidth: number = 0;
    gameHeight: number = 0;

    // Paddle movement
    paddle1Speed: number = 0;
    paddle2Speed: number = 0;
    paddle3Speed: number = 0;
    paddle4Speed: number = 0;
    paddleMaxSpeed: number = 7;
    aiReactionDelay: number = 1000; // AI reaction delay in milliseconds
    aiPredictionAccuracy: number = 0.8;
    aiRandomOffset: number = 20;

    // Active paddles for multiplayer mode
    paddle1Active: boolean = true;
    paddle2Active: boolean = true;
    paddle3Active: boolean = true;
    paddle4Active: boolean = true;

      // Object to track pressed keys
    keysPressed: Record<string, boolean> = {};

    // Sound effects
    paddleSound: HTMLAudioElement | null = null;
    wallSound: HTMLAudioElement | null = null;
    lossSound: HTMLAudioElement | null = null;
    
    // Animation frame ID for canceling
    animationFrameId: number | null = null;

    // Function to submit match data
    submitMatch: Function | null = null;

    // Function to submit tournament data
    submitTournament: Function | null = null;
    aliasUsernamePlayer1: string | null = null;

       // Prepare match data for backend submission
    matchObj: {
    // Match data structure
    matchId: number | null;
    player1_id: number;
    player2_id: number | null;
    player1_name: string;
    player2_name: string;
    player1_score: number;
    player2_score: number;
    winner: string;
    match_type: string;
    tournamentId?: number | null;
    team_1_score?: number;
    team_2_score?: number;


   

    } = {
        matchId: null,
        player1_id: 0,
        player2_id: null,
        player1_name: '',
        player2_name: '',
        player1_score: 0,
        player2_score: 0,
        winner: '',
        match_type: '',
        tournamentId: null
    };

      // Array of matches for tournament mode
    tournamentArr: typeof this.matchObj[] = [];
    tournamentMatchId: number | null = null;
    // Add new properties for better collision detection
    ballLastX: number = 0;
    ballLastY: number = 0;
    collisionProcessedThisFrame: boolean = false;
    lastPaddleHit: Record<string, string> = {
        leftSide: 'paddle1',
        rightSide: 'paddle2'
    };

        // Add physics constants
    paddleAcceleration: number = 0.5;
    paddleDeceleration: number = 0.3;
    maxPaddleSpeed: number = 5;
    speedIncreaseFactor: number = 1.05;
    maxSpeed: number = 10;

      // Add scaling factors for consistent movement
    scaleX: number = 1;
    scaleY: number = 1;

        // AI-related variables
    lastAIUpdateTime: number | null = null;
    aiTargetY: number | undefined = undefined;
    aiPredictedY: number | undefined = undefined;
    aiTargetOffset: number = 0;

        // Add AI perception variables
    aiPerceptionBallX: number = 0;
    aiPerceptionBallY: number = 0;
    aiPerceptionBallSpeedX: number = 0;
    aiPerceptionBallSpeedY: number = 0;

        // AI simulated key state
    aiKeyState: Record<string, boolean> = {
        'ArrowUp': false,
        'ArrowDown': false
    };

        // AI behavior parameters
    aiMistakeChance: number = 0.15;
    aiErrorMargin: number = 0.15;
    aiReturnToMiddleSpeed: number = 0.3;
    aiCenteringProbability: number = 0.6;
    shouldReturnToCenter: boolean = false;

    // Track current screen mode: 'menu', '1v1', '1vAi', 'multiplayer', 'tournament'
    currentMode: string = 'menu';
    tournamentId: number | null | undefined;
    isSettingUpNextMatch: boolean = false; // Flag to prevent multiple setups
    isCreatingTournament: boolean = false; // Flag to prevent multiple tournament creation

    /**
     * Initialize the game when the document is ready
     */
    init(userName: string, submitMatchFn: Function, submitTournamentFn: Function): void {
          // store callbacks for submitting results
        let usernameFromLocalStorage = localStorage.getItem('user') || null ;
        console.log('Username from localStorage:', usernameFromLocalStorage);
        if (usernameFromLocalStorage != null) {
            try {
                const userObj = JSON.parse(usernameFromLocalStorage);
                console.log('Parsed user object:', userObj);
                this.userName = userObj['user']?.['username'] ?? app.getUsername(); null;
                // console.log('User name set to:', this.userName);
                // this.userName = app.getUsername();
                const userId = userObj.user?.id || userObj.id;
                // console.log()
                this.userId = Number(userId) ??  null;
                console.log('int the game User ID set to:', this.userId);
            } catch (e) {
                console.error('Failed to parse user from localStorage:', e);
                this.userName = null;
            }
        }
        // console.log('Game page initialized with user:', this.userName);
        this.submitMatch = submitMatchFn;
        this.submitTournament = submitTournamentFn;
        this.waitForGameElements();
                
        // Get game elements
        this.gameArea = document.querySelector('.gameArea');
        this.ball = document.getElementById('ball');
        this.paddle1 = document.getElementById('paddle1');
        this.paddle2 = document.getElementById('paddle2');
        this.paddle3 = document.getElementById('paddle3');
        this.paddle4 = document.getElementById('paddle4');
        this.player1Score = document.getElementById('player1Score');
        this.player2Score = document.getElementById('player2Score');
        this.player1Name = document.getElementById('player1Name');
        this.player2Name = document.getElementById('player2Name');
        const player1NameInput = document.getElementById('player1NameInput') as HTMLInputElement;
        const player2NameInput = document.getElementById('player2NameInput') as HTMLInputElement;
             
        // Load sound effects
        this.paddleSound = document.getElementById('paddleSound') as HTMLAudioElement;
        this.wallSound = document.getElementById('wallSound') as HTMLAudioElement;
        this.lossSound = document.getElementById('lossSound') as HTMLAudioElement;

         // I add code to hide and pause the video background by default
        const videoBgInit = document.getElementById('videoBackground');
        if (videoBgInit) {
            videoBgInit.style.display = 'none';
            videoBgInit.style.zIndex = '1';
            if ('pause' in videoBgInit) {
                (videoBgInit as HTMLVideoElement).pause();
                (videoBgInit as HTMLVideoElement).currentTime = 0;
            }
  
            // Prepare the overlay for future video use
            const overlay = videoBgInit.querySelector('.video-overlay');
            if (overlay) {
                (overlay as HTMLElement).style.background = 'rgba(0, 0, 0, 1)';
            }
        }

        // Prevent spaces in player name inputs
        const playerNameInputs = [
            'player1NameInput', 'player2NameInput', 
            'tournament-p1', 'tournament-p2', 'tournament-p3', 'tournament-p4'
        ];

        playerNameInputs.forEach(id => {
            const input = document.getElementById(id) as HTMLInputElement;
            if (input) {
                input.addEventListener('keydown', (event) => utils.preventSpaces(event));
            }
        });

        // Initialize game dimensions
        this.updateGameDimensions();
        // Set up event listeners        
        this.setupEventListeners();

         // Initialize positions       
        this.initializePositions();
        // Set initial paddle sizes
        this.updatePaddleSizes();

        // Set initial player names  
        this.updatePlayerNames();

         // Check window size   
        this.checkWindowSize();

        this.resetGame();
    }
    /**
     * Set up event listeners for menu buttons and game controls
     */
    setupEventListeners(): void {
        // Bind event handlers to this instance
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.gameLoop = this.gameLoop.bind(this);
        
        // Initialize keyboard event listeners
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        
        // Check window size on resize
        window.addEventListener('resize', () => {
            this.updateGameDimensions();
            this.checkWindowSize();
            // Reset positions to keep everything in bounds
            if (!this.gameRunning) {
                this.initializePositions();
            }
        });
                // Add observer for game area changes (useful for SPA)
        if (this.gameArea && 'ResizeObserver' in window) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    // console.log('Game area resized');
                    this.updateGameDimensions();
                    if (!this.gameRunning) {
                        this.initializePositions();
                    }
                }
            });
            resizeObserver.observe(this.gameArea);
        }
        // Game mode buttons
        const pvpButton = document.getElementById('pvpButton');
        if (pvpButton) {
            pvpButton.addEventListener('click', () => {
                // On 1 VS 1, set Player 1's name to current user and Player 2's name to RANDOM
            
                // this.player1Name!.textContent =   this.player1NameInput!.value  ||  this.userName;
                // this.player2Name!.textContent = this.matchObj.player2_name || 'RANDOM';
                this.updatePlayerNames();
                this.setGameMode('1v1');
            });
        } else {
            console.error('pvpButton not found in DOM');
        }
        
        const pveButton = document.getElementById('pveButton');
        if (pveButton) {
            pveButton.addEventListener('click', () => {
                // On 1 VS AI, set Player 1's name to current user and Player 2's name to AI
                // this.player1Name!.textContent = this.player1NameInput!.value || this.userName;
                 this.updatePlayerNames();
                this.player2Name!.textContent = 'AI';
                this.setGameMode('1vAi');
            });
        } else {
            console.error('pveButton not found in DOM');
        }
        
        const multiplayerButton = document.getElementById('multiplayerButton');
        if (multiplayerButton) {
            multiplayerButton.addEventListener('click', () => {
                this.player1Name!.textContent = `${this.aliasUsernamePlayer1 || this.userName}_team `;
                this.player2Name!.textContent = this.matchObj.player2_name ?? 'Opp_team';
                this.setGameMode('multiplayer');
            });
        } else {
            console.error('multiplayerButton not found in DOM');
        }
        
        const tournamentButton = document.getElementById('tournamentButton');
        if (tournamentButton) {
            tournamentButton.addEventListener('click', () => {
                this.setGameMode('tournament');
            });
        } else {
            console.error('tournamentButton not found in DOM');
        }
        
        // Settings and How to Play buttons
        document.getElementById('settingsButton')!.addEventListener('click', () => {
            // Show team name inputs only in multiplayer mode
            document.querySelectorAll('.setting-team').forEach(el => {
                (el as HTMLElement).style.display = this.isMultiplayerMode ? 'flex' : 'none';
            });
            // Clear active state from all bottom buttons
            const bottomButtons = document.querySelectorAll('.bottom-buttons .game-btn');
            bottomButtons.forEach(btn => btn.classList.remove('active'));

            // Set active state for the settings button
            document.getElementById('settingsButton')!.classList.add('active');

            this.hideGameButtons();
            document.getElementById('settingsScreen')!.style.display = 'block';
        });
        
        document.getElementById('howToPlayButton')!.addEventListener('click', () => {
            // Clear active state from all bottom buttons
            const bottomButtons = document.querySelectorAll('.bottom-buttons .game-btn');
            bottomButtons.forEach(btn => btn.classList.remove('active'));
            
            // Set active state for the how to play button
            document.getElementById('howToPlayButton')!.classList.add('active');
            
            this.hideGameButtons();
            document.getElementById('howToPlayScreen')!.style.display = 'block';
        });
        
        // Save settings button
        document.getElementById('saveSettingsButton')!.addEventListener('click', () => {
            this.applySettings();
            document.getElementById('settingsScreen')!.style.display = 'none';
            this.showGameButtons();

               console.log('Resetting player names to defaults alist player name', this.aliasUsernamePlayer1);
                this.player1Name!.textContent =  this.aliasUsernamePlayer1 || this.userName || 'PLAYER_1';
                this.player2Name!.textContent =  this.matchObj.player2_name || 'PLAYER_2';
                
        });
        
        // Back buttons
        document.getElementById('backButton')!.addEventListener('click', () => this.backToMenu());
        document.getElementById('backFromHowToPlayButton')!.addEventListener('click', () => this.backToMenu());
        document.getElementById('backFromTournamentButton')!.addEventListener('click', () => this.backToMenu());
        
        // Tournament buttons
        document.getElementById('startTournamentButton')!.addEventListener('click', (e) => {
            if (this.isCreatingTournament) return; // Prevent multiple clicks
            this.startTournament();
        });
        
        // Game over buttons
        document.getElementById('menuButton')!.addEventListener('click', () => {
            this.resetGame();
            this.backToMenu();
        });
        
        
        document.getElementById('nextMatchButton')!.addEventListener('click', () => {
            if (this.isSettingUpNextMatch) return;
            
            document.getElementById('winScreen')!.style.display = 'none';
            // console.log("Next match button clicked, current tournament match before incrementing:", this.currentTournamentMatch);
            this.setupNextTournamentMatch();
            this.isSettingUpNextMatch = true;
        },);
    }

        /**
     * Hide the game buttons when starting a game
     */
    hideGameButtons(): void {
        (document.querySelector('.top-buttons')! as HTMLElement).style.display = 'none';
        (document.querySelector('.bottom-buttons')! as HTMLElement).style.display = 'none';
    }

    /**
     * Show the game buttons when returning to menu
     */
    showGameButtons(): void {
        (document.querySelector('.top-buttons')! as HTMLElement).style.display = 'flex';
        (document.querySelector('.bottom-buttons')! as HTMLElement).style.display = 'flex';
        
        // Also handle bottom buttons active state
        const bottomButtons = document.querySelectorAll('.bottom-buttons .game-btn');
        bottomButtons.forEach(btn => btn.classList.remove('active'));
    }

    /**
     * Handle key down events for paddle movement
     */
    handleKeyDown(e: KeyboardEvent): void {
         // Always handle Escape to return to menu
         if (e.key === 'Escape') {
            this.resetGame();
            this.backToMenu();
            return;
        }
        // Ignore other keys when in menu
        if (this.currentMode === 'menu') return;
        this.keysPressed[e.key] = true;
        
        // Only start the game when startText is visible and menu hidden
        const startText = document.getElementById('startText');
        const topButtons = document.querySelector('.top-buttons');
        if (
            startText && startText.style.display === 'block' &&
            topButtons && (topButtons as HTMLElement).style.display === 'none' &&
            !this.gameRunning && !this.gameOver
        ) {
            this.startGame();
        }
    }

    /**
     * Handle key up events for paddle movement
     */
    handleKeyUp(e: KeyboardEvent): void {
        if (this.currentMode === 'menu') return;
        this.keysPressed[e.key] = false;
    }

    /**
     * Update game dimensions based on current window size
     */
    updateGameDimensions(): void {
          if (!this.gameArea) {
            console.warn('GameArea not available for dimension update');
            return;
        }
               // Force a reflow to ensure accurate measurements
        this.gameArea.offsetHeight;
        // Get dimensions from the computed style
     // Get dimensions from the computed style
        const gameAreaStyle = window.getComputedStyle(this.gameArea);
        const width = parseFloat(gameAreaStyle.width);
        const height = parseFloat(gameAreaStyle.height)
              // Validate dimensions
        if (width <= 0 || height <= 0) {
            console.warn('Invalid game area dimensions:', { width, height });
            // Try again after a short delay
            setTimeout(() => this.updateGameDimensions(), 50);
            return;
        }
          this.gameWidth = width;
        this.gameHeight = height;
        //  console.log('Game dimensions updated:', { width: this.gameWidth, height: this.gameHeight });
        // console.log('Game dimensions updated:', { width: this.gameWidth, height: this.gameHeight });
        // Update paddle dimensions
        this.paddleHeight = this.gameHeight * 0.15; // 15% of game height
        this.paddleWidth = this.gameWidth * 0.01;   // 1% of game width
        
        // Update net position
        const net : HTMLElement | null = document.querySelector('.net');
        if (net) {
            net.style.height = `${this.gameHeight}px`;
            net.style.width = '2px';
            net.style.left = `${this.gameWidth / 2}px`;
            net.style.position = 'absolute';
            net.style.background = 'rgba(255, 215, 0, 0.5)';
        }
        
        // Calculate scaling factors for consistent movement
        this.scaleX = this.gameWidth / 800; // Base width of 800px
        this.scaleY = this.gameHeight / 600; // Base height of 600px
        
        // Set ball size based on game area (responsive)
        const ballSize = Math.max(Math.round(0.02 * Math.min(this.gameWidth, this.gameHeight)), 8);
        this.ball!.style.width = `${ballSize}px`;
        this.ball!.style.height = `${ballSize}px`;
        
        // Store previous position for smooth collision detection
        this.ballLastX = parseFloat(this.ball!.style.left);
        this.ballLastY = parseFloat(this.ball!.style.top);
    }

    /**
     * Initialize positions of paddles and ball
     */
    initializePositions(): void {
        if (!this.gameArea || !this.ball || !this.paddle1 || !this.paddle2) return;
        
        // Position paddles at the center of their respective sides
        this.paddle1Y = this.gameHeight / 2 - this.paddleHeight / 2;
        this.paddle2Y = this.gameHeight / 2 - this.paddleHeight / 2;
        this.paddle3Y = this.gameHeight / 2 - this.paddleHeight / 2;
        this.paddle4Y = this.gameHeight / 2 - this.paddleHeight / 2;
        
        // Update paddle positions in DOM
        this.paddle1.style.height = `${this.paddleHeight}px`;
        this.paddle1.style.width = `${this.paddleWidth}px`;
        this.paddle1.style.top = `${this.paddle1Y}px`;
        
        this.paddle2.style.height = `${this.paddleHeight}px`;
        this.paddle2.style.width = `${this.paddleWidth}px`;
        this.paddle2.style.top = `${this.paddle2Y}px`;
        
        this.paddle3!.style.height = `${this.paddleHeight}px`;
        this.paddle3!.style.width = `${this.paddleWidth}px`;
        this.paddle3!.style.top = `${this.paddle3Y}px`;
        
        this.paddle4!.style.height = `${this.paddleHeight}px`;
        this.paddle4!.style.width = `${this.paddleWidth}px`;
        this.paddle4!.style.top = `${this.paddle4Y}px`;
        
        // Position ball in the center
        this.ball.style.left = `${this.gameWidth / 2 - parseFloat(this.ball.style.width) / 2}px`;
        this.ball.style.top = `${this.gameHeight / 2 - parseFloat(this.ball.style.height) / 2}px`;
    }

        /**
     * Check if window is too small and show warning
     */
    checkWindowSize(): void {
        const minWidth = 480;
        const minHeight = 320;
        
        if (this.gameWidth < minWidth || this.gameHeight < minHeight) {
            document.getElementById('sizeWarningScreen')!.style.display = 'block';
        } else {
            document.getElementById('sizeWarningScreen')!.style.display = 'none';
        }
    }


    /**
     * Go back to the main menu
     */
    backToMenu() : void {
        // Hide all screens
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            (screen as HTMLElement).style.display = 'none';
        });
        
        // Show game buttons
        this.showGameButtons();
        
        // Reset to menu mode
        this.currentMode = 'menu';
        
        // Hide start prompt
        const startText = document.getElementById('startText');
        if (startText) startText.style.display = 'none';
        
        // Reset player names to defaults when returning to menu
        // console.log('Resetting player names to defaults alist player name', this.aliasUsernamePlayer1);
        this.player1Name!.textContent =  this.aliasUsernamePlayer1 || this.userName || 'PLAYER_1';
        this.player2Name!.textContent =  this.matchObj.player2_name || 'PLAYER_2'
        
        // Reset game state if needed
        this.gameRunning = false;
        this.gameOver = false;
        
        // Reset tournament flags
        this.isCreatingTournament = false;
        this.isSettingUpNextMatch = false;
    }


    /**
     * Set the game mode and initialize accordingly
     */
    setGameMode(mode: string): void {
        // Enter game mode
        this.currentMode = mode;
        this.isAIMode = false;
        this.isMultiplayerMode = false;
        this.isTournamentMode = false;
        
        // Remove active class from all mode buttons
        const modeButtons = document.querySelectorAll('.top-buttons .game-btn');
        modeButtons.forEach(btn => btn.classList.remove('active'));
        
        // const player1NameInput = document.getElementById('player1NameInput');
        if (this.player1NameInput) {
            (this.player1NameInput as HTMLInputElement).value = this.userName || 'PLAYER_1';
            (this.player1NameInput as HTMLInputElement).readOnly = false;
        }

        // Add active class to the clicked button
        let activeButton : HTMLElement | null = null;
        
        switch (mode) {
            case '1v1':
                // Player vs Player mode
                activeButton = document.getElementById('pvpButton');
                break;
                
            case '1vAi':
                // Player vs AI mode
                this.isAIMode = true;
                activeButton = document.getElementById('pveButton');
                break;
                
            case 'multiplayer':
                // 4 player mode
                this.isMultiplayerMode = true;
                activeButton = document.getElementById('multiplayerButton');
                // Determine team names: respect settings overrides or use defaults
                // const team2InputEl = document.getElementById('team2NameInput');
                const team2Name =  `${this.matchObj.player2_name}_team` || 'Opp_team';
                if (this.player2Name) {
                    this.player2Name.textContent = team2Name;
                }
                break;
                
            case 'tournament':
                // Tournament mode
                this.isTournamentMode = true;
                activeButton = document.getElementById('tournamentButton');
                // Show tournament setup
                document.getElementById('tournamentScreen')!.style.display = 'block';
                this.hideGameButtons();
                // Auto-fill and lock Player 1 input to current user
                const p1Input = document.getElementById('tournament-p1');
                if (p1Input) {
                    (p1Input as HTMLInputElement).value = this.userName ?? 'PLAYER_1';
                    (p1Input as HTMLInputElement).readOnly = false;
                }
                return; // Don't start game yet, wait for tournament setup
        }
        
        // Add active class to the selected button
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        // For non-tournament modes, start the game directly
        this.hideGameButtons();
        this.resetGame();
        document.getElementById('startText')!.style.display = 'block';
    }

    /**
     * Reset the game state
     */
    resetGame() : void {
        // Reset scores
        this.player1Score!.textContent = '0';
        this.player2Score!.textContent = '0';
        
        // Reset ball speed
        this.ballSpeedX = this.initialBallSpeedX;
        this.ballSpeedY = this.initialBallSpeedY;
        
        // Reset positions
        this.initializePositions();
        this.resetBall();
        this.resetPaddlePositions();
        
        // Reset paddle activity for multiplayer mode
        this.paddle1Active = true;
        this.paddle2Active = true;
        this.paddle3Active = true;
        this.paddle4Active = true;
        
        // Reset paddle visuals
        this.resetPaddleVisuals();
        
        // Update paddle visibility based on game mode
        this.updatePaddleVisibility();
        
        // Cancel any existing animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Reset game state
        this.gameRunning = false;
        this.gameOver = false;

      

    }

    /**
     * Start the game
     */
  /**
 * Start the game
 */
async startGame(): Promise<void> {
    // Hide the start text
    document.getElementById('startText')!.style.display = 'none';
    
    // Start the game loop
    this.gameRunning = true;
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
    
    const storedUser = localStorage.getItem('user');
    const userData = JSON.parse(storedUser ?? '{}');
    
    // console.log("userData in game before creating match:", userData);
    // console.log("Player 2", this.player2Name!.textContent);
    // Initialize base match object
    this.matchObj = {
        matchId: null,
        player1_id: Number(userData.user?.id) || this.userId || 0,
        player2_id: null,
        player1_name: userData.user?.username || this.player1Name!.textContent || 'PLAYER_1',
        player2_name: this.player2Name!.textContent || 'PLAYER_2',
        player1_score: 0,
        player2_score: 0,
        winner: '',
        match_type: this.isMultiplayerMode ? 'multiplayer' : (this.isAIMode ? '1vAi' : (this.isTournamentMode ? 'tournament' : '1v1')),
        tournamentId: this.isTournamentMode ? this.tournamentId || null : null,
    };

    // Submit single match if not in tournament
    if (!this.isTournamentMode && !this.isMultiplayerMode) {
        if (this.matchObj ) {
            // console.log("Submitting match data to backend:", this.matchObj);
            const response = await api.createMatch(this.matchObj);
            // console.log("Match created successfully:", response);
            if (response.success) {
                this.matchObj.matchId = response.data.id;
                // console.log("Match created successfully: with ID", this.matchObj.matchId);
            }else{
                console.error("Error creating match:", response.message);
            }
        }

    }
    if (this.isMultiplayerMode){

        const multiplayerMatchData = this.createMultiplayerMatchData(
            this.matchObj.player1_id,
            this.matchObj.player1_name,
            this.player1Name!.textContent || 'Team_A',          
            this.player2Name!.textContent || 'Team_B',
            ['Player_2', 'Player_3', 'Player_4']
        );
        // console.log("Multiplayer mode detected, preparing match data for backend submission", multiplayerMatchData);
        const response = await api.createMultiplayerMatch({
          team1_name: this.matchObj.player1_name,
        team2_name:  this.matchObj.player2_name,
    players: [
      {
        name: this.matchObj.player1_name,
        user_id: this.matchObj.player1_id,
        team: 1 // Put authenticated user on team 1
      },
      {
        name: 'Player_2',
        user_id: null,
        team: 1 // Second player on team 1
      },
      {
        name: 'Player_3',
        user_id: null,
        team: 2 // First player on team 2
      },
      {
        name: 'Player_4',
        user_id: null,
        team: 2 // Second player on team 2
      }
    ],
    match_type: "multiplayer"
  }
        );
        // console.log("Multiplayer match data from the response:", response);
        if (response.success) {
        console.log("Multiplayer match created successfully:", response);
    }
     this.matchObj.matchId =response.data.match['id'] || null;
     console.log("Multiplayer match created successfully: with ID", this.matchObj.matchId);
}

}
    /**
 * Helper function to create multiplayer match data structure
 * Simplifies the process of creating the required data format
 */
createMultiplayerMatchData(
  authenticatedUserId: number,
  authenticatedUserName: string,
  team1Name: string = "Team A",
  team2Name: string = "Team B",
  localPlayerNames: string[] = ["Player 2", "Player 3", "Player 4"]
): {
  team1_name: string;
  team2_name: string;
  players: Array<{
    name: string;
    user_id: number | null;
    team: number;
  }>;
  match_type: "multiplayer";
} {
  // Validate input
  if (localPlayerNames.length !== 3) {
    throw new Error('Exactly 3 local player names are required');
  }

  return {
    team1_name: team1Name,
    team2_name: team2Name,
    players: [
      {
        name: authenticatedUserName,
        user_id: authenticatedUserId,
        team: 1 // Put authenticated user on team 1
      },
      {
        name: localPlayerNames[0],
        user_id: null,
        team: 1 // Second player on team 1
      },
      {
        name: localPlayerNames[1],
        user_id: null,
        team: 2 // First player on team 2
      },
      {
        name: localPlayerNames[2],
        user_id: null,
        team: 2 // Second player on team 2
      }
    ],
    match_type: "multiplayer"
  };
}
    /**
     * Reset the ball to the center
     */
    resetBall():  void{
        // Position ball in the center
        const ballSize = parseFloat(window.getComputedStyle(this.ball!).width);
        this.ball!.style.left = `${this.gameWidth / 2 - ballSize / 2}px`;
        this.ball!.style.top = `${this.gameHeight / 2 - ballSize / 2}px`;
        
        // Random direction for X (left or right)
        this.ballSpeedX = Math.random() > 0.5 ? this.initialBallSpeedX : -this.initialBallSpeedX;
        
        // Random direction for Y (up or down)
        this.ballSpeedY = (Math.random() > 0.5 ? 1 : -1) * this.initialBallSpeedY;
    }

    
    /**
     * Reset paddle positions to the center
     */
    resetPaddlePositions(): void {
        this.paddle1Y = this.gameHeight / 2 - this.paddleHeight / 2;
        this.paddle2Y = this.gameHeight / 2 - this.paddleHeight / 2;
        this.paddle3Y = this.gameHeight / 2 - this.paddleHeight / 2;
        this.paddle4Y = this.gameHeight / 2 - this.paddleHeight / 2;
        
        // Update paddle positions in DOM
        this.paddle1!.style.top = `${this.paddle1Y}px`;
        this.paddle2!.style.top = `${this.paddle2Y}px`;
        this.paddle3!.style.top = `${this.paddle3Y}px`;
        this.paddle4!.style.top = `${this.paddle4Y}px`;
    }

    /**
     * Reset paddle visuals (remove disabled class and reset opacity)
     */
    resetPaddleVisuals() : void {
        // Reset all paddles to full opacity
        this.paddle1!.style.opacity = '1';
        this.paddle2!.style.opacity = '1';
        this.paddle3!.style.opacity = '1';
        this.paddle4!.style.opacity = '1';
        
        // Remove disabled class from all paddles
        this.paddle1!.classList.remove('paddle-disabled');
        this.paddle2!.classList.remove('paddle-disabled');
        this.paddle3!.classList.remove('paddle-disabled');
        this.paddle4!.classList.remove('paddle-disabled');
        
        // Set opacity for disabled paddles in multiplayer mode
        if (this.isMultiplayerMode) {
            if (this.lastPaddleHit.leftSide === 'paddle1') {
                this.paddle1!.style.opacity = '0.3';
                this.paddle1!.classList.add('paddle-disabled');
            } else if (this.lastPaddleHit.leftSide === 'paddle3') {
                this.paddle3!.style.opacity = '0.3';
                this.paddle3!.classList.add('paddle-disabled');
            }
            
            if (this.lastPaddleHit.rightSide === 'paddle2') {
                this.paddle2!.style.opacity = '0.3';
                this.paddle2!.classList.add('paddle-disabled');
            } else if (this.lastPaddleHit.rightSide === 'paddle4') {
                this.paddle4!.style.opacity = '0.3';
                this.paddle4!.classList.add('paddle-disabled');
            }
        }
    }

    /**
     * Update paddle visibility based on game mode
     */
    updatePaddleVisibility() {
        // Always show paddle 1 and 2
        this.paddle1!.style.display = 'block';
        this.paddle2!.style.display = 'block';
        
        // Show paddle 3 and 4 only in multiplayer mode
        if (this.isMultiplayerMode) {
            this.paddle3!.style.display = 'block';
            this.paddle4!.style.display = 'block';
            
            // Position paddles for multiplayer mode
            // Left side: paddle1 in first quarter, paddle3 in last quarter
            this.paddle1!.style.left = '0px';
            this.paddle3!.style.left = '0px';
            this.paddle1!.style.top = `${this.gameHeight * 0.75 - this.paddleHeight / 2}px`;
            this.paddle3!.style.top = `${this.gameHeight * 0.25 - this.paddleHeight / 2}px`;
            
            // Right side: paddle2 in first quarter, paddle4 in last quarter
            this.paddle2!.style.right = '0px';
            this.paddle4!.style.right = '0px';
            this.paddle2!.style.top = `${this.gameHeight * 0.25 - this.paddleHeight / 2}px`;
            this.paddle4!.style.top = `${this.gameHeight * 0.75 - this.paddleHeight / 2}px`;
            
            // Update paddle positions
            this.paddle1Y = this.gameHeight * 0.75 - this.paddleHeight / 2;
            this.paddle2Y = this.gameHeight * 0.25 - this.paddleHeight / 2;
            this.paddle3Y = this.gameHeight * 0.25 - this.paddleHeight / 2;
            this.paddle4Y = this.gameHeight * 0.75 - this.paddleHeight / 2;
        } else {
            this.paddle3!.style.display = 'none';
            this.paddle4!.style.display = 'none';
            
            // Position paddles for single player mode
            this.paddle1!.style.left = '0px';
            this.paddle2!.style.right = '0px';
            this.paddle1!.style.top = `${this.paddle1Y}px`;
            this.paddle2!.style.top = `${this.paddle2Y}px`;
        }
    }

    /**
     * Main game loop
     */
    gameLoop(timestamp : number) : void {
        // Calculate delta time for smooth animation
        this.deltaTime = (timestamp - this.lastTime) / 1000; // in seconds
        this.lastTime = timestamp;
        
        // Cap delta time to prevent large jumps
        if (this.deltaTime > 0.1) this.deltaTime = 0.1;
        
        // If in AI mode, update AI decisions first before updating paddles
        if (this.isAIMode) {
            this.updateAIDecisions();
        }
        
        // Update paddle positions based on input
        this.updatePaddle1(this.deltaTime);
        
        // Update second paddle based on game mode
        this.updatePaddle2(this.deltaTime);
        
        // Update paddles 3 and 4 in multiplayer mode
        if (this.isMultiplayerMode) {
            this.updatePaddle3(this.deltaTime);
            this.updatePaddle4(this.deltaTime);
        }
        
        // Move the ball
        this.moveBall(this.deltaTime);
        
        // Continue the game loop if the game is running
        if (this.gameRunning) {
            this.animationFrameId = requestAnimationFrame(this.gameLoop);
        }
    }

    /**
     * Update paddle 1 position (left paddle - W/S keys)
     */
    updatePaddle1(deltaTime : number) : void {
        // Check if paddle is active in multiplayer mode
        if (this.isMultiplayerMode && !this.paddle1Active) return;
        
        this.paddle1Speed = 0;
        
        // W key - move up
        if (this.keysPressed['w'] || this.keysPressed['W']) {
            this.paddle1Speed = -this.paddleMaxSpeed;
        }
        
        // S key - move down
        if (this.keysPressed['s'] || this.keysPressed['S']) {
            this.paddle1Speed = this.paddleMaxSpeed;
        }
        
        // Update paddle position
        this.paddle1Y += this.paddle1Speed * deltaTime * 60;
        
        // Clamp position to game boundaries
        this.paddle1Y = Math.max(0, Math.min(this.gameHeight - this.paddleHeight, this.paddle1Y));
        
        // Update DOM
        this.paddle1!.style.top = `${this.paddle1Y}px`;
    }

    /**
     * Update paddle 2 position (right paddle - Arrow keys)
     */
    updatePaddle2(deltaTime : number): void {
        // Check if paddle is active in multiplayer mode
        if (this.isMultiplayerMode && !this.paddle2Active) return;
        
        // If in AI mode, the paddle speed was already updated in updateAIDecisions
        // Just apply the movement
        if (!this.isAIMode) {
            this.paddle2Speed = 0;
            
            // Arrow Up - move up
            if (this.keysPressed['ArrowUp']) {
                this.paddle2Speed = -this.paddleMaxSpeed;
            }
            
            // Arrow Down - move down
            if (this.keysPressed['ArrowDown']) {
                this.paddle2Speed = this.paddleMaxSpeed;
            }
        }
        
        // Apply movement using the current paddle speed (set either by AI or player controls)
        const effectiveSpeed = this.paddle2Speed * deltaTime * 60;
        
        // Update paddle position
        this.paddle2Y += effectiveSpeed;
        
        // Clamp position to game boundaries
        this.paddle2Y = Math.max(0, Math.min(this.gameHeight - this.paddleHeight, this.paddle2Y));
        
        // Update DOM
        this.paddle2!.style.top = `${this.paddle2Y}px`;
    }

    /**
     * Update paddle 3 position (left paddle team - E/D keys)
     */
    updatePaddle3(deltaTime : number): void {
        // Check if paddle is active in multiplayer mode
        if (!this.paddle3Active) return;
        
        this.paddle3Speed = 0;
        
        // E key - move up
        if (this.keysPressed['e'] || this.keysPressed['E']) {
            this.paddle3Speed = -this.paddleMaxSpeed;
        }
        
        // D key - move down
        if (this.keysPressed['d'] || this.keysPressed['D']) {
            this.paddle3Speed = this.paddleMaxSpeed;
        }
        
        // Update paddle position
        this.paddle3Y += this.paddle3Speed * deltaTime * 60;
        
        // Clamp position to game boundaries
        this.paddle3Y = Math.max(0, Math.min(this.gameHeight - this.paddleHeight, this.paddle3Y));
        
        // Update DOM
        this.paddle3!.style.top = `${this.paddle3Y}px`;
    }

    /**
     * Update paddle 4 position (right paddle team - I/K keys)
     */
    updatePaddle4(deltaTime : number): void {
        // Check if paddle is active in multiplayer mode
        if (!this.paddle4Active) return;
        
        this.paddle4Speed = 0;
        
        // I key - move up
        if (this.keysPressed['i'] || this.keysPressed['I']) {
            this.paddle4Speed = -this.paddleMaxSpeed;
        }
        
        // K key - move down
        if (this.keysPressed['k'] || this.keysPressed['K']) {
            this.paddle4Speed = this.paddleMaxSpeed;
        }
        
        // Update paddle position
        this.paddle4Y += this.paddle4Speed * deltaTime * 60;
        
        // Clamp position to game boundaries
        this.paddle4Y = Math.max(0, Math.min(this.gameHeight - this.paddleHeight, this.paddle4Y));
        
        // Update DOM
        this.paddle4!.style.top = `${this.paddle4Y}px`;
    }
    /**
     * Move the ball and check for collisions
     */
    moveBall(deltaTime : number) : void {
        // Store previous position for collision detection
        this.ballLastX = parseFloat(this.ball!.style.left);
        this.ballLastY = parseFloat(this.ball!.style.top);
        
        // Scale ball speed based on game area dimensions
        const effectiveSpeedX = this.ballSpeedX * this.scaleX * deltaTime * 60;
        const effectiveSpeedY = this.ballSpeedY * this.scaleY * deltaTime * 60;
        
        let ballLeft = this.ballLastX + effectiveSpeedX;
        let ballTop = this.ballLastY + effectiveSpeedY;
        const ballSize = parseFloat(this.ball!.style.width);
        
        // Reset collision flag at the start of each frame
        this.collisionProcessedThisFrame = false;
        
        // Top collision: snap to top and reverse vertical velocity
        if (ballTop <= 0) {
            ballTop = 3;
            this.ballSpeedY = -this.ballSpeedY;
            // Add a small random horizontal adjustment to prevent infinite top bouncing
            this.ballSpeedX += (Math.random() * 0.4 - 0.2) * Math.sign(this.ballSpeedX);
            this.playSound('wall');
        }
        // Bottom collision: snap to bottom and reverse vertical velocity
        else if (ballTop >= this.gameHeight - ballSize) {
            ballTop = this.gameHeight - ballSize - 3;
            this.ballSpeedY = -this.ballSpeedY;
            // Add a small random horizontal adjustment to prevent infinite bottom bouncing
            this.ballSpeedX += (Math.random() * 0.4 - 0.2) * Math.sign(this.ballSpeedX);
            this.playSound('wall');
        }
        
        // Get the actual paddle edge positions
        const paddle1Right = this.paddleWidth;
        const rightPaddleLeft = this.gameWidth - this.paddleWidth;
        
        // Left paddles collision detection
        if (this.ballSpeedX < 0) {
            // Check for active paddle first, then disabled paddle
            if (this.isMultiplayerMode) {
                // Determine which paddle is active and which is disabled
                const activePaddle = this.lastPaddleHit.leftSide === 'paddle3' ? this.paddle1 : this.paddle3;
                const activePaddleY = this.lastPaddleHit.leftSide === 'paddle3' ? this.paddle1Y : this.paddle3Y;
                const activePaddleId = this.lastPaddleHit.leftSide === 'paddle3' ? 1 : 3;
                
                const disabledPaddle = this.lastPaddleHit.leftSide === 'paddle3' ? this.paddle3 : this.paddle1;
                const disabledPaddleY = this.lastPaddleHit.leftSide === 'paddle3' ? this.paddle3Y : this.paddle1Y;
                const disabledPaddleId = this.lastPaddleHit.leftSide === 'paddle3' ? 3 : 1;
                
                // Check active paddle first
                if (this.checkLeftPaddleCollision(activePaddle!, activePaddleY, paddle1Right, activePaddleId)) {
                    ballLeft = paddle1Right;
                }
                // Only check disabled paddle if no collision has been processed yet
                else if (!this.collisionProcessedThisFrame && 
                         this.checkLeftPaddleCollision(disabledPaddle!, disabledPaddleY, paddle1Right, disabledPaddleId)) {
                    ballLeft = paddle1Right;
                }
            } else {
                // Standard single player mode
                if (this.checkLeftPaddleCollision(this.paddle1!, this.paddle1Y, paddle1Right, 1)) {
                    ballLeft = paddle1Right;
                }
            }
        }
        
        // Right paddles collision detection
        if (this.ballSpeedX > 0) {
            // Check for active paddle first, then disabled paddle
            if (this.isMultiplayerMode) {
                // Determine which paddle is active and which is disabled
                const activePaddle = this.lastPaddleHit.rightSide === 'paddle4' ? this.paddle2 : this.paddle4;
                const activePaddleY = this.lastPaddleHit.rightSide === 'paddle4' ? this.paddle2Y : this.paddle4Y;
                const activePaddleId = this.lastPaddleHit.rightSide === 'paddle4' ? 2 : 4;
                
                const disabledPaddle = this.lastPaddleHit.rightSide === 'paddle4' ? this.paddle4 : this.paddle2;
                const disabledPaddleY = this.lastPaddleHit.rightSide === 'paddle4' ? this.paddle4Y : this.paddle2Y;
                const disabledPaddleId = this.lastPaddleHit.rightSide === 'paddle4' ? 4 : 2;
                
                // Check active paddle first
                if (this.checkRightPaddleCollision(activePaddle!, activePaddleY, rightPaddleLeft, activePaddleId)) {
                    ballLeft = rightPaddleLeft - ballSize;
                }
                // Only check disabled paddle if no collision has been processed yet
                else if (!this.collisionProcessedThisFrame && 
                         this.checkRightPaddleCollision(disabledPaddle!, disabledPaddleY, rightPaddleLeft, disabledPaddleId)) {
                    ballLeft = rightPaddleLeft - ballSize;
                }
            } else {
                // Standard single player mode
                if (this.checkRightPaddleCollision(this.paddle2!, this.paddle2Y, rightPaddleLeft, 2)) {
                    ballLeft = rightPaddleLeft - ballSize;
                }
            }
        }
        
        // Out-of-bounds (scoring conditions)
        if (ballLeft <= 0) {
            if (this.player2Score && this.player2Score.textContent !== null) {
                this.player2Score.textContent = (parseInt(this.player2Score.textContent) + 1).toString();
                this.resetBall();
                this.playSound('loss');
                
                if (parseInt(this.player2Score.textContent) >= this.winScore) {
                    this.showWinScreen(this.player2Name!.textContent!);
                }
            }
            return;
        }
        
        if (ballLeft + ballSize >= this.gameWidth) {
            if (this.player1Score && this.player1Score.textContent !== null) {
                this.player1Score.textContent = (parseInt(this.player1Score.textContent) + 1).toString();
                this.resetBall();
                this.playSound('loss');
                
                if (parseInt(this.player1Score.textContent) >= this.winScore) {
                    this.showWinScreen(this.player1Name!.textContent!);
                }
            }
            return;
        }
        
        // Update ball position
        this.ball!.style.left = `${ballLeft}px`;
        this.ball!.style.top = `${ballTop}px`;
    }

        /**
     * Check collision with left paddle
     */
    checkLeftPaddleCollision(paddle: HTMLElement, paddleY: number, paddleRight: number, paddleId: number): boolean {
       // Skip collision check if we've already processed a collision this frame
       if (this.collisionProcessedThisFrame) return false;
        
       // Skip collision check for disabled paddles in multiplayer mode
       if (this.isMultiplayerMode) {
           if (paddleId === 1 && this.lastPaddleHit.leftSide === 'paddle1') return false;
           if (paddleId === 3 && this.lastPaddleHit.leftSide === 'paddle3') return false;
       }
       
       // Trajectory-based collision detection
       if (this.ballLastX > paddleRight && parseFloat(this.ball!.style.left) <= paddleRight) {
           // Calculate the y position at the time of intersection using linear interpolation
           const ratio = (paddleRight - this.ballLastX) / (parseFloat(this.ball!.style.left) - this.ballLastX);
           const intersectY = this.ballLastY + ratio * (parseFloat(this.ball!.style.top) - this.ballLastY);
           
           // Check if this y position is within the paddle's height bounds
           if (intersectY + parseFloat(this.ball!.style.height) >= paddleY &&
               intersectY <= paddleY + this.paddleHeight) {
               this.adjustBallDirection(paddleY, this.paddleHeight, true, paddleId);
               this.collisionProcessedThisFrame = true;
               return true;
           }
       }
       // Backup collision check for slower balls or edge cases
       else if (parseFloat(this.ball!.style.left) <= paddleRight + 2 &&
                parseFloat(this.ball!.style.left) + parseFloat(this.ball!.style.width) >= 0 &&
                parseFloat(this.ball!.style.top) + parseFloat(this.ball!.style.height) >= paddleY - 2 &&
                parseFloat(this.ball!.style.top) <= paddleY + this.paddleHeight + 2) {
           this.adjustBallDirection(paddleY, this.paddleHeight, true, paddleId);
           this.collisionProcessedThisFrame = true;
           return true;
       }
       
       return false;
    }

    checkRightPaddleCollision(paddle: HTMLElement, paddleY: number, paddleLeft: number, paddleId: number): boolean {
          // Skip collision check if we've already processed a collision this frame
          if (this.collisionProcessedThisFrame) return false;
        
          // Skip collision check for disabled paddles in multiplayer mode
          if (this.isMultiplayerMode) {
              if (paddleId === 2 && this.lastPaddleHit.rightSide === 'paddle2') return false;
              if (paddleId === 4 && this.lastPaddleHit.rightSide === 'paddle4') return false;
          }
          
          const ballWidth = parseFloat(this.ball!.style.width);
          const ballLeft = parseFloat(this.ball!.style.left);
          
          // Trajectory-based collision detection - check if ball's right edge crosses paddle's left edge
          if (this.ballLastX + ballWidth < paddleLeft && ballLeft + ballWidth >= paddleLeft) {
              // Calculate the y position at the time of intersection using linear interpolation
              const ratio = (paddleLeft - (this.ballLastX + ballWidth)) /
                           ((ballLeft + ballWidth) - (this.ballLastX + ballWidth));
              const intersectY = this.ballLastY + ratio * (parseFloat(this.ball!.style.top) - this.ballLastY);
              
              // Check if this y position is within the paddle's height bounds
              if (intersectY + parseFloat(this.ball!.style.height) >= paddleY &&
                  intersectY <= paddleY + this.paddleHeight) {
                  // Set ball position so its right edge exactly touches the paddle's left edge
                //   this.ball!.style.left = `${paddleLeft - ballWidth}px`;
                  this.adjustBallDirection(paddleY, this.paddleHeight, false, paddleId);
                  this.collisionProcessedThisFrame = true;
                  return true;
              }
          }
          // Backup collision check for slower balls or edge cases
          else if (ballLeft + ballWidth >= paddleLeft - 2 &&
                   ballLeft < paddleLeft + this.paddleWidth &&
                   parseFloat(this.ball!.style.top) + parseFloat(this.ball!.style.height) >= paddleY - 2 &&
                   parseFloat(this.ball!.style.top) <= paddleY + this.paddleHeight + 2) {
              // Set ball position so its right edge exactly touches the paddle's left edge
              this.ball!.style.left = `${paddleLeft - ballWidth}px`;
              this.adjustBallDirection(paddleY, this.paddleHeight, false, paddleId);
              this.collisionProcessedThisFrame = true;
              return true;
          }
          
          return false;
    }

    /**
     * Adjust ball direction based on where it hit the paddle
     */
    adjustBallDirection(paddleY: number, paddleHeight: number, isLeftPaddle: boolean, paddleId: number): void {
        const ballTop = parseFloat(this.ball!.style.top);
        const ballSize = parseFloat(this.ball!.style.width);
        const ballCenter = ballTop + ballSize / 2;
        
        // Calculate relative hit position (-0.5 to 0.5)
        const relativeIntersect = (ballCenter - (paddleY + paddleHeight / 2)) / (paddleHeight / 2);
        
        // Calculate angle (-45 to 45 degrees in radians)
        const bounceAngle = relativeIntersect * (Math.PI / 4);
        
        // Calculate the current speed of the ball
        let speed = Math.sqrt(this.ballSpeedX * this.ballSpeedX + this.ballSpeedY * this.ballSpeedY);
        
        // Increase the ball's speed by a factor, but cap it at the maximum speed
        speed = Math.min(speed * this.speedIncreaseFactor, this.maxSpeed);
        
        // Adjust the ball's horizontal speed based on the paddle side and bounce angle
        this.ballSpeedX = (isLeftPaddle ? 1 : -1) * speed * Math.cos(bounceAngle);
        
        // Adjust the ball's vertical speed based on the bounce angle
        this.ballSpeedY = speed * Math.sin(bounceAngle);
        
        // Add small random variations to prevent predictable patterns
        if (Math.abs(this.ballSpeedY) < 0.5) {
            this.ballSpeedY += (Math.random() * 2 - 1) * speed * 0.1;
        }
        this.ballSpeedX += (Math.random() * 2 - 1) * speed * 0.05;
        
        // If in multiplayer mode, handle tag-team mechanics
        if (this.isMultiplayerMode && paddleId) {
            // Update the last paddle hit for the appropriate side
            if (paddleId === 1 || paddleId === 3) {
                this.lastPaddleHit.leftSide = paddleId === 1 ? 'paddle1' : 'paddle3';
            } else if (paddleId === 2 || paddleId === 4) {
                this.lastPaddleHit.rightSide = paddleId === 2 ? 'paddle2' : 'paddle4';
            }
            
            // Apply visual cue to show which paddle is disabled
            this.resetPaddleVisuals();
        }
        
        // Play a sound effect to indicate the ball hit the paddle
        this.playSound('paddle');
    }

    /**
     * Show the win screen with the winner's name
     */
    async showWinScreen(winnerName: string): Promise<void> {
        // Stop the game
        this.gameRunning = false;
        this.gameOver = true;
        
        // Update win screen content
        const winnerText = document.getElementById('winnerText');
        const finalScore = document.getElementById('finalScore');
       
        if (winnerText && finalScore) {
            winnerText.textContent = `${winnerName} Wins!`;
            toastManager.info(this.userName!, `the winner is ${winnerName}`)
            finalScore.textContent = `${this.player1Score!.textContent} - ${this.player2Score!.textContent}`;
        }
        
        // Capture this match data into matchObj
        this.fillMatchObj(winnerName, this.matchObj.matchId); // matchId can be null for single matches
        
        // Tournament logic: record and show next match button
        if (this.isTournamentMode) {
            // Record this match after populating matchObj
            this.tournamentArr.push({ ...this.matchObj });
            console.log("Tournament match current state: in showwinscreen", this.currentTournamentMatch, this.tournamentArr);
            if (this.currentTournamentMatch < 3) {
             
                if (this.matchObj && this.matchObj.tournamentId) {
                    // Submit tournament match
                    console.log(`Submitting normal match in Tournament ${this.currentTournamentMatch} match:`, this.matchObj);
                    console.log("Tournament ID:", this.matchObj.tournamentId);
                    console.log("Match ID:", this.matchObj.matchId);
                    console.log( "player1_score from matchObj", this.matchObj.player1_score);
                    console.log("this.currentTournamentMatch", this.currentTournamentMatch);
                    this.tournamentArr[this.currentTournamentMatch - 1  ].player1_score = this.matchObj.player1_score;
                    this.tournamentArr[this.currentTournamentMatch - 1 ].player2_score = this.matchObj.player2_score;
                    if (this.tournamentArr[this.currentTournamentMatch - 1 ].player1_score === undefined || this.tournamentArr[this.currentTournamentMatch - 1 ].player2_score === undefined) {
                        console.error("Player 1 or Player 2 scores is undefined");
                        toastManager.showToast("Player 1 score or Player 2 is undefined", "error");
                        return;
                    }
                  const response_submission = await api.submitTournamentMatch(this.matchObj.tournamentId!, this.tournamentMatchId!, {
                    player1_score: this.matchObj.player1_score,
                    player2_score:  this.matchObj.player2_score,
                });
                console.log("Tournament Match1 Submitted:", response_submission);
                }

                document.getElementById('nextMatchButton')!.style.display = 'inline-block';
                this.isSettingUpNextMatch = false;
                console.log("Next match button displayed for Tournament match:", this.isSettingUpNextMatch);
            } else {
                // Final completed: submit and clear
                // if (this.submitTournament) {
                //     this.submitTournament(this.tournamentArr!);
                // }
                if (this.matchObj && this.matchObj.tournamentId) {
                    // Submit tournament match
                    console.log("Submitting Tournament final match:", this.matchObj);
                    console.log("Tournament ID:", this.matchObj.tournamentId);
                    console.log("Match ID:", this.matchObj.matchId);
                    console.log("this.currentTournamentMatch in final", this.currentTournamentMatch);
                    this.tournamentArr[this.currentTournamentMatch - 1 ].player1_score = this.matchObj.player1_score;
                    this.tournamentArr[this.currentTournamentMatch - 1].player2_score = this.matchObj.player2_score;
                    if (this.tournamentArr[this.currentTournamentMatch - 1  ].player1_score === undefined || this.tournamentArr[this.currentTournamentMatch - 1].player2_score === undefined) {
                        console.error("Player 1 or Player 2 scores is undefined");
                        toastManager.showToast("Player 1 score or Player 2 is undefined", "error");
                        return;
                    }
                  const response_submission = await api.submitTournamentMatch(this.matchObj.tournamentId!, this.tournamentMatchId!, {
                    player1_score: this.tournamentArr[this.currentTournamentMatch - 1 ].player1_score!,
                    player2_score:  this.tournamentArr[this.currentTournamentMatch - 1].player2_score!,
                });
                console.log("Tournament Match final Submitted:", response_submission);
                }
                this.tournamentArr = [];
                this.tournamentWinners = [];
                document.getElementById('nextMatchButton')!.style.display = 'none';
                this.currentTournamentMatch = 0;
            }
        } else {
            const nextMatchButton = document.getElementById('nextMatchButton');
            if (nextMatchButton) nextMatchButton.style.display = 'none';
        }
        
        // Show the win screen
        document.getElementById('winScreen')!.style.display = 'block';
        
        // Submit single match if not in tournament, then clear matchObj
        if (!this.isTournamentMode && !this.isMultiplayerMode) {
            console.log("Submitting Regular match:", this.matchObj);
            if (this.matchObj){
                    console.log("match ID OF REGUALR MATCH", this.matchObj.matchId);
                    api.submitRegularMatch!({
                        matchId: this.matchObj.matchId!,
                        player1_score: this.matchObj.player1_score,
                        player2_score: this.matchObj.player2_score,
                        is_multiplayer: this.isMultiplayerMode,
               
                    });
                
            }
        }   
        if (this.isMultiplayerMode) {
            // Reset multiplayer paddles for next match
            if (this.matchObj) {
                api.submitMultiplayerMatch({
                    matchId: this.matchObj.matchId!, 
                    team1_score: this.matchObj.player1_score!,
                    team2_score: this.matchObj.player2_score!,
                    is_multiplayer:true,
                });
            }
        }
      

    }


    fillMatchObj(winnerName: string, matchId: number | null): void {
        const storedUser = localStorage.getItem('user');

        this.matchObj.matchId = matchId !== null && matchId !== undefined ? Number(matchId) : null; // Use provided matchId or empty string
        const user = JSON.parse(storedUser ?? '{}');
        // this.matchObj.player1_id = typeof user.id === 'number' ? user.id : 0;
        // this.matchObj.player2_id = null; // Placeholder for AI or random player ID
        console.log("Match Object:", this.matchObj);
        // this.matchObj.player1_name  = this.player1Name!.textContent ?? 'Unknown Player';
        // this.matchObj.player2_name  = this.player2Name!.textContent ?? 'Unknown Player';
        this.matchObj.player1_score = parseInt(this.player1Score!.textContent!, 10);
        this.matchObj.player2_score = parseInt(this.player2Score!.textContent!, 10);
        this.matchObj.winner       = winnerName;
        this.matchObj.tournamentId = this.isTournamentMode ? this.tournamentId : null;
        // Determine match type
        // this.matchObj.match_type = this.getMatchType();
    }

    getMatchType(): string {
        switch (true) {
            case this.isTournamentMode:
              return 'tournament';
            case this.isAIMode:
              return '1vsAi';
            case this.isMultiplayerMode:
              return 'multiplayer';
            default:
              return '1v1';
          }
    }

        /**
     * Get the winner from a match object
     * @param {Object} match - a match record
     * @returns {string} the winner's name or empty string
     */
    getWinnerName(match: typeof this.matchObj): string {
        return match && match.winner ? match.winner : '';
    }


    /**
     * Play a sound effect
     */
    playSound(sound : string): void {
        switch (sound) {
            case 'paddle':
                if (this.paddleSound) {
                    this.paddleSound.currentTime = 0;
                    this.paddleSound.play();
                }
                break;
            case 'wall':
                if (this.wallSound) {
                    this.wallSound.currentTime = 0;
                    this.wallSound.play();
                }
                break;
            case 'loss':
                if (this.lossSound) {
                    this.lossSound.currentTime = 0;
                    this.lossSound.play().catch(e => console.log("Error playing sound:", e));
                }
                break;
        }
    }

    /**
     * Update AI decisions for controlling the paddle
     */
    updateAIDecisions() : void {
        // Skip if not in AI mode
        if (!this.isAIMode) return;
        
        // Reset key states at the beginning of each frame - this simulates keyboard input
        this.aiKeyState['ArrowUp'] = false;
        this.aiKeyState['ArrowDown'] = false;
        
        // Check if ball changed direction (to activate return to center behavior)
        if (this.ballSpeedX < 0 && this.aiPerceptionBallSpeedX > 0) {
            this.shouldReturnToCenter = true;
        }
        
        // Update AI's perception of the ball based on reaction delay
        // The AI can only refresh its view of the game once per second
        const currentTime = Date.now();
        if (!this.lastAIUpdateTime) {
            this.lastAIUpdateTime = currentTime;
            
            // Initial perception
            this.aiPerceptionBallX = parseFloat(this.ball!.style.left);
            this.aiPerceptionBallY = parseFloat(this.ball!.style.top);
            this.aiPerceptionBallSpeedX = this.ballSpeedX;
            this.aiPerceptionBallSpeedY = this.ballSpeedY;
        }
        
        // Only update perception once per second as per requirements
        if (currentTime - this.lastAIUpdateTime > this.aiReactionDelay) {
            // Update AI's perception of the ball
            this.aiPerceptionBallX = parseFloat(this.ball!.style.left);
            this.aiPerceptionBallY = parseFloat(this.ball!.style.top);
            this.aiPerceptionBallSpeedX = this.ballSpeedX;
            this.aiPerceptionBallSpeedY = this.ballSpeedY;
            
            // Set difficulty parameters
            switch (this.aiDifficulty) {
                case 'easy':
                    this.aiMistakeChance = 0.35;
                    this.aiErrorMargin = 0.35;
                    this.aiReturnToMiddleSpeed = 0.05;
                    this.aiCenteringProbability = 0.2;
                    this.aiPredictionAccuracy = 0.5;
                    break;
                    
                case 'medium':
                    this.aiMistakeChance = 0.15;
                    this.aiErrorMargin = 0.15;
                    this.aiReturnToMiddleSpeed = 0.3;
                    this.aiCenteringProbability = 0.6;
                    this.aiPredictionAccuracy = 0.8;
                    break;
                    
                case 'hard':
                    this.aiMistakeChance = 0.05;
                    this.aiErrorMargin = 0.05;
                    this.aiReturnToMiddleSpeed = 0.7;
                    this.aiCenteringProbability = 0.9;
                    this.aiPredictionAccuracy = 0.95;
                    break;
            }
            
            // AI makes mistakes based on difficulty
            if (Math.random() < this.aiMistakeChance) {
                // Intentionally misjudge ball direction or speed (makes AI more human-like)
                this.aiPerceptionBallSpeedY *= -0.8 + Math.random() * 0.4;
            }
            
            // Update last AI update time
            this.lastAIUpdateTime = currentTime;
        }
        
        // Get the center position of the paddle
        const paddleCenterY = this.paddle2Y + this.paddleHeight / 2;
        const centerPosition = this.gameHeight / 2 - this.paddleHeight / 2;
        const distanceFromCenter = Math.abs(paddleCenterY - this.gameHeight / 2);
        
        // AGGRESSIVE BEHAVIOR: Move to intercept the ball if it's coming toward the AI
        if (this.aiPerceptionBallSpeedX > 0) {
            // Calculate time until ball reaches paddle
            const ballSize = parseFloat(this.ball!.style.width);
            const distanceToTravel = this.gameWidth - this.paddleWidth - ballSize - this.aiPerceptionBallX;
            
            // Predict where ball will be vertically
            let predictedY = this.predictBallPosition(
                this.aiPerceptionBallX, 
                this.aiPerceptionBallY, 
                this.aiPerceptionBallSpeedX, 
                this.aiPerceptionBallSpeedY, 
                distanceToTravel
            );
            
            // Add prediction errors based on difficulty
            if (Math.random() > this.aiPredictionAccuracy) {
                const errorAmount = (1 - this.aiPredictionAccuracy) * this.gameHeight * 0.3;
                predictedY += (Math.random() * 2 - 1) * errorAmount;
            }
            
            // Calculate dynamic error margin (smaller for hard difficulty)
            const distanceFactor = Math.min(1, distanceToTravel / this.gameWidth);
            const dynamicErrorMargin = this.paddleHeight * (this.aiErrorMargin * (0.3 + 0.7 * distanceFactor));
            
            // Calculate difference between predicted ball position and paddle position
            const predictedBallCenter = predictedY + ballSize / 2;
            const difference = predictedBallCenter - paddleCenterY;
            
            // Intercept the ball with higher precision for harder difficulties
            if (Math.abs(difference) > dynamicErrorMargin) {
                this.aiKeyState[difference > 0 ? 'ArrowDown' : 'ArrowUp'] = true;
            }
            
            // Reset center flag when actively tracking ball
            this.shouldReturnToCenter = false;
        } 
        // RETURN TO CENTER: After hitting ball or when ball is moving away
        else if (this.aiPerceptionBallSpeedX < 0) {
            // Decision to center based on difficulty setting
            const shouldCenter = Math.random() < this.aiReturnToMiddleSpeed;
            
            // If we should center and we're not already centered
            if (shouldCenter && distanceFromCenter > 10) {
                this.aiKeyState[paddleCenterY > this.gameHeight / 2 ? 'ArrowUp' : 'ArrowDown'] = true;
            }
        }
        
        // For medium/hard difficulty, occasionally predict and move based on expected return trajectory
        if (this.aiPerceptionBallSpeedX < 0 && this.aiDifficulty !== 'easy') {
            const proactiveChance = this.aiDifficulty === 'hard' ? 0.7 : 0.3;
            
            if (Math.random() < proactiveChance) {
                // Try to predict where the ball might come back
                const playerPaddleX = this.paddleWidth;
                const bounceX = Math.max(playerPaddleX, this.aiPerceptionBallX - Math.abs(this.aiPerceptionBallSpeedX) * 15);
                
                // Simple prediction of return trajectory
                const ballSize = parseFloat(this.ball!.style.width);
                let expectedReturnY = this.aiPerceptionBallY + (this.aiPerceptionBallSpeedY * 
                                     (this.gameWidth / Math.max(1, Math.abs(this.aiPerceptionBallSpeedX))));
                
                // Keep within game bounds
                expectedReturnY = Math.max(0, Math.min(this.gameHeight - ballSize, expectedReturnY));
                
                // Move slightly toward the expected return position
                const returnDiff = (expectedReturnY + ballSize/2) - paddleCenterY;
                
                // Only move if we're far from the predicted position and not already moving
                if (Math.abs(returnDiff) > this.gameHeight/4 && 
                    !this.aiKeyState['ArrowUp'] && !this.aiKeyState['ArrowDown']) {
                    this.aiKeyState[returnDiff > 0 ? 'ArrowDown' : 'ArrowUp'] = true;
                }
            }
        }
        
        // Now apply the simulated key presses to move the paddle just like a human player would
        if (this.aiKeyState['ArrowUp']) {
            this.paddle2Speed -= this.paddleAcceleration;
        } else if (this.aiKeyState['ArrowDown']) {
            this.paddle2Speed += this.paddleAcceleration;
        } else {
            // Apply deceleration when no keys are pressed
            if (this.paddle2Speed > 0) {
                this.paddle2Speed = Math.max(0, this.paddle2Speed - this.paddleDeceleration);
            } else if (this.paddle2Speed < 0) {
                this.paddle2Speed = Math.min(0, this.paddle2Speed + this.paddleDeceleration);
            }
        }
        
        // Clamp paddle speed to maximum - same as for human players
        this.paddle2Speed = Math.max(-this.paddleMaxSpeed, Math.min(this.paddleMaxSpeed, this.paddle2Speed));
        
        // The actual paddle movement and position update is handled in updatePaddle2
    }

    /**
     * Predict ball position after traveling a certain distance
     */
    predictBallPosition(startX: number, startY: number, speedX: number, speedY: number, distanceX: number): number {
        const ballSize = parseFloat(window.getComputedStyle(this.ball!).width);
        
        // Time to travel distanceX
        const timeSteps = distanceX / speedX;
        
        // Calculate final Y position
        let predictedY = startY + speedY * timeSteps;
        
        // Adjust for bounces off top and bottom
        const effectiveHeight = this.gameHeight - ballSize;
        
        // Calculate number of bounces and final position
        if (predictedY < 0 || predictedY > effectiveHeight) {
            // Get position relative to top or bottom edge
            const bouncePos = (predictedY < 0) ? -predictedY : 2 * effectiveHeight - predictedY;
            
            // Get position within the bounds (0 to effectiveHeight)
            let normalizedPos = bouncePos % (2 * effectiveHeight);
            
            // Adjust if needed
            if (normalizedPos > effectiveHeight) {
                normalizedPos = 2 * effectiveHeight - normalizedPos;
            }
            
            predictedY = normalizedPos;
        }
        
        return predictedY + ballSize / 2; // Return center Y
    }

    /**
     * Start a tournament with 4 players
     */
    async startTournament(): Promise<void> {
        // Prevent multiple tournament creation
        if (this.isCreatingTournament) {
            console.log("Tournament creation already in progress");
            return;
        }

        this.isCreatingTournament = true;

        try {
            // Get player names from inputs
            this.tournamentPlayers = [
                (document.getElementById('tournament-p1')! as HTMLInputElement).value != '' ? (document.getElementById('tournament-p1')! as HTMLInputElement).value : this.userName || 'Player_1',
                (document.getElementById('tournament-p2')! as HTMLInputElement).value != '' ? (document.getElementById('tournament-p2')! as HTMLInputElement).value  : 'Player_2',
                (document.getElementById('tournament-p3')! as HTMLInputElement).value  != '' ? (document.getElementById('tournament-p3')! as HTMLInputElement).value  : 'Player_3',
                (document.getElementById('tournament-p4')! as HTMLInputElement).value != '' ? (document.getElementById('tournament-p4')! as HTMLInputElement).value : 'Player_4'
            ];
            
            // Reset tournament state
            this.currentTournamentMatch = 0;
            this.tournamentWinners = [];
            
            // Update bracket display
            document.getElementById('semi1Player1')!.textContent = this.tournamentPlayers[0];
            document.getElementById('semi1Player2')!.textContent = this.tournamentPlayers[1];
            document.getElementById('semi2Player1')!.textContent = this.tournamentPlayers[2];
            document.getElementById('semi2Player2')!.textContent = this.tournamentPlayers[3];
            document.getElementById('finalPlayer1')!.textContent = 'TBD';
            document.getElementById('finalPlayer2')!.textContent = 'TBD';

            //api to create the tournament in the backend
            
            //create the tournament
            if (this.isTournamentMode) {
                // Prepare tournament match data
                this.matchObj.tournamentId = this.tournamentId || null;
                this.matchObj.match_type = 'tournament';
                
                // Submit tournament match data
                console.log("Creating tournament...");
                const response = await api.createTournament(4);
                console.log("Tournament created from the response:", response);
                if (response.success) {
                    this.tournamentId = response.data.tournament.id;
                    this.matchObj.tournamentId = response.data.tournament.id;
                    // Store the match ID
                    console.log("Tournament match created successfully with ID:", response.data.tournament.id);
                    this.currentTournamentMatch = 0; // Reset match counter
                    // Start the first match
                    await this.setupNextTournamentMatch();
                } else {
                    console.error("Error creating tournament match:", response.message);
                    toastManager.showToast("Error creating tournament match: " + response.message, "error");
                }
            }
        } catch (error) {
            console.error("Error in startTournament:", error);
            toastManager.showToast("Error starting tournament: " + error, "error");
        } finally {
            // Reset the flag after tournament creation is complete
            this.isCreatingTournament = false;
        }
    }

    /**
     * Set up the next match in the tournament
     */
    async setupNextTournamentMatch() : Promise<void> {
        // Hide tournament screen
        document.getElementById('tournamentScreen')!.style.display = 'none';
        // console.log("Setting up next tournament match, current match:", this.currentTournamentMatch);
        this.currentTournamentMatch++;
        console.log("increasing tournament match to:", this.currentTournamentMatch);
        // Determine which match to play
        if (this.currentTournamentMatch == 1) {
            // First semifinal
            document.getElementById('tournamentAnnouncement')!.textContent = 
                `Semifinal 1: ${this.tournamentPlayers[0]} vs ${this.tournamentPlayers[1]}`;
            
            // Set player names for the match
            this.player1Name!.textContent = this.tournamentPlayers[0];
            this.player2Name!.textContent = this.tournamentPlayers[1];


              console.log("Tournament ID", this.tournamentId);
                console.log("Tournament Match Object:", this.matchObj, this.tournamentPlayers);
                const response  = await api.createTournamentMatch(this.tournamentId!, {
                    player1_id: this.userId,
                    player2_id: null,
                    player1_name: this.userName || this.tournamentPlayers[0],
                    player2_name: this.tournamentPlayers[1],
                
                });
                console.log("Tournament Match1 Created:", response);
                // let matchData = JSON.parse(r);
                console.log("Tournament Match1 Data id:", response.data.match.id);
                if (response.data.match.id === undefined) {
                    console.error("Match ID is undefined in the response");
                    toastManager.showToast("Match ID is undefined in the response", "error");
                    return;
                }
                toastManager.info(this.userName!, `Game Commencing: ${this.tournamentPlayers[0]} VS. ${this.tournamentPlayers[1]}`)
                // console.log("plyer 1 socre:", this.tournamentArr[this.currentTournamentMatch - 1].player1_score);
                this.matchObj.matchId = response.data.match.id; // Update matchId from the response
                this.tournamentMatchId =  response.data.match.id; // Store the match ID for later use
                console.log("Current Tournament Match: this after increment", this.currentTournamentMatch);
                 

        } else if (this.currentTournamentMatch == 2) {
            // Second semifinal
            document.getElementById('tournamentAnnouncement')!.textContent = 
                `Semifinal 2: ${this.tournamentPlayers[2]} vs ${this.tournamentPlayers[3]}`;
            
            // Set player names for the match
            this.player1Name!.textContent = this.tournamentPlayers[2];
            this.player2Name!.textContent = this.tournamentPlayers[3];
            
            //create match 2
              console.log("Tournament ID", this.tournamentId);
                console.log("Tournament Match  2 Object:", this.matchObj, this.tournamentPlayers);
                const response  = await api.createTournamentMatch(this.tournamentId!, {
                    player1_id: null,
                    player2_id: null,
                    player1_name: this.tournamentPlayers[2],
                    player2_name: this.tournamentPlayers[3],
                
                });
                toastManager.info(this.userName!, `Game Commencing: ${this.tournamentPlayers[2]} VS. ${this.tournamentPlayers[3]}`)
                console.log("Tournament Match2 Created:", response);
                // let matchData = JSON.parse(r);
                console.log("Tournament Match2 Data id:",  response.data.match.id);
                // console.log("plyer 1 socre:", this.tournamentArr[this.currentTournamentMatch - 1].player1_score);
                this.matchObj.matchId =  response.data.match.id; // Update matchId from the response
                this.tournamentMatchId =  response.data.match.id;

                console.log("Current Tournament Match: this after increment", this.currentTournamentMatch);
                // this.currentTournamentMatch++;


        } else if (this.currentTournamentMatch == 3) {
            // Final match - announce based on stored tournamentArr winners
            let winner1 = this.getWinnerName(this.tournamentArr[0]);
            const winner2 = this.getWinnerName(this.tournamentArr[1]);
            document.getElementById('tournamentAnnouncement')!.textContent =
                `Final: ${winner1} vs ${winner2}`;
            // Update bracket display
            document.getElementById('finalPlayer1')!.textContent = winner1;
            document.getElementById('finalPlayer2')!.textContent = winner2;
            // Set player names for the match
            this.player1Name!.textContent = winner1;
            this.player2Name!.textContent = winner2;
            //check if the first winner is the authenicated user
            let player1ID : number | null;
            if (winner1 === this.tournamentPlayers[0]) {
                console.log("user won");
                player1ID = this.userId ?? null; // Use authenticated user ID
                winner1 = this.userName || "player1";
            }else {
                player1ID = null; // Placeholder for AI or random player ID
            }

            //create match 3
              console.log("Tournament ID", this.tournamentId);
                console.log("Tournament Match 3 Object:", this.matchObj, this.tournamentPlayers);
                const response  = await api.createTournamentMatch(this.tournamentId!, {
                    player1_id: player1ID,
                    player2_id: null,
                    player1_name: winner1,
                    player2_name: winner2,
                
                });
                console.log("Tournament Match 3 final Created:", response);
                // let matchData = JSON.parse(r);
                console.log("Tournament Match3 final Data id:",  response.data.match.id);
                // console.log("plyer 1 socre:", this.tournamentArr[this.currentTournamentMatch - 1].player1_score);
                this.matchObj.matchId =  response.data.match.id; // Update matchId from the response
                this.tournamentMatchId =  response.data.match.id;
                console.log("Current Tournament Final Match: this after increment", this.currentTournamentMatch);
                // this.currentTournamentMatch++;
                console.log("resetting currentTournamentMatch to 0 for next tournament", this.currentTournamentMatch);
                toastManager.info(this.userName!, `Game Commencing: ${winner1} VS. ${winner2}`)
        }
        
        // Increment match counter
        // if (this.currentTournamentMatch  >= 2) {
        //     this.currentTournamentMatch = 0; // Reset for next tournament
        //     console.log("Tournament completed, resetting match counter.");
        // }else 
        // {
        //     this.currentTournamentMatch++;
        //     console.log("Current Tournament Match after increment:", this.currentTournamentMatch);
        // }
        
        // Show tournament announcement briefly, then start the game
        document.getElementById('tournamentAnnouncement')!.style.display = 'block';

        // Reset game for the new match
        this.resetGame();
        
        // Start the match after a short delay
        setTimeout(() => {
            document.getElementById('tournamentAnnouncement')!.style.display = 'none';
            document.getElementById('startText')!.style.display = 'block';
        }, 2000);
    }

    /**
     * Apply settings from the settings screen
     */
    applySettings() {

        // Get win score setting
        const winScoreSelect = document.getElementById('winScore') as HTMLInputElement;
        this.winScore = parseInt(winScoreSelect.value);
        
        // Get ball speed setting
        const ballSpeedSelect = document.getElementById('ballSpeedSelect') as HTMLInputElement;
        const speedValue = parseInt(ballSpeedSelect!.value);
        this.initialBallSpeedX = speedValue;
        this.initialBallSpeedY = speedValue * 0.4;
        
        // Get paddle size setting
        const paddleSizeSelect = document.getElementById('paddleSize') as HTMLInputElement;
        this.paddleSizeClass = paddleSizeSelect!.value;
        this.updatePaddleSizes();
        
        // Get AI difficulty setting
        const aiDifficultySelect = document.getElementById('aiDifficultySelect') as HTMLInputElement;
        this.aiDifficulty = aiDifficultySelect!.value;
        
        // Get player names
        const player1NameInput_2 = document.getElementById('player1NameInput') as  HTMLInputElement;
        const player2NameInput_2 = document.getElementById('player2NameInput') as HTMLInputElement;
        
        // Override stored username if Player 1 name is set in settings
        if (player1NameInput_2!.value) {
            console.log("Player 1 name input value:", player1NameInput_2!.value);
            this.player1Name!.textContent = player1NameInput_2!.value || this.userName;
            this.aliasUsernamePlayer1 = player1NameInput_2!.value || this.userName; // Store alias for Player 1
            if (this.player1NameInput != null && this.player1NameInput!.value) {
                this.player1NameInput!.value = player1NameInput_2!.value;}
        }
        
        if (player2NameInput_2!.value) {
            console.log("Player 2 name input value:", player2NameInput_2!.value);
            this.player2Name!.textContent = player2NameInput_2!.value || "PLAYER_2";
            // this.aliasUsernamePlayer1 = player2NameInput_2!.value || this.userName; // Store alias for Player 1
            this.matchObj.player2_name = player2NameInput_2!.value || "PLAYER_2"; // Update match object
            if (this.player2NameInput != null && this.player2NameInput!.value) {
                this.player2NameInput!.value = player2NameInput_2!.value;}
        }
        // if (this.player2NameInput != null && this.player2NameInput!.value) {
            
        //     this.player2Name!.textContent = this.player2NameInput!.value;
        //     this.matchObj.player2_name = this.player2NameInput!.value;
        // }
        
        // If in AI mode, update player 2 name based on difficulty
        if (this.isAIMode) {

            // this.player1Name!.textContent = player1NameInput.value || this.userName;
            const difficultyName = this.aiDifficulty.charAt(0).toUpperCase() + this.aiDifficulty.slice(1);
            this.player2Name!.textContent = `AI (${difficultyName})`;
        }
        
        // If in multiplayer mode, apply team name overrides or retain current values
        // if (this.isMultiplayerMode) {
        //     const team1Val = document.getElementById('team1NameInput').value;
        //     const team2Val = document.getElementById('team2NameInput').value;
        //     this.player1Name.textContent = team1Val || this.player1Name.textContent;
        //     this.player2Name.textContent = team2Val || this.player2Name.textContent;
        // }
        
        // Apply background setting
        const backgroundSelect = document.getElementById('backgroundSelect');
        const videoBg = document.getElementById('videoBackground');
        if ((backgroundSelect! as HTMLInputElement).value === 'video') {
            // Create dark sparkle background effect
            this.gameArea!.style.backgroundColor = '#000000'; // Solid black background
            if (videoBg) {
                videoBg.style.display = 'block';
                videoBg.style.zIndex = '1'; // Ensure it's above the base background
                
                // Remove semi-transparent overlay for now
                const overlay = videoBg.querySelector('.video-overlay');
                if (overlay) {
                    (overlay as HTMLElement).style.background = 'rgba(0, 0, 0, 0.3)'; // Semi-transparent black
                }
                
                // Play/restart the video when Sparkle mode is selected
                const videoElement = videoBg.querySelector('video');
                if (videoElement && typeof videoElement.play === 'function') {
                    videoElement.currentTime = 0; // Reset to beginning
                    videoElement.play().catch(e => console.log('Error playing video background:', e));
                }
            }
        } else {
            // Classic mode - make sure we have a valid video element before trying to pause
            if (videoBg) {
                // Only try to pause if it's a video with pause method
                const videoElement = videoBg.querySelector('video');
                if (videoElement && typeof videoElement.pause === 'function') {
                    videoElement.pause();
                    videoElement.currentTime = 0;
                }
                videoBg.style.display = 'none';
                videoBg.style.zIndex = '-1';
            }
            // Always set the background color to black for classic mode
            this.gameArea!.style.backgroundColor = '#000000'; // Solid black
        }
    }

 /**
     * Update paddle sizes based on settings
     */
 updatePaddleSizes() : void {
    // Remove existing size classes
    this.paddle1!.classList.remove('paddle-small', 'paddle-normal', 'paddle-large');
    this.paddle2!.classList.remove('paddle-small', 'paddle-normal', 'paddle-large');
    this.paddle3!.classList.remove('paddle-small', 'paddle-normal', 'paddle-large');
    this.paddle4!.classList.remove('paddle-small', 'paddle-normal', 'paddle-large');
    
    // Add selected size class
    this.paddle1!.classList.add(`paddle-${this.paddleSizeClass}`);
    this.paddle2!.classList.add(`paddle-${this.paddleSizeClass}`);
    this.paddle3!.classList.add(`paddle-${this.paddleSizeClass}`);
    this.paddle4!.classList.add(`paddle-${this.paddleSizeClass}`);
    
    // Adjust paddle height based on setting
    switch (this.paddleSizeClass) {
        case 'small':
            this.paddleHeight = this.gameHeight * 0.1; // 10% of game height
            break;
            
        case 'normal':
            this.paddleHeight = this.gameHeight * 0.15; // 15% of game height
            break;
            
        case 'large':
            this.paddleHeight = this.gameHeight * 0.2; // 20% of game height
            break;
    }
    
    // Update paddle dimensions
    this.paddle1!.style.height = `${this.paddleHeight}px`;
    this.paddle2!.style.height = `${this.paddleHeight}px`;
    this.paddle3!.style.height = `${this.paddleHeight}px`;
    this.paddle4!.style.height = `${this.paddleHeight}px`;
}

    /**
     * Update player names display
     */
    updatePlayerNames() : void {
        console.log("Updating player names...");
        // Get player names from settings inputs
        const player1NameInput = document.getElementById('player1NameInput') as HTMLInputElement;
        const player2NameInput = document.getElementById('player2NameInput') as HTMLInputElement;
        
        // Set default names if inputs are empty
        if (!player1NameInput!.value) {
            player1NameInput!.value = this.userName || 'Player1';
            console.log("Default Player 1 Name:", this.userName || 'Player1');
        
        }
        
        if (!player2NameInput!.value) {
            player2NameInput!.value = 'Player2';
        }
        
        // Update display

        this.player1Name!.textContent = player1NameInput!.value;
        this.player2Name!.textContent = player2NameInput!.value;
        this.aliasUsernamePlayer1 =  player1NameInput!.value;

        console.log("Player 1 Name:", this.player1Name!.textContent);
        console.log("Player 2 Name:", this.player2Name!.textContent);
    }

     /**
     * Wait for game elements to be properly loaded in the DOM
     */
    private waitForGameElements(): void {
        this.initializationAttempts++;
        
        // Try to get game elements
        this.gameArea = document.querySelector('.gameArea');
        this.ball = document.getElementById('ball');
        this.paddle1 = document.getElementById('paddle1');
        this.paddle2 = document.getElementById('paddle2');
        this.paddle3 = document.getElementById('paddle3');
        this.paddle4 = document.getElementById('paddle4');
        this.player1Score = document.getElementById('player1Score');
        this.player2Score = document.getElementById('player2Score');
        this.player1Name = document.getElementById('player1Name');
        this.player2Name = document.getElementById('player2Name');

        // Check if all critical elements are available
        const criticalElements = [
            this.gameArea, this.ball, this.paddle1, this.paddle2,
            this.player1Score, this.player2Score, this.player1Name, this.player2Name
        ];

        const allElementsLoaded = criticalElements.every(element => element !== null);

        if (allElementsLoaded && this.gameArea) {
            // Additional check: ensure gameArea has proper dimensions
            const gameAreaStyle = window.getComputedStyle(this.gameArea);
            const width = parseFloat(gameAreaStyle.width);
            const height = parseFloat(gameAreaStyle.height);
            
            if (width > 0 && height > 0) {
                console.log('Game elements loaded successfully');
                this.finishInitialization();
                return;
            }
        }

        // If elements not ready and we haven't exceeded max attempts, try again
        if (this.initializationAttempts < this.maxInitializationAttempts) {
            console.log(`Game elements not ready, attempt ${this.initializationAttempts}/${this.maxInitializationAttempts}`);
            setTimeout(() => this.waitForGameElements(), 100);
        } else {
            console.error('Failed to initialize game: elements not found after maximum attempts');
            // Show error message to user
            const errorMsg = document.createElement('div');
            errorMsg.innerHTML = '<p style="color: red; text-align: center;">Game failed to load. Please refresh the page.</p>';
            document.querySelector('#pageSection')?.appendChild(errorMsg);
        }
    }

    /**
     * Complete the game initialization once all elements are ready
     */
    private finishInitialization(): void {
        if (this.isInitialized) return;

        // Load sound effects
        this.paddleSound = document.getElementById('paddleSound') as HTMLAudioElement;
        this.wallSound = document.getElementById('wallSound') as HTMLAudioElement;
        this.lossSound = document.getElementById('lossSound') as HTMLAudioElement;

        // Initialize video background
        const videoBgInit = document.getElementById('videoBackground');
        if (videoBgInit) {
            videoBgInit.style.display = 'none';
            videoBgInit.style.zIndex = '1';
            if ('pause' in videoBgInit) {
                (videoBgInit as HTMLVideoElement).pause();
                (videoBgInit as HTMLVideoElement).currentTime = 0;
            }

            const overlay = videoBgInit.querySelector('.video-overlay');
            if (overlay) {
                (overlay as HTMLElement).style.background = 'rgba(0, 0, 0, 1)';
            }
        }

        // Prevent spaces in player name inputs
        const playerNameInputs = [
            'player1NameInput', 'player2NameInput', 
            'tournament-p1', 'tournament-p2', 'tournament-p3', 'tournament-p4'
        ];

        playerNameInputs.forEach(id => {
            const input = document.getElementById(id) as HTMLInputElement;
            if (input) {
                input.addEventListener('keydown', (event) => utils.preventSpaces(event));
            }
        });

        // Initialize game dimensions - this is crucial for SPA
        this.updateGameDimensions();
        
        // Set up event listeners
        this.setupEventListeners();

        // Initialize positions
        this.initializePositions();
        
        // Set initial paddle sizes
        this.updatePaddleSizes();

        // Set initial player names
        this.updatePlayerNames();

        // Check window size
        this.checkWindowSize();

        // Reset game state
        this.resetGame();

        this.isInitialized = true;
        console.log('Game initialization completed successfully');
    }






    /**
     * Cleanup method for SPA navigation
     */
    cleanup(): void {
        console.log('Cleaning up game...');
        
        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        
        // Reset state
        this.gameRunning = false;
        this.gameOver = false;
        this.isInitialized = false;
        this.initializationAttempts = 0;
        
        console.log('Game cleanup completed');
    }
}


const game = new PongGame();

export default game;


