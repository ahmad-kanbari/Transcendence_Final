// Test file to verify CSRF implementation
// This file can be used for manual testing - not part of the production code

/*
CSRF Protection Implementation Summary:

1. CSRF Token Generation:
   - Generated using crypto.randomBytes(32).toString("hex")
   - Set as a cookie with httpOnly: false so frontend can read it
   - Cookie settings: path: "/", secure: production, sameSite: "lax"
   - No signing required as per specifications

2. Cookie Setting:
   - CSRF token is automatically set when users authenticate
   - Set during login, Google OAuth callback, 2FA validation, and token refresh
   - Cleared during logout

3. CSRF Protection:
   - Applied to state-changing HTTP methods: POST, PUT, PATCH, DELETE
   - Requires X-CSRF-Token header to match csrfToken cookie
   - Exempts authentication routes (login, register, OAuth, refresh, 2FA validation)
   - Only applied to authenticated users

4. Integration Points:
   - Middleware: /middleware/csrfProtection.js
   - Controller: Updated authController.js to set/clear CSRF tokens
   - Routes: Added /api/v1/auth/csrf-token endpoint
   - App: Integrated via fastify.addHook('preHandler', csrfHook)

5. Frontend Requirements:
   - Read csrfToken from cookie (document.cookie or js-cookie library)
   - Include X-CSRF-Token header in all state-changing requests
   - Can use /api/v1/auth/csrf-token endpoint to get token if needed

6. Security Features:
   - Tokens expire after 24 hours
   - New token generated on each login/refresh
   - Double-submit cookie pattern (header + cookie validation)
   - Only protects authenticated endpoints
*/

// Example frontend usage:
/*
// Get CSRF token from cookie
function getCSRFToken() {
    const name = 'csrfToken=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

// Use in fetch requests
fetch('/api/v1/users/profile', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCSRFToken()
    },
    credentials: 'include',
    body: JSON.stringify(data)
});
*/
