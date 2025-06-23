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
        create_tournament: `${baseURL}/tournaments/`, //post create a tournament
        get_tournament: `${baseURL}/tournaments/`, //get specific tounament :tournamentId
        get_all_tournaments: `${baseURL}/tournaments`, //get all tournaments
        create_match_inTournament: `${baseURL}/tournaments/`, //post create a match in tournament /:tournamentId/matches
        create_match: `${baseURL}/matches`,  // post match 
        adjust_match: `${baseURL}/matches` // pathch :matchId


    },
}; 

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
