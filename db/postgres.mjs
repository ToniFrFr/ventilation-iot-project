'use strict';

//@ts-check

import * as pg from 'pg';
const { Pool } = pg.default;
// pg is not an ES6 module, so needs some massaging to function with import

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
	constructor(config) {
		this.pool = new Pool(config);
		// the pool will emit an error on behalf of any idle clients
		// it contains if a backend error or network partition happens
		this.pool.on('error', (err, client) => {
			console.error('Unexpected error on idle client', err);
			process.exit(-1);
		});
	}

	async init() {
		const usernameLenMax = 32;
		const capLenMax = 16;
		this.versions = await VersionsTable.getTable(this);
		await this.prepareTable(
			"users", [`
			CREATE TABLE IF NOT EXISTS users (
				username VARCHAR(${usernameLenMax}) NOT NULL UNIQUE PRIMARY KEY,
				password TEXT NOT NULL
			);`]);
		await this.prepareTable(
			"capabilities", [`
			CREATE TABLE IF NOT EXISTS capabilities (
				username VARCHAR(${usernameLenMax}) references users(username),
				capability VARCHAR(${capLenMax}) NOT NULL,
				PRIMARY KEY(username, capability)
			);`]);
		await this.prepareTable(
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
			);`,
			`
			ALTER TABLE measurements DROP CONSTRAINT measurements_pkey;
			ALTER TABLE measurements ADD COLUMN epoch SMALLINT;
			UPDATE measurements SET epoch = 0;
			ALTER TABLE measurements ADD PRIMARY KEY(epoch, nr);`,
			`
			ALTER TABLE measurements RENAME COLUMN temperature TO temp;`,
			`
			ALTER TABLE measurements ALTER COLUMN pressure TYPE DECIMAL(6, 1);
			ALTER TABLE measurements ALTER COLUMN temp TYPE DECIMAL(6, 1);
			ALTER TABLE measurements ALTER COLUMN rh TYPE DECIMAL(6, 1);
			ALTER TABLE measurements ALTER COLUMN speed TYPE DECIMAL(6, 1);`]);
		await this.prepareTable(
			"authentication_log", [`
			CREATE TABLE IF NOT EXISTS authentication_log (
				eventId SERIAL PRIMARY KEY,
				datetime TIMESTAMP WITH TIME ZONE,
				username VARCHAR(${usernameLenMax}) references users(username)
			);`,
			`
			ALTER TABLE authentication_log ADD COLUMN eventDesc VARCHAR(64);`]);
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

	async prepareTable(name, migrations) {
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
			} else if(ver > mlen) {
				console.error(`Table ${name} is newer than we are. Try updating to the latest release.`);
				throw new Error("Table version is newer than any known to the code.");
			} else {
				console.log(`Table ${name} is up to date`);
			}
		} catch(e) {
			console.error(`Could not prepare table ${name}`);
			throw e;
		}
	}

	getUsersTable() {
		return new UsersTable(this);
	}
	
	getMeasurementsTable() {
		return new MeasurementsTable(this);
	}
}

class UsersTable {
	constructor(db) {
		this.db = db;
	}

	async createUser(username, password) {
		const client = await this.db.pool.connect();
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

	async authenticateUser(username, password) {
		const queryText = `
		SELECT (password = crypt($2, password))
		AS pswmatch
		FROM users
		WHERE username = $1;`;
		const client = await this.db.pool.connect();
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

	async* getUserCaps(username) {
		const client = await this.db.pool.connect();
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

	async grantCap(username, capability) {
		await this.db.run(`
			INSERT INTO capabilities (username, capability)
			VALUES ($1, $2);`, [username, capability]);
	}
}

class MeasurementsTable {
	constructor(db) {
		this.db = db;
		this.epoch = 0;
	}

	async getEpoch() {
		return await this.db.run(`SELECT MAX(epoch) FROM measurements;`);
	}
	
	async getPreviousNr(epoch) {
		return await this.db.run(
			`SELECT MAX(nr) FROM measurements WHERE epoch = $1;`,
			[epoch]);
	}

	async saveSample(sample) {
		if(sample.nr < await this.getPreviousNr(await this.getEpoch())) {
			this.epoch++;
		}
		await this.db.run(`
			INSERT INTO measurements
			(epoch, nr, datetime, pressure, co2, temp, rh, speed, auto)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
			`, [this.epoch, sample.nr, sample.datetime, sample.pressure, sample.co2,
				sample.temp, sample.rh, sample.speed, sample.auto]);
	}

	async* getSamplesByNr(epoch, nr_low, nr_high) {
		const client = await this.db.pool.connect();
		try {
			await client.query('BEGIN');
			const queryText = `
			SELECT * FROM measurements
			WHERE epoch = $1 AND nr >= $2 AND nr <= $3;`
			const res = await client.query(queryText, [epoch, nr_low, nr_high]);
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

	async* getSamplesByTime(time_low, time_high) {
		const client = await this.db.pool.connect();
		try {
			await client.query('BEGIN');
			const queryText = `
			SELECT * FROM measurements
			WHERE datetime >= $1 AND datetime <= $2;`
			const res = await client.query(queryText, [time_low, time_high]);
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

