const { sanitizeObject } = require("../middleware/sanitizeInput");

function sanitizeSocketData(socket, next) {
	// Use socket.use() middleware to intercept all incoming events
	socket.use((packet, next) => {
		// packet is an array where packet[0] is the event name and packet[1+] are the event arguments

		// Skip internal Socket.io events (they start with underscore)
		if (typeof packet[0] === "string" && packet[0].startsWith("_")) {
			return next();
		}

		// Sanitize all arguments (starting from index 1)
		for (let i = 1; i < packet.length; i++) {
			if (typeof packet[i] === "object" && packet[i] !== null) {
				packet[i] = sanitizeObject(packet[i]);
			}
		}

		next();
	});

	// Store original emit method
	const originalEmit = socket.emit;

	// Override emit method to sanitize all outgoing data
	socket.emit = function (event, ...args) {
		// Skip internal Socket.io events
		if (typeof event === "string" && event.startsWith("_")) {
			return originalEmit.apply(this, [event, ...args]);
		}

		// Sanitize the args (outgoing data)
		const sanitizedArgs = args.map((arg) => {
			if (typeof arg === "object" && arg !== null) {
				return sanitizeObject(arg);
			}
			return arg;
		});

		// Call original emit with sanitized data
		return originalEmit.apply(this, [event, ...sanitizedArgs]);
	};

	next();
}

module.exports = sanitizeSocketData;
