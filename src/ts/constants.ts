export const AVAILABLE_PAGES = ['home', 'game', 'login', 'profile', 'notFound', 'twoFA', 'chat'];


export const PAGES = {
    home: 'src/pages/home.html',
    login: 'src/pages/login.html',
    game: 'src/pages/game.html',
    notFound: 'src/pages/notFound.html',
    chat:'src/pages/chat.html',
    profile: 'src/pages/profile.html',
    twoFA: 'src/pages/twoFA.html',
};

export const TOAST_TYPES = ['error', 'warning', 'success', 'info'];

export const baseURL = "/api/v1";
// config.js
export const CONFIG = {
    baseURL: "/api/v1",
    socketURL: 'http://localhost:3000',
    pagination: {
        defaultLimit: 5,
        maxLimit: 50
    },
    toast: {
        duration: 2000,
        fadeOutDuration: 300
    }
};

export const ENDPOINTS = {
    auth: {
        googleAuth:`${baseURL}/auth/google/login`,
        login: `${baseURL}/auth/login`,
        register: `${baseURL}/auth/register`,
        logout: `${baseURL}/auth/logout`,
        setup2FA: `${baseURL}/users/2fa/setup/`,
        verify2FA: `${baseURL}/users/2fa/verify/`,
        disable2FA: `${baseURL}/users/2fa/disable/`,
        refreshToken: `${baseURL}/auth/refresh`,
    },
    user: {
        me:  `${baseURL}/users/me`,
        showUser:  `${baseURL}/users/showUser`,
        allUsers: `${baseURL}/users`,
        singleUser: `${baseURL}/users/`, 
        // This will be used with userId appended
    },
    game: {
        // Tournament endpoints
        create_tournament: `${baseURL}/tournaments`,              // POST /tournaments
        get_tournament: `${baseURL}/tournaments`,                 // GET /tournaments/:tournamentId  
        get_all_tournaments: `${baseURL}/tournaments`,            // GET /tournaments?page=1&limit=10
        create_match_inTournament: `${baseURL}/tournament`,       // POST /tournament/:tournamentId/matches
        adjust_match_inTournament: `${baseURL}/tournament`,       // PATCH /tournament/:tournamentId/matches/:matchId
        
        // Regular match endpoints  
        create_match: `${baseURL}/matches`,                       // POST /matches
        adjust_match: `${baseURL}/matches`,                       // PATCH /matches/:matchId
    },
}; 
// Usage examples based on your documentation:

// 1. Create tournament: POST /tournaments
// URL: `${ENDPOINTS.game.create_tournament}`
// Body: { "player_capacity": 4 }

// 2. Get specific tournament: GET /tournaments/:tournamentId  
// URL: `${ENDPOINTS.game.get_tournament}/${tournamentId}`

// 3. Get all tournaments: GET /tournaments?page=1&limit=10
// URL: `${ENDPOINTS.game.get_all_tournaments}?page=${page}&limit=${limit}`

// 4. Create tournament match: POST /tournament/:tournamentId/matches
// URL: `${ENDPOINTS.game.create_match_inTournament}/${tournamentId}/matches`
// Body: { "player1_id": 4, "player2_id": null, "player1_name": "mr1", "player2_name": "Morgan" }

// 5. Update tournament match: PATCH /tournament/:tournamentId/matches/:matchId  
// URL: `${ENDPOINTS.game.adjust_match_inTournament}/${tournamentId}/matches/${matchId}`
// Body: { "player1_score": 3, "player2_score": 2 }

// 6. Create regular match: POST /matches
// URL: `${ENDPOINTS.game.create_match}`
// Body: { "player1_id": 5, "player2_id": null, "player1_name": "mr2", "player2_name": "mr.random", "match_type": "1v1" }

// 7. Update regular match: PATCH /matches/:matchId
// URL: `${ENDPOINTS.game.adjust_match}/${matchId}`  
// Body: { "player1_score": 3, "player2_score": 1, "is_multiplayer": false }
export const VALIDATION_INPUTS = {
    username: {
        minLength: 3,
        maxLength: 25,
    },
    email: {
        maxLength: 50,
    },
    password: {
        minLength: 8,
        maxLength: 25
    }
};
