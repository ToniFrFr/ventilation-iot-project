'use strict';

import * as pg from 'pg';
const { Pool } = pg.default;
// pg is not an ES6 module, so needs some massaging to function with import

const config = {
	database: 'iotproject',
	host: 'db.tikkanen.io',
	user: 'iotapi',
	// this object will be passed to the TLSSocket constructor
	ssl: {
		rejectUnauthorized: false,
	},
}

const pool = new Pool(config);

// the pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err);
	process.exit(-1);
});

async function authenticate_user(username, password) {
	const queryText = `
	SELECT (password = crypt($2, password))
	AS pswmatch
	FROM users
	WHERE username = $1;`;
	await pool.connect()
		.then((client) => {
			return client.query('BEGIN');
		})
		.then(() => {
			return client.query(queryText, [username, password]);
		})
		.then((res) => {
			return client.query('COMMIT'), res;
		})
		.then((res) => {
			if(res.rows.length() === 1) {
				return res.rows[0].pswmatch;
			}
			return false;
		})
		.catch(async (e) => {
			await client.query('ROLLBACK');
			throw e;
		})
		.finally(client.release());
}

async function get_user_caps(username) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const queryText = `
		SELECT * FROM capabilities
		WHERE username = $1;`
		const res = await client.query(queryText, [username]);
		await client.query('COMMIT');
		const caps = [];
		for(let i = 0; i < res.rows.length(); i++) {
			list.push(res.rows[i].capability);
		}
		return caps;
	} catch(e) {
		await client.query('ROLLBACK');
		throw e;
	} finally {
		client.release();
	}
}

