const { sanitizeObject } = require("../middleware/sanitizeInput");

function sanitizeSocketData(socket, next) {
	// Store original emit method
	const originalEmit = socket.emit;

	// Override onAny method to sanitize all incoming data
	const originalOnAny = socket.onAny;
	socket.onAny = function (fn) {
		originalOnAny.call(socket, (event, ...args) => {
			// Sanitize the args (incoming data)
			const sanitizedArgs = args.map((arg) => {
				if (typeof arg === "object" && arg !== null) {
					return sanitizeObject(arg);
				}
				return arg;
			});

			fn(event, ...sanitizedArgs);
		});
	};

	// Override emit method to sanitize all outgoing data
	socket.emit = function (event, ...args) {
		// Sanitize the args (outgoing data)
		const sanitizedArgs = args.map((arg) => {
			if (typeof arg === "object" && arg !== null) {
				return sanitizeObject(arg);
			}
			return arg;
		});

		// Call original emit with sanitized data
		return originalEmit.call(this, event, ...sanitizedArgs);
	};

	next();
}

module.exports = sanitizeSocketData;
