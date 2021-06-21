<!-- TABLE OF CONTENTS -->
## Table of Contents

* [About the Project](#about-the-project)
  * [Built With](#built-with)
* [Getting Started](#getting-started)
  * [Prerequisites](#prerequisites)
* [License](#license)
* [Contact](#contact)
* [Acknowledgements](#acknowledgements)


<!-- ABOUT THE PROJECT -->
## About The Project

NestJs Boilerplate with Mongoose and MongoDB as Database. <br>
Boilerplate provide example about JWT implementation, basic CRUD with mongoose (populate indeed), Role/Permission implementation, etc.<br>

This project will follow [nodejs-best-practice](nodejs-best-practice) as benchmark and NestJs Habit, can run with Docker, or without Docker.<br>
*Database migration for initial purpose.*

<!-- GETTING STARTED -->
## Getting Started
Before start, we need to closing knowledge gaps and install some application (like Framework, Write Style, Database, Package Manager, etc).

#### Prerequisites
* [NestJs](#acknowledgements) NodeJs Framework with support fully TypeScript.
* [Yarn](#acknowledgements) Package Manager.
* [MongoDB](#acknowledgements) NoSQL Database
* [Mongoose](#acknowledgements) Database Package for MongoDB and NodeJs

#### Features

Features
- [x] Used Mongoose to connect with MongoDB
- [x] JsonWebToken (JWT)
- [x] Basic Token Auth
- [x] Role Management with Permission
- [x] Password Hah with Bcrypt
- [x] Database Migration with nestjs-command
- [x] Encryption Response with Encryption Decorator
- [x] Logger Service will write in files.
- [x] Request Validation with Class Validation
- [x] Support Different Language
- [x] Centralize Configs, Response, and Error Handler
- [x] Response Transformer Restructure with Class Transformer
- [~] Support Docker for Run or Installation Project

Middleware
- [x] Rate Limit
- [x] Compression
- [x] Helmet
- [x] Cors
- [x] BodyParser
- [x] Cors

Testing
- [ ] E2E Testing
- [ ] Unit Testing

Services
- [x] Login Service
- [x] Hash Service
- [x] User Service
- [x] Role Service
- [x] Permission Service

Example
- [x] Give example for Server Side Pagination
- [x] Give example for Simple CRUD

Documentation
- [~] Readme Documentation


#### Run Project
Assume we have already install all prerequisites.
##### With your environment
	
1. We need to install all dependencies.

	```
	yarn

	-OR-

	npm i
	```

2. Create `.env` file base on `.env.example`. Simply, *rename .env.example to .env*. And don't forget to change setting with your.

3. To run this project, you can choose what you want. 

	```
	yarn start

	-OR-

	npm run start
	```
	If you want to watch all changes, just run `yarn start:dev` or `npm run start:dev`.


4. Run database migration for initial purpose

	```
	yarn migrate
	
	-OR-

	npm run migrate
	```
	
	if we need to rollback, just run
	
	```
	yarn migrate:rollback
	
	-OR-
	
	npm run migrate:rollback
	```

	*becareful with rollback function, this will remove all data from collection, no matter what*

5. After running, we need to test and make sure that project is run as well or not. This project will provide 2 test *unit testing* and *e2e testing*.

	For unit testing we need to run 
	```
	yarn test
	
	-OR-
	
	npm run test
	```

	For e2e testing we need to run 
	
	```
	yarn test:e2e
	
	-OR-
	
	npm run test:e2e
	```

##### OPTIONAL -- Run with docker
Why we should to use docker container? Because Docker containers encapsulate everything an application needs to run (and only those things), they allow applications to be shuttled easily between environments. Its will help us to solve application dependency between environments. *Ref Docker Docs*

1. Change Setting and Environment in file `docker-compose.yml` and `initdb/init-mongo.js`.
2. Don't to rename `.env.example` to `.env` and change the environment.
3. Run `docker-compose up`, and to shutdown run `docker-compose down`. Docker compose will build 2 containers. App Container named `ack`, and Mongodb Container named `mongodb`.
4. Run database migration `docker exec -i ack sh -c 'yarn migrate'` to rollback run `docker exec -i ack sh -c 'yarn migrate:rollback'`
5. Test. For unit testing we need to run `docker exec -i ack sh -c 'yarn test'` and
for e2e testing we need to run `docker exec -i ack sh -c 'yarn test:e2e'`.


#### Usage
In this section i'll explain details base on `features` section.

1. a
2. b
3. c

#### Endpoints
All endpoints in [endpoints.json](endpoints.json) and need import to PostMan. [Follow this step for import into Postman](https://learning.postman.com/docs/getting-started/importing-and-exporting-data/)

#### Folder Structure

```
nestjs-boilerplat-mongoose
├── .env.example
├── .eslintignore
├── .eslintrc
├── .gitignore
├── .prettierrc
├── .cspell.json
├── docker-compose.yml 
├── dockerfile 
├── endpoints.json 
├── LICENSE.md
├── nest-cli.json
├── nodemon.json
├── package.json
├── README.md
├── tsconfig.build.json
├── tsconfig.json
├── yarn.lock
├── test/
├── e2e/
└── src
	├── app/
	├── auth/
	├── config/
	├── database/
	├── encryption/
	├── hash/
	├── logger/
	├── message/
	├── message/
	├── middleware/
	├── pagination/
	├── permission/
	├── pipe/
	├── response/
	├── role/
	├── user/
	└── cli.ts
	└── main.ts
		 
```


<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE.md` for more information.


<!-- CONTACT -->
## Contact

Andre Christi Kan 
* [andrechristikan@gmail.com](author-email) - Email
* [Andrechristikan](author-linkedin) - Linkedin
* [@___ac.k](author-instagram) - Instagram


<!-- ACKNOWLEDGEMENTS -->
## Acknowledgements
* Framework and languages
  * [NestJs Documentation](https://docs.nestjs.com)
  * [NodeJs Documentation](https://nodejs.org/en/docs)
  * [TypeScript Documentation](https://www.typescriptlang.org/docs)
* Database
  * [MongoDb Documentation](https://docs.mongodb.com/manual)
  * [Mongoose Documentation](https://mongoosejs.com/docs/guide.html)
* Authorization Package
  * [Crypto Documentation](https://cryptojs.gitbook.io/docs/)
  * [Passport Documentation](https://github.com/jaredhanson/passport)
  * [Bcrypt Documentation](https://www.npmjs.com/package/bcrypt#readme) 
* Logger
  * [Winston Documentation](https://github.com/winstonjs/winston)
  * [Morgan Documentation](https://github.com/expressjs/morgan)
* Linter
  * [Prettier Documentation](https://prettier.io/docs/en/index.html)
  * [EsLint Documentation](https://eslint.org/docs/user-guide/getting-started)
* Package Manager
  * [Yarn Documentation](https://yarnpkg.com/getting-started)
* Other Package
  * [Class Validation Documentation](https://github.com/typestack/class-validator#readme) 
  * [Class Transformer Documentation](https://github.com/typestack/class-transformer#readme) 
  * [Docker Documentation](https://docs.docker.com/)
  * [Docker Compose Documentation](https://docs.docker.com/compose/)
* Other References
  * [NodeJs Best Practice Reference](nodejs-best-practice)
  * [NestJs Middleware Reference](https://github.com/wbhob/nest-middlewares)



[project-url]: https://github.com/andrechristikan/nestjs-boilerplate-mongoose
[author-email]: mailto:andrechristikan@gmail.com
[author-linkedin]: https://id.linkedin.com/in/andrechristikan
[author-instagram]: https://www.instagram.com/___ac.k/
[nodejs-best-practice]: https://github.com/goldbergyoni/nodebestpractices