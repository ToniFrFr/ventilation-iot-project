'use strict';

// @ts-check

import { Router, urlencoded } from 'express';

export function authRouter(db, session) {
	let router = Router();
	router.use(session);

	let users = db.getUsers();
	let events = db.getEvents();

	router.post('/login', urlencoded({ extended: false }), async (req, res) => {
		try {
			let user = await users.getUser(req.body.username);
			if(await user.authenticate(req.body.password)) {
				console.log(`User ${user.username} has logged in`);
				await events.log(user.username, "Logged in");
				// regenerate the session, which is good practice to help
				// guard against forms of session fixation
				req.session.regenerate((err) => {
					if(err) {
						next(err);
					}
					// store user info in session, username should be unique id
					req.session.user = user.username;

					// save the session before redirection to ensure page
					// load does not happen before session is saved
					req.session.save((err) => {
						if(err) {
							return next(err);
						}
						res.redirect('/');
					})
				});
			} else {
				res.statusCode = 403;
				res.redirect('/login?error=true');
			}
		} catch(e) {
			console.error(`Error: could not authenticate user: ${e}`);
			res.statusCode = 403;
			res.redirect('/login?error=true');
		}
	});

	router.get('/logout', async (req, res, next) => {
		// clear the user from the session object and save.
		// this will ensure that re-using the old session id
		// does not have a logged in user
		await events.log(req.session.user, "Logged out");
		req.session.user = null;
		req.session.save((err) => {
			if(err) {
				next(err);
			}
			// regenerate the session, which is good practice to help
			// guard against forms of session fixation
			req.session.regenerate((err) => {
				if(err) {
					next(err);
				}
				res.redirect('/');
			})
		});
	});

	return router;
}

export function isAuthenticated(redirect) {
	return (req, res, next) => {
		if(req.session.user) {
			if(redirect) {
				res.redirect(redirect);
			} else {
				next();
			}
		} else {
			next('route');
		}
	}
}

export function createHasCapability(db, cap) {
	return async (req, res, next) => {
		if(req.session.user) {
			let users = db.getUsers();
			let user = await users.getUser(req.session.user);
			if(await user.hasCapability(cap)) {
				next();
			} else {
				next('route');
			}
		} else {
			next('route');
		}
	}
}


