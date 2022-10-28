# IoT Project Server Side

This is the server side/fullstack implementation of the Internet of Things project. Developed by group 1.

## Server start

Create a .env file based on the example, where enviromental variables can be stored
Run the command `npm run start_server` in your  console on the root directory of the repository

## Routes
For files that are stored in the public folder as static files, use route /public/:foldername/:filename

For routes that effect the controller ie. settings, use /controller

## Database
In `scripts/db.bash` is an example deployment process to prepare a database for use with server.

Configure `.env` environment variables to use the database. The 'pgcrypto' extension must also have been enabled in the database prior to the first run.
```sql
CREATE EXTENSION pgcrypto;
```

