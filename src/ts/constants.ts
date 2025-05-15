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

export const ENDPOINTS = {
    auth: {
        auth42: '/api/users/oauth/42/',
        login: '/api/users/login/',
        register: '/api/users/register/',
        logout: '/api/users/logout/',
        setup2FA: '/api/users/2fa/setup/',
        verify2FA: '/api/users/2fa/verify/',
        disable2FA: '/api/users/2fa/disable/',
        refreshToken: '/api/users/token/refresh/',
    },
    user: {
        me: '/api/users/me/',
    },
    game: {
        tournament: '/api/tournaments/tournament/',
        // match_history: '/api/tournaments/match_history/',
        match: '/api/tournaments/match/',
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
