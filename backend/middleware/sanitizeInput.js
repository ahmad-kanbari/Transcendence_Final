const sanitizeHtml = require("sanitize-html");

function sanitizeObject(obj) {
	if (!obj || typeof obj !== "object") return obj;

	Object.keys(obj).forEach((key) => {
		const value = obj[key];

		if (typeof value === "string") {
			// Sanitize string values - strip ALL HTML by default
			obj[key] = sanitizeHtml(value, {
				allowedTags: [], // No HTML tags allowed
				allowedAttributes: {}, // No attributes allowed
			});
		} else if (typeof value === "object" && value !== null) {
			// Recursively sanitize nested objects and arrays
			obj[key] = sanitizeObject(value);
		}
	});

	return obj;
}

function sanitizeInputMiddleware(request, reply, done) {
	if (request.body) {
		request.body = sanitizeObject(request.body);
	}

	// If you also need to sanitize URL parameters
	if (request.params) {
		request.params = sanitizeObject(request.params);
	}

	// If you need to sanitize query string parameters
	if (request.query) {
		request.query = sanitizeObject(request.query);
	}

	done();
}

module.exports = {
	sanitizeInputMiddleware,
	sanitizeObject,
};
