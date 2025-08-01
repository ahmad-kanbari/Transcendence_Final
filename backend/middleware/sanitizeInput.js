const sanitizeHtml = require("sanitize-html");

function sanitizeObject(obj) {
	if (!obj || typeof obj !== "object") return obj;

	if (Array.isArray(obj)) {
		return obj.map((item) => sanitizeObject(item));
	}

	const sanitized = {};
	Object.keys(obj).forEach((key) => {
		const value = obj[key];

		if (typeof value === "string") {
			// Sanitize string values - strip ALL HTML by default
			sanitized[key] = sanitizeHtml(value, {
				allowedTags: [], // No HTML tags allowed
				allowedAttributes: {}, // No attributes allowed
			});
		} else if (typeof value === "object" && value !== null) {
			// Recursively sanitize nested objects and arrays
			sanitized[key] = sanitizeObject(value);
		} else {
			sanitized[key] = value;
		}
	});

	return sanitized;
}

function sanitizeInputMiddleware(request, reply, done) {
	if (request.body) {
		request.sanitizedBody = sanitizeObject(request.body);
	}

	// If you also need to sanitize URL parameters
	if (request.params) {
		request.sanitizedParams = sanitizeObject(request.params);
	}

	// If you need to sanitize query string parameters
	if (request.query) {
		request.sanitizedQuery = sanitizeObject(request.query);
	}

	done();
}

module.exports = {
	sanitizeInputMiddleware,
	sanitizeObject,
};
