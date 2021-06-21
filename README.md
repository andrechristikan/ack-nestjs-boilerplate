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
Boilerplate provide example about JWT implementation, basic CRUD with mongoose (include populate and deep populate), Role/Permission implementation, Interceptor, Exception Filter, Custom Pipe, etc.<br>

This project will follow [nodejs-best-practice](nodejs-best-practice) as benchmark and NestJs Habit. <br>
We can run with Docker, or without Docker.<br>
*Database migration for initial purpose.*

<!-- GETTING STARTED -->
## Getting Started
Before start, we need to closing knowledge gaps and install some application (like Framework, Write Style, Database, Package Manager, etc).

#### Prerequisites
* [NestJs Fundamental](#acknowledgements) NodeJs Framework with support fully TypeScript.
* [NodeJs Fundamental](#acknowledgements) Package Manager.
* [MongoDB Fundamental](#acknowledgements) NoSQL Database
* [Typescript Fundamental](#acknowledgements).

#### Features

Features
- [x] Centralize Configuration
- [x] Mongoose Package as connector to MongoDB
- [x] JsonWebToken (JWT)
- [x] Role Management with Permission
- [x] Password Hah with Bcrypt
- [x] Database Migration with nestjs-command
- [x] Request Validation with Class Validation
- [x] Logger Service will write in files.
- [x] Response Transformer Restructure with Class Transformer
- [x] Basic Token Auth
- [x] Encryption Response with Encryption Decorator
- [x] Support Different Language
- [x] Support Docker for Run or Installation Project

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
- [ ] Readme Documentation


#### Run Project
Please install [NodeJs (>= 10.13.0, except for v13)](https://nodejs.org/en/) and [Yarn](https://yarnpkg.com/getting-started/install) before we start.

Then install `Nestjs CLI`
```sh
npm i -g @nestjs/cli
```

Clone this project and let start it
##### With your environment
	
1. We need to install all dependencies.

	```
	yarn

	-OR-

	npm i
	```

2. Create `.env` file base on `.env.example`. Simply, *rename .env.example to .env*. And don't forget to change setting with your.

3. To run this project. 

	```
	yarn start

	-OR-

	npm run start
	```
	If we want to watch all changes, just run `yarn start:dev` or `npm run start:dev`.


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

1. Centralize Configuration. 
	
	This project used `@nestjs/config` Module or we can called `ConfigModule` to manage all configuration. All Configuration set in `src/config/*` and stored in *Global Variable*. <br>
	If we have some dynamic configuration i suggest to put the configuration in `.env` for easy maintenance. For example create `AppConfig`.

	Env file - we have some dynamic configuration for `AppConfig`.

	```env
	APP_ENV=development
	APP_HOST=localhost
	APP_PORT= 3000
	APP_LANGUAGE=en
	APP_DEBUG=false
	```
	
	Config example - Configs in `src/config/` and use `process.env.YOUR_ENV_KEY` to get your env value.

	```ts
	// src/config/app.config.ts
	// process.env is env variable from .env file

	export default (): Record<string, any> => ({
		app: {
			env: process.env.APP_ENV || 'development',
			language: process.env.APP_LANGUAGE || 'en',
			debug: process.env.APP_DEBUG === 'true' ? true : false,
			http: {
				host: process.env.APP_HOST || 'localhost',
				port: parseInt(process.env.APP_PORT) || 3000
			},
			logger: {
				http: {
					silent: true,
					maxFiles: 5,
					maxSize: '10M'
				},
				system: {
					silent: true,
					maxFiles: '7d',
					maxSize: '10m'
				}
			}
		}
	});
	```
	
	Add new config to `index.ts`.

	```ts
	// src/config/index.ts
	// Add new config into index.ts

	import AppConfig from 'src/config/app.config';

	export default [
		AppConfig, // <<<<
	];

	```

	If we want to use `ConfigModule`. We must to import `ConfigService` to other service like Nestjs Habit.

	```ts
	// src/database/database.service.ts

	import { ConfigService } from '@nestjs/config';

	@Injectable()
	export class DatabaseService implements MongooseOptionsFactory {
    	constructor(private readonly configService: ConfigService) {}

    	createMongooseOptions(): MongooseModuleOptions {

			const baseUrl = `${this.configService.get<string>('database.host')}`; // <<<<
			const databaseName = this.configService.get<string>('database.name'); // <<<<

			...
			...
			...

		}
	}
	```

	Note we don't need to import `ConfigModule` into other module. For example here is `DatabaseModule`

	```ts
	// src/database/database.module.ts
	// We don't need import ConfigModule

	import { Module } from '@nestjs/common';
	import { DatabaseService } from 'src/database/database.service';

	@Module({
		providers: [DatabaseService],
		exports: [DatabaseService],
		imports: [
			// don't import ConfigModule
		]
	})
	export class DatabaseModule {}

	```

2. Mongoose Package to integrate with MongoDB

	`MongoDB` is one of most popular no sql database, and popular package to integrate mongodb and nodejs is `mongoose`. This project use `@nestjs/mongoose` from `nestjs`. Database configuration will set in `databse.config.ts`

	```ts
	// src/config/database.config.ts
	// process.env is env variable from .env file

	export default (): Record<string, any> => ({
		database: {
			host: process.env.DATABASE_HOST || 'localhost:27017',
			name: process.env.DATABASE_NAME || 'ack',
			user: process.env.DATABASE_USER || null,
			password: process.env.DATABASE_PASSWORD || null
		}
	});
	```

	This project also put env value into `DatabaseConfig` too
	
	```env
	DATABASE_HOST=localhost:27017
	DATABASE_NAME=ack
	DATABASE_USER=
	DATABASE_PASSWORD=
	```

3. JsonWebToken (JWT) as Guard, and JWT Decorator for Easy to Use JWT

	Nest have `@nestjs/jwt` to use JWT. As mention in official documents `@nestjs/jwt` can combine with `@nestjs/passport` to use as Guard.
	
	This project provide JWT Decorator for Easy to Use JWT.
	Here example for use JWT Decorator in controller.

	```ts
	// src/user/user.controller.ts
	// Use the JWT Decorator

	@AuthJwtGuard() // <<<< 
    @Get('/')
    async findAll(): Promise<IResponsePaging> {
        
		...
		...
		...

    }

	```

	And here example response if we don't provide `Bearer $token` in header.

	```json
	{
		"statusCode": 401,
		"message": "Unauthorized"
	}
	```


4. Role, and Permission Management use with Decorator.

	Usage in controller. You must add `@Permissions(PERMISSION_LIST)` upper of function.
	```ts
	// src/user/user.controller.ts
	// PermissionList is Enum of permissions
	// Jwt is must because this project will extract payload to get the Role and will compare with Permission Collection

	@AuthJwtGuard() 
    @Permissions(PermissionList.UserRead) // <<<<
    @Get('/')
    async findAll(): Promise<IResponsePaging> {
        
		...
		...
		...

    }
	```
	
	Here payload data
	
	```json
	{
		"_id": "60cc8db6ed2d8421b54700b7",
        "firstName": "admin",
        "email": "admin@mail.com",
        "mobileNumber": "08111111111",
        "role": "admin",
        "lastName": "test"
	}
	```

	And here structure data about role and permission collection.

	* Role Collection
	
	```json 
	{
		"_id" : ObjectId("60cc8dad2f1eba21ad146043"),
		"name" : "admin",
		"permissions" : [ 
			ObjectId("60cc8da9c7ecfc21ac66b1ba"), 
			ObjectId("60cc8da9c7ecfc21ac66b1bd"), 
			ObjectId("60cc8da9c7ecfc21ac66b1bc"), 
			ObjectId("60cc8da9c7ecfc21ac66b1bb"), 

			...
			...
			...

		],
		"isActive" : true
	}
	```

	* Permission Collection
	```json
	{
		"_id" : ObjectId("60cc8da9c7ecfc21ac66b1b0"),
		"name" : "UserCreate",
		"isActive" : true
	}

	{
		"_id" : ObjectId("60cc8da9c7ecfc21ac66b1b1"),
		"name" : "UserUpdate",
		"isActive" : true
	}

	{
		"_id" : ObjectId("60cc8da9c7ecfc21ac66b1b2"),
		"name" : "UserRead",
		"isActive" : true
	}

	...
	...
	...

	```

	As we can see, role has permissions field that filled by permission object id.


5. Password Hah with Bcrypt
	For hash password string this project used Bcrypt. We can use with `HashModule`. `HashModule` will in Global Variable so we don't need to import that to each module. For example we want to `HashModule into AuthModule`

	```ts
	// src/auth/auth.module.ts
	// We don't need to import HashModule

	@Module({
		providers: [AuthService, JwtStrategy],
		exports: [AuthService],
		controllers: [AuthController],
		imports: [UserModule] // <<<<
	})
	export class AuthModule {}

	```


	```ts
	// src/auth/auth.service.ts
	// Use @Hash Decorator to inject into module

	@Injectable()
	export class AuthService {
		constructor(
			@Hash() private readonly hashService: HashService // <<<<
		) {}

	}

	```

6. Database Migration with nestjs-command
7. Request Validation with Class Validation
8. Logger Service will write in files.
9. Centralize Response and Response Transformer Restructure with Class Transformer
10. Basic Token Auth
11. Encryption Response with Encryption Decorator
12. Support Different Language
13. Support Docker for Run or Installation Project

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
