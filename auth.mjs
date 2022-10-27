'use strict';

// @ts-check

import expressSession from 'express-session';
import pgSession from 'connect-pg-simple';

export function getSession(db) {
	if(!('COOKIE_SECRET' in process.env)) {
		console.error("Variable COOKIE_SECRET required in the environment");
		process.exit(-1);
	}

	const session = pgSession(expressSession);
	return expressSession({
		store: new session({
			pool: db.db.pool,
			createTableIfMissing: true
		}),
		secret: process.env.COOKIE_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: {
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
			secure: true,
			httpOnly: true
		}
	});
}


