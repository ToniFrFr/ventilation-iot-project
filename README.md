# IoT Project Server Side

This is the server side/fullstack implementation of the Internet of Things project. Developed by group 1.

## Server start

Create a .env file based on the example, where enviromental variables can be stored
Run the command `npm run start_server` in your  console on the root directory of the repository

## Routes
For files that are stored in the public folder as static files, use route /public/:foldername/:filename

For routes that effect the controller ie. settings, use /controller

## Database
Configure PGPASSWORD environment variable to use database. The 'pgcrypto' extension must also have been enabled prior to the first run.
```sql
CREATE EXTENSION pgcrypto;
```

## Development
Additional routes should be developed the same way as the controller.js router is developed, so develop the routes in a specific file, use module.export to export the router, and then include the router using require()

Example of this can be learned from controller.js router
