'use strict';

//@ts-check

import * as pg from 'pg';
const { Pool } = pg.default;
// pg is not an ES6 module, so needs some massaging to function with import

const usernameLenMax = 32;
const capLenMax = 16;

const prodConfig = {
	database: 'iotproject',
	host: 'db.tikkanen.io',
	user: 'iotapi',
	// this object will be passed to the TLSSocket constructor
	ssl: {
		rejectUnauthorized: false,
	},
}

const devConfig = {
	database: 'iotproject',
	host: 'localhost',
	user: 'iotapi'
}

class VersionsTable {
	constructor(db) {
		this.db = db;
	}

	static async getTable(db) {
		await db.run(`
			CREATE TABLE IF NOT EXISTS versions (
				name VARCHAR(20) NOT NULL UNIQUE PRIMARY KEY,
				version SMALLINT
			)`);
		return new VersionsTable(db);
	}

	async version(table) {
		const client = await this.db.pool.connect();
		try {
			await client.query('BEGIN');
			const res = await client.query(`
				SELECT * FROM versions WHERE name = $1;`, [table]);
			await client.query('COMMIT');
			if(res.rows.length === 1) {
				return res.rows[0].version;
			}
			return 0;
		} catch(e) {
			await client.query('ROLLBACK');
			throw e;
		} finally {
			client.release();
		}
	}
}

export class Postgres {
	constructor() {
		this.pool = new Pool(devConfig);
		// the pool will emit an error on behalf of any idle clients
		// it contains if a backend error or network partition happens
		this.pool.on('error', (err, client) => {
			console.error('Unexpected error on idle client', err);
			process.exit(-1);
		});
	}

	static async getDb() {
		const db = new Postgres();
		db.versions = await VersionsTable.getTable(db);
		await db.prepare_table(
			"users", [`
			CREATE TABLE IF NOT EXISTS users (
				username VARCHAR(${usernameLenMax}) NOT NULL UNIQUE PRIMARY KEY,
				password TEXT NOT NULL
			);`]);
		await db.prepare_table(
			"capabilities", [`
			CREATE TABLE IF NOT EXISTS capabilities (
				username VARCHAR(${usernameLenMax}) references users(username),
				capability VARCHAR(${capLenMax}) NOT NULL,
				PRIMARY KEY(username, capability)
			);`]);
		await db.prepare_table(
			"measurements", [`
			CREATE TABLE IF NOT EXISTS measurements (
				nr INT PRIMARY KEY,
				datetime TIMESTAMP WITH TIME ZONE,
				pressure SMALLINT,
				co2 SMALLINT,
				temperature SMALLINT,
				rh SMALLINT,
				speed SMALLINT,
				auto BOOLEAN
			);`]);
		await db.prepare_table(
			"authentication_log", [`
			CREATE TABLE IF NOT EXISTS authentication_log (
				eventId SERIAL PRIMARY KEY,
				datetime TIMESTAMP WITH TIME ZONE,
				username VARCHAR(${usernameLenMax}) references users(username)
			);`]);
		return db;
	}

	async run(queryText, args = []) {
		const client = await this.pool.connect();
		try {
			await client.query('BEGIN');
			await client.query(queryText, args)
			await client.query('COMMIT');
		} catch(e) {
			await client.query('ROLLBACK');
			throw e;
		} finally {
			client.release();
		}
	}

	async prepare_table(name, migrations) {
		try {
			const ver = await this.versions.version(name);
			const mlen = migrations.length;
			if(mlen > ver) {
				for(let i = ver; i < mlen; i++) {
					console.log(`Performing schema migration for table ${name} from version ${ver} to ${mlen}`);
					await this.run(migrations[i]);
					await this.run(`
						INSERT INTO versions VALUES ($1, $2)
						ON CONFLICT (name) DO UPDATE SET version = $2;
						`, [name, i + 1]);
				}
			} else {
				console.log(`Table ${name} is up to date`);
			}
		} catch(e) {
			console.error(`Could not prepare table ${name}`);
			throw e;
		}
	}

	async create_user(username, password) {
		const client = await this.pool.connect();
		try {
			await client.query('BEGIN');
			const queryText = `
			INSERT INTO users (username, password) 
			VALUES ($1, crypt($2, gen_salt($3)));`;
			await client.query(queryText, [username, password, "bf"]);
			await client.query('COMMIT');
		} catch(e) {
			await client.query('ROLLBACK');
			throw e;
		} finally {
			client.release();
		}
	}

	async authenticate_user(username, password) {
		const queryText = `
		SELECT (password = crypt($2, password))
		AS pswmatch
		FROM users
		WHERE username = $1;`;
		const client = await this.pool.connect();
		try {
			await client.query('BEGIN');
			const res = await client.query(queryText, [username, password]);
			await client.query('COMMIT');
			if(res.rows.length === 1) {
				return res.rows[0].pswmatch;
			}
			return false;
		} catch(e) {
			await client.query('ROLLBACK');
			throw e;
		} finally {
			client.release();
		}
	}

	async* get_user_caps(username) {
		const client = await this.pool.connect();
		try {
			await client.query('BEGIN');
			const queryText = `
			SELECT * FROM capabilities
			WHERE username = $1;`
			const res = await client.query(queryText, [username]);
			await client.query('COMMIT');
			for await(let row of res.rows) {
				yield row.capability;
			}
		} catch(e) {
			await client.query('ROLLBACK');
			throw e;
		} finally {
			client.release();
		}
	}

	async grant_cap(username, capability) {
		await this.run(`
			INSERT INTO capabilities (username, capability)
			VALUES ($1, $2);`, [username, capability]);
	}

	async save_sample(sample) {
		await this.run(`
			INSERT INTO measurements
			(nr, datetime, pressure, co2, temperature, rh, speed, auto)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
			`, [sample.nr, sample.datetime, sample.pressure, sample.co2, sample.temperature,
				sample.rh, sample.speed, sample.auto]);
	}

	async* get_samples(nr_low, nr_high) {
		const client = await this.pool.connect();
		try {
			await client.query('BEGIN');
			const queryText = `
			SELECT * FROM measurements
			WHERE nr >= $1 AND nr <= $2;`
			const res = await client.query(queryText, [nr_low, nr_high]);
			await client.query('COMMIT');
			for await(let row of res.rows) {
				yield row;
			}
		} catch(e) {
			await client.query('ROLLBACK');
			throw e;
		} finally {
			client.release();
		}
	}

}


