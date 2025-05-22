export const AVAILABLE_PAGES = ['home', 'game', 'login', 'profile', 'notFound', 'twoFA'];


export const PAGES = {
    home: 'src/pages/home.html',
    login: 'src/pages/login.html',
    game: 'src/pages/game.html',
    notFound: 'src/pages/notFound.html',
    profile: 'src/pages/profile.html',
    twoFA: 'src/pages/twoFA.html'
};

export const TOAST_TYPES = ['error', 'warning', 'success', 'info'];

export const baseURL = "http://localhost:3000/api/v1";
export const ENDPOINTS = {
    auth: {
        googleAuth: "http://localhost:3000/api/v1/auth/google/login",
        login: `${baseURL}/auth/login`,
        register: `${baseURL}/auth/register`,
        logout: `${baseURL}/auth/logout`,
        setup2FA: `${baseURL}/api/users/2fa/setup/`,
        verify2FA: '/api/users/2fa/verify/',
        disable2FA: '/api/users/2fa/disable/',
        refreshToken: `${baseURL}/auth/refresh`,
    },
    user: {
        me: '/users/me',
        showUser: '/users/showUser',
        allUsers: '/users',
        singleUser: 'users/', // This will be used with userId appended
    },
    game: {
        tournament: '/tournaments/tournament/',
        match_history: '/tournaments/match_history/',
        match: '/tournaments/match/',
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
