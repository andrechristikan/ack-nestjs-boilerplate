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
* [NestJs Fundamental](#acknowledgements), NodeJs Framework with support fully TypeScript.
* [NodeJs Fundamental](#acknowledgements), Package Manager.
* [MongoDB Fundamental](#acknowledgements), NoSQL Database
* [Typescript Fundamental](#acknowledgements).

#### Features

Features
- [x] Centralize Configuration
- [x] Centralize Exception
- [x] Centralize Response
- [x] Mongoose to integrate with MongoDB
- [x] JsonWebToken (JWT) as Guard, and JWT Decorator for Easy to Use.
- [x] Role and Permission Management with Decorator.
- [x] Hash Password with Bcrypt
- [x] Database Migration with nestjs-command
- [x] Language Management, and Support Different Language
- [x] Request Validation with Class Validation
- [x] Logger Service will write in files and can switch to on/off
- [x] Data Transformer with Class Transformer
- [x] Basic Token Auth with Decorator
- [x] Encryption Response and Decryption Request with Encryption Decorator
- [x] Support Docker

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

1. Change Setting and Environment in file `docker-compose.yml` and `initdb/init-mongo.js`. Make sure the setting is correct.
2. Don't to rename `.env.example` to `.env` and change the environment.
3. Run `docker-compose up`, and to shutdown run `docker-compose down`. Docker compose will build 2 containers. App Container named `ack`, and Mongodb Container named `mongodb`.
4. Run database migration `docker exec -i ack sh -c 'yarn migrate'` to rollback run `docker exec -i ack sh -c 'yarn migrate:rollback'`
5. Test. For unit testing we need to run `docker exec -i ack sh -c 'yarn test'` and
for e2e testing we need to run `docker exec -i ack sh -c 'yarn test:e2e'`.


#### Usage
In this section will explain details base on `features` sections.

1. Centralize Configuration. 
	
	This project used `@nestjs/config` module to manage all configuration. All Configuration set in `src/config/*` and stored in `global configs` because `@nestjs/config` imported into `AppModule`. So if we want to change the settings, just simply change the value from `some config file` in `src/config/*` and then the config will change. <br>
	If we need `dynamic configuration` i suggest to put the config in `.env` for easy maintenance.
	
	For example we will create `AppConfig`. 

	 - Add variable and value into `.env` file in root dir. 

		```env
		APP_ENV=development
		APP_HOST=localhost
		APP_PORT= 3000
		APP_LANGUAGE=en
		APP_DEBUG=false
		```
	
	- Create `AppConfig` into `src/config/` and use `process.env.YOUR_ENV_KEY` to get env value if necessary.

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
			}
		});
		```
	
	- Then, add `AppConfig` into `src/config/index.ts`

		```ts
		// src/config/index.ts
		// Add new config into index.ts

		import AppConfig from 'src/config/app.config';

		export default [
			AppConfig, // <<<< add here
		];

		```

	- Just information, after add `AppConfig` into `index.ts`, app configs will store into `global config` because `@nestjs/config` imported into `AppModule`
	
		```ts
		// src/app/app.module.ts

		@Module({
			controllers: [AppController],
			providers: [],
			imports: [
				MiddlewareModule,
				ConfigModule.forRoot({ // <<<< config module imported into AppModule 
					load: Configs,
					ignoreEnvFile: false,
					isGlobal: true,
					cache: true
				}),
			]
		})
		export class AppModule {}

		```
	
	- If we want to use `AppConfig`. Just use `ConfigService` as service and don't need to import `ConfigModule` into `OtherModule` because all configs already stored into `global configs`. For example we will get `http host` from `ConfigService`
	
		```ts
		// path base on setting object path

		// file src/config/app.config.ts
		// app: {
		//		http: {
		//			host: process.env.APP_HOST || 'localhost',
		//		},
		// }

		const host: string = this.configService.get<string>('app.http.host'); // will return `localhost`
		
		```


2. Centralize Exception

	This project consume `Exception Filter` from `NestJs`. The Exception Filter will named as `ResponseFilter`. ResponseFilter will restructured the error response.

	Response interface will like
	```json
	// <<<< errors is for error request from RequestValidationPipe, and optional (not always shown)

	{
		"statusCode": 200,
		"message": "error message",
		"errors" : [ 
			{
				"message": "property request message",
				"property": "property request field"
			}
		]
	}
	```

	Usage
	```ts
	// use any http exception from nestjs for error exception

	throw new BadRequestException( 
		this.messageService.get('auth.error.passwordNotMatch') 
	);

	// or

	// errors must in array of object
	const errors: Record<string,any>[] = [
		{
			message: "property request message",
			property: "property request field"
		}
	];
	
	throw new BadRequestException( 
		errors,
		this.messageService.get('auth.error.passwordNotMatch') 
	);
	```

3. Centralize Response

4. Mongoose to integrate with MongoDB

	`MongoDB` is one of popular no sql database. `Mongoose` is popular package to integrate between mongodb and nodejs. This project use `@nestjs/mongoose` from `nestjs`. Database configuration will set in `database.config.ts`

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

	Database configuration also put into `.env` for `dynamic configuration`
	
	```env
	DATABASE_HOST=localhost:27017
	DATABASE_NAME=ack
	DATABASE_USER=
	DATABASE_PASSWORD=
	```

5. JsonWebToken (JWT) as Guard, and JWT Decorator for Easy to Use.

	NestJs have `@nestjs/jwt` to use JWT. As mention in official documents `@nestjs/jwt` can combine with `@nestjs/passport` to use as Guard. For usage we will use JWT Decorator.
	
	Here example for use JWT Decorator in controller.

	```ts
	// src/user/user.controller.ts
	// Use the JWT Decorator

	@AuthJwtGuard() // <<<< use like this, and this endpoint will implement JWT
    @Get('/')
    async findAll(): Promise<IResponsePaging> {}

	```

	And here example response if we don't provide `Bearer $token` in header.

	```json
	{
		"statusCode": 401,
		"message": "Unauthorized"
	}
	```


6. Role and Permission Management.

	For simplest usage this project designed `PermissionGuard` or `Permission Decorator` as guard for endpoints.
	Usage, we must tu use with `JWT` because `PermissionGuard` will consume `JWT Payload` to get Role and Permission and then with `PermissionGuard`


	Imagine we have endpoint that has `PermissionGuard` with `UserRead Permission` and then user that has `Admin Role`. `AdminRole` has `UserRead`, `UserAdd`, `UserUpdate`, and `UserDelete` permissions. 

	```ts
	// src/user/user.controller.ts
	// PermissionList is Enum of permissions
	// This endpoint used PermissionGuard and only user that have UserRead Permission can access

    @Get('/')
	@AuthJwtGuard() 
    @Permissions(PermissionList.UserRead) // <<<< use like this
    async findAll(): Promise<IResponsePaging> {}
	```

	- Permission List
	
		```ts
		// src/permission/permission.constant.ts

		export enum PermissionList {
			UserCreate = 'UserCreate',
			UserUpdate = 'UserUpdate',
			UserRead = 'UserRead',
			UserDelete = 'UserDelete',
		}
		```
	
	- JWT Payload
	
		```json
		{
			"_id": "60cc8db6ed2d8421b54700b7",
			"firstName": "admin",
			"email": "admin@mail.com",
			"mobileNumber": "08111111111",
			"role": "admin",
			"lastName": "test",
			"permissions": [
				"UserCreate",
				"UserDelete",
				"UserRead",         
				"UserUpdate"
			]
		}
		```

7.  Hash Password with Bcrypt
	
	Bcrypt will included in `HashModule` and `HashModule` will set as `Global`. Because of that we don't need to import to other module. 

	```ts
	// src/auth/auth.service.ts

	@Injectable()
	export class AuthService {
		constructor(@Hash() private readonly hashService: HashService) {} // <<<< call like this

		async validateUser(
			passwordString: string,
			passwordHash: string
		): Promise<boolean> {
			return this.hashService.bcryptComparePassword( // <<<< use like this
				passwordString,
				passwordHash
			);
		}
	}

	```

8. Database Migration with nestjs-command

	For database migration this project used `Nestjs-command`. The target just for initial purpose.

	We can run migration with command
	```sh
	yarn migrate

	-OR-

	npm run migrate
	```

	Or we if want to rollback, we can run
	```sh
	yarn migrate:rollback

	-OR

	npm run migrate:rollback
	```

	`Migrate` script will execute `nestjs-command create:permission && nestjs-command create:role && nestjs-command create:user`
	
	`Migrate:rollback` will execute `nestjs-command remove:user && nestjs-command remove:role && nestjs-command remove:permission`. 
	
	Those script in `package.json` we can change that if necessary and details about database migration should in `src/database/seeds/*`

	Example
	
	```ts
	import { Command } from 'nestjs-command';
	import { Injectable } from '@nestjs/common';
	import { PermissionService } from 'src/permission/permission.service';
	import { PermissionList } from 'src/permission/permission.constant';

	@Injectable()
	export class PermissionSeed {
		constructor(
			private readonly permissionService: PermissionService
		) {}

		@Command({
			command: 'create:permission',
			describe: 'insert permissions',
			autoExit: true
		})
		async create(): Promise<void> {
			const permissions = Object.keys(PermissionList).map((val) => ({
				name: val
			}));
			await this.permissionService.createMany(permissions);
		}

	}
	```

9. Language Management, and Support Different Language

	The default of language is `En`. All languages will manage with `MessageModule` and store in `Global`.

	- Usage the language with `MessageModule`

		```ts
		// src/app/app.controller.ts

		import { MessageService } from 'src/message/message.service';
		import { Message } from 'src/message/message.decorator';

		export class AppController {
			constructor(
				@Message() private readonly messageService: MessageService, // <<<< call the service
			) {}

			@Get('/hello')
			async testHello(): Promise<IResponse> {
				const message: string = this.messageService.get('app.testHello'); // <<<< then use like this
			}
		}
		```

		```ts
		// src/message/languages/en/app.ts

		export default {
			testHello: 'This is test endpoint.', // <<<< we call this
		};
		```

		If we need to change the message, just simply change the value.

	
	- Example if we want to change the app language, we must to change config in `src/config/app.config.ts`

		```ts
		// src/config/app.config.ts
		// if we need to change the language

		export default (): Record<string, any> => ({
			app: {
				language: process.env.APP_LANGUAGE || 'en', // <<<< change this 
			}
		});
		```

		and then after change the config, we need to add resource of Language in `src/message/languages/*`. 

		```
		languages
		└── en
			├── app.ts
			└── index.ts
		```	

		```ts
		// src/message/languages/en/app.ts

		export default {
			testHello: 'This is test endpoint.',
			testHelloBasicToken:
				'This is test endpoint with basic token and manipulate HTTP Code to 201.'
		};
		```

		```ts
		// src/message/languages/en/index.ts
		
		import app from './app';

		export default {
			app,
		};
		```

		then, add the new language into `message.constant.ts`
		
		```ts
		// src/message/message.constant.ts

		import en from 'src/message/languages/en';

		export default {
			en
		};
		```

10. Request Validation with Class Validation

	This project Combine `class-validator` with `Nestjs Pipe` for create `Request Validation Pipe`. `Request Validation Pipe` use for validate request incoming before get into endpoint. `Request Validation Pipe` need a `Validation Schema` to run.

	- User Create Endpoint

		```ts
		// src/user/user.controller.ts
		// UserCreateValidation is Validation Schema

		@Post('/create')
		async create(
			@Body(RequestValidationPipe(UserCreateValidation)) // <<<< use like this
			data: Record<string, any>
		): Promise<IResponse> {}
		```

	- User Create Validation Schema

		```ts
		// src/user/validation/user.create.validation.ts

		export class UserCreateValidation {
			@IsEmail()
			@IsNotEmpty()
			@MaxLength(100)
			readonly email: string;

			@IsString()
			@IsNotEmpty()
			@MinLength(3)
			@MaxLength(30)
			readonly firstName: string;

		}
		```

	- We also can change return message while error. File in `src/message/languages/en/request.ts`. 

		```ts
		// src/message/languages/en/request.ts

		// $value: string replace for value
		// $property: string replace for property name

		export default {
			default: 'Validation errors',
			maxLength: '$property has more elements than the maximum allowed.',
			minLength: '$property has less elements than the minimum allowed.',
			isString: '$property should be a type of string.',
		};
		```

11. Logger Service will write in files and can switch to on/off
12. Data Transformer with Class Transformer
13. Basic Token Auth with Decorator
14. Encryption Response and Decryption Request with Encryption Decorator
15. Support Docker

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
