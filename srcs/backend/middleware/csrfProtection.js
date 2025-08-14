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
 * CSRF protection hook function
 */
async function csrfProtectionMiddleware(request, reply) {
	console.log("CSRF protection hook triggered for:", request.method, request.url);
	
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
		console.log("Skipping CSRF - safe method:", request.method);
		return;
	}

	// Check if the current URL matches any skip route
	const shouldSkip = skipRoutes.some(route => {
		return request.url === route || request.url.startsWith(route);
	});
	
	if (shouldSkip) {
		console.log("Skipping CSRF - exempt route:", request.url);
		return;
	}

	// Skip if user is not authenticated (let auth middleware handle it)
	if (!request.cookies.accessToken) {
		console.log("Skipping CSRF - no access token");
		return;
	}

	console.log("CSRF validation required for:", request.method, request.url);

	// Check for CSRF token in header
	const csrfHeader = request.headers["x-csrf-token"];
	if (!csrfHeader) {
		console.log("CSRF token missing in header");
		throw new CustomError.BadRequestError("CSRF token missing in header");
	}

	// Get CSRF token from cookie
	const csrfCookie = request.cookies.csrfToken;
	if (!csrfCookie) {
		console.log("CSRF token missing in cookie");
		throw new CustomError.BadRequestError("CSRF token cookie missing");
	}

	// Compare tokens
	if (csrfHeader !== csrfCookie) {
		console.log("CSRF token mismatch - Header:", csrfHeader.substring(0, 8), "Cookie:", csrfCookie.substring(0, 8));
		throw new CustomError.BadRequestError("CSRF token mismatch");
	}

	console.log("CSRF validation passed");
}

module.exports = {
	generateCSRFToken,
	csrfProtectionMiddleware
};
