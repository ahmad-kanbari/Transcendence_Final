const crypto = require("crypto");
const CustomError = require("../errors");

/**
 * Generate a CSRF token
 * @returns {string} Random CSRF token
 */
function generateCSRFToken() {
	return crypto.randomBytes(32).toString("hex");
}

/**
 * Fastify plugin for CSRF protection
 */
async function csrfProtectionPlugin(fastify, options) {
	// Register the hook that runs before every request
	fastify.addHook("preHandler", async (request, reply) => {
		// Only check CSRF for state-changing operations
		const methodsNeedingCSRF = ["POST", "PUT", "PATCH", "DELETE"];
		
		// Routes that don't need CSRF protection even if they're POST/PUT/etc
		const skipRoutes = [
			"/api/v1/auth/login",           // Initial login doesn't have CSRF token yet
			"/api/v1/auth/register",        // Registration doesn't have CSRF token yet
			"/api/v1/auth/google/callback", // OAuth callback
			"/api/v1/auth/refresh",         // Uses httpOnly refresh token for auth
			"/api/v1/auth/2fa/validate"     // Part of login flow, no CSRF token yet
		];

		// Skip if method doesn't need CSRF protection
		if (!methodsNeedingCSRF.includes(request.method)) {
			return;
		}

		// Check if the current URL matches any skip route
		const shouldSkip = skipRoutes.some(route => {
			return request.url === route || request.url.startsWith(route);
		});
		
		if (shouldSkip) {
			return;
		}

		// Skip if user is not authenticated (let auth middleware handle it)
		if (!request.cookies.accessToken) {
			return;
		}

		// Check for CSRF token in header
		const csrfHeader = request.headers["x-csrf-token"];
		if (!csrfHeader) {
			throw new CustomError.BadRequestError("CSRF token missing in header");
		}

		// Get CSRF token from cookie
		const csrfCookie = request.cookies.csrfToken;
		if (!csrfCookie) {
			throw new CustomError.BadRequestError("CSRF token cookie missing");
		}

		// Compare tokens
		if (csrfHeader !== csrfCookie) {
			throw new CustomError.BadRequestError("CSRF token mismatch");
		}
	});
}

module.exports = {
	generateCSRFToken,
	csrfProtectionPlugin,
};
