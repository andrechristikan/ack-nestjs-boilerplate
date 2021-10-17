# ##### LAST UPDATE DOCUMENT ON 30 AUG 2021 (ONGOING)
## Intro
Maybe usage documentation will difference with current source code. Will update ASAP.

<strong>KAFKA MODULE DOCUMENT NOT READY YET</strong><br>
<strong>USAGE DOCUMENTATION NOT READY YET</strong>
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

	Normally response can be filled with any data type, but in this project we will centralize response to `json object`. So we will consume `interceptor` from nestjs to centralize response. Response Interceptor will be 2 concepts.

	- Response Interceptor
		Response Interceptor will restructure response to standard response (general usage)

		For example we have response from controller like this

		```ts
		// Param of response must be path from message

		@Get('/hello')
		@Response('app.testHello') // <<<< do like this
		async testHello(): Promise<void> {
			return;
		}
		```

		Response will be like this
		```json
		{
			"username": "andre",
			"email": "andrechristikan@gmail.com"
		}
		```

		Then Response Interceptor will restructure to this

		```json
		{
			"statusCode": 200,
			"message": "success to get data from endpoint",
			"data": {
				"username": "andre",
				"email": "andrechristikan@gmail.com"
			}
		}
		```

		Response interceptor will use `MessageService` to get the message based on language path and `statusCode` will same with `Http Success Code`.

		Http Success Code will be rewrite with `HttpCode Decorator` from nestjs
		
		```ts
		// Param of response must be path from message

		@Get('/hello')
		@Response('app.testHello')
    	@HttpCode(HttpStatus.CREATED) // <<<< this will return 201 http code 
		async testHello(): Promise<void> {
			return;
		}

		```

		and response will be like this

		```json
		{
			"statusCode": 201,
			"message": "success to get data from endpoint",
			"data": {
				"username": "andre",
				"email": "andrechristikan@gmail.com"
			}
		}
		```

	- Response Paging Interceptor

		Same with Response Interceptor above, response paging interceptor will restructure response and this purpose interceptor will handle response with `data paging`.

		```ts
		@Get('/')
		@ResponsePaging('user.findAll')
		async findAll(
			@Query('page', new DefaultValuePipe(DEFAULT_PAGE), ParseIntPipe)
			page: number,
			@Query('perPage', new DefaultValuePipe(DEFAULT_PER_PAGE), ParseIntPipe)
			perPage: number
		): Promise<IResponsePaging> {
			const skip = await this.paginationService.skip(page, perPage);
			const users: UserDocument[] = await this.userService.findAll<UserDocument>(
				{},
				{
					limit: perPage,
					skip: skip
				}
			);
			const totalData: number = await this.userService.totalData();
			const totalPage = await this.paginationService.totalPage(
				totalData,
				perPage
			);

			return { // <<<< response must like this
				totalData,
				totalPage,
				currentPage: page,
				perPage,
				data: users
			};
		}
		```

		Response from controller must be same with `IResponsePaging` Interface.

		```ts
		// src/response/response.interface.ts

		export interface IResponsePaging {
			totalData: number;
			totalPage: number;
			currentPage: number;
			perPage: number;
			data: Record<string,any>[]
		}
		```

		Then, Response paging interceptor will restructure like this
		
		```json
		{
			"statusCode": 200,
			"totalData": 1,
			"totalPage": 1,
			"currentPage": 1,
			"perPage": 10,
			"message": "success to get data from endpoint",
			"data": [
				{
					"username": "andre1",
					"email": "andrechristikan1@gmail.com"
				},
				{
					"username": "andre2",
					"email": "andrechristikan2@gmail.com"
				}
			]
		}
		```

4. Mongoose to integrate with MongoDB

	`MongoDB` is one of popular no sql database. `Mongoose` is popular package to integrate between mongodb and nodejs. This project will use `@nestjs/mongoose` from `nestjs`. Database configuration will set in `database.config.ts`

	```ts
	// src/config/database.config.ts
	// process.env is env variable from .env file

	export default (): Record<string, any> => ({
		database: {
			srv: process.env.DATABASE_SRV || false,
			options: process.env.DATABASE_OPTIONS || '',
			host: process.env.DATABASE_HOST || 'localhost:27017',
			name: process.env.DATABASE_NAME || 'ack',
			user: process.env.DATABASE_USER || null,
			password: process.env.DATABASE_PASSWORD || null
		}
	});
	```

	Database configuration also put into `.env` for `dynamic configuration`
	
	```env
	DATABASE_SRV=false
	DATABASE_OPTION=
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
			"role": {
				"name": "admin",
				"permissions": [
					"UserCreate",
					"UserDelete",
					"UserRead",         
					"UserUpdate"
				]
			},
			"lastName": "test",
			
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
			@Body(RequestValidationPipe) data: UserCreateValidation // <<<< use like this
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

	Logger Service will write in files. Output path will in `/logs/*`.

	- Http Log

		Http Log will used `Morgan Package` to handle that and will write in day. This log will write and any incoming request into file.

		```
		└── logs
			└── http
				├── 2021-01-01.log
				└── 2021-01-02.log
		```

		with this format

		```
		':remote-addr' - ':remote-user' - '[:date[iso]]' - 'HTTP/:http-version' - '[:status]' - ':method' - ':url' - 'Request Header :: :req-headers' - 'Request Params :: :req-params' - 'Request Body :: :req-body' - 'Response Header :: :res[header]' - 'Response Body :: :res-body' - ':response-time ms' - ':referrer' - ':user-agent'
		```

		and for more information we can read [Morgan Docs](#acknowledgements)

	- System Log

		However typescript have console log to print any data and will write in temporary storage. But we won't like that, we want to write log into files, keep it, and sometimes we want to see the log. So base on this case, system log will help you to solve that case. 
		
		System Log will user `Winston Logger`. System Log will write log by day. System log will write the log into files and store file in `log/system/*`. 

		```
		└── logs
			└── system
				├── 2021-01-01.log
				└── 2021-01-02.log
		```

		and will return log like this. `Request id `will never same with other. `Request id will change every incoming request`.

		```json
		{
			"message": "message success",
			"level": "info",
			"requestId": "1627983261551por3y04a6mo74e6app6uxh",
			"timestamp": "2021-08-03T09:34:22.436Z"
		}
		```

		How to use System Log ? you can use system log with `LoggerService`. LoggerService already store into `Global`, so you can easily call the service just with decorator and `stop use console.log`.

		```ts
		// use @Logger decorator

		import { Logger as LoggerService } from 'winston';
		import { Logger } from 'src/logger/logger.decorator';

		@Controller('/user')
		export class UserController {
			constructor(
				@Logger() private readonly logger: LoggerService // <<<< call the service
			) {}

			@Get('/')
			async findAll(
			): Promise<void> {
				this.logger.info('message success'); // <<<< use like this
			}
		}
		```

	If you want to switch logger to off, simply you can change the setting in `src/config/app.config.ts` to `off`

	```ts
	export default (): Record<string, any> => ({
    	app: {
			logger: {
				http: {
					silent: false, // <<<< change this value to switch off the http logger
					maxFiles: 5,
					maxSize: '10M'
				},
				system: {
					silent: false, // <<<< change this value to switch off the http logger
					maxFiles: '7d',
					maxSize: '10m'
				}
			}
		}
	});
	```

12. Data Transformer with Class Transformer

	This project use `Class Transformer`. The purpose is transform data into `object plain` or `class` that we has created.

	```ts
	// src/user/transformer/user.transformer.ts

	export class UserTransformer {
		@Transform(({ value }) => {
			return `${value}`;
		})
		_id: string;

		@Transform(({ value }) => {
			const permissions: string[] = value.permissions.map(
				(val: Record<string, any>) => val.name
			);

			return {
				name: value.name,
				permissions: permissions
			};
		}, { toClassOnly: true })
		role: RoleDocumentFull;

		firstName: string;
		lastName: string;
		email: string;
		mobileNumber: string;

		@Exclude()
		password: string;

		@Exclude()
		__v: string;
	}
	```

	Example usage

	```ts
	// src/user/user.service.ts

	import { classToPlain, plainToClass } from 'class-transformer';

	async safeProfile(data: UserDocumentFull): Promise<Record<string, any>> {
        return classToPlain(plainToClass(UserTransformer, data));
    }
	```

	For the example, here example data before transform
	
	```json
	{
		"_id": "",
        "firstName": "admin",
        "email": "admin@mail.com",
        "mobileNumber": "08111111111",
        "password": "",
        "role": {
            "_id": "",
            "name": "admin",
            "permissions": [
                {
                    "_id": "",
                    "name": "UserCreate",
                    "isActive": true
                },
                {
                    "_id": "",
                    "name": "UserDelete",
                    "isActive": true
                },
                {
                    "_id": "",
                    "name": "UserRead",
                    "isActive": true
                },
                {
                    "_id": "",
                    "name": "UserUpdate",
                    "isActive": true
                }
            ],
            "isActive": true
        },
        "lastName": "test"
	}
	```

	and this data after transform
	
	```json
	{
		"_id": "60cc8db6ed2d8421b54700b7",
        "firstName": "admin",
        "email": "admin@mail.com",
        "mobileNumber": "08111111111",
        "role": {
            "name": "admin",
            "permissions": [
                "UserCreate",
                "UserDelete",
                "UserRead",
                "UserUpdate"
            ]
        },
        "lastName": "test"
	}
	```


13. Basic Token Auth with Decorator

	This project also provide `Basic Token` decorator to authorization basic token. For usage we can use like this

	```ts
	// src/app/app.controller.ts
	import { AuthBasicGuard } from 'src/auth/auth.decorator';

	@Get('/hello-basic')
    @HttpCode(HttpStatus.CREATED)
    @AuthBasicGuard() // <<<< this decorator will guard the endpoint with basic auth
    @Response('app.testHelloBasicToken')
    async testHelloBasicToken(): Promise<void> {
        return;
    }
	```


14. Encryption Response and Decryption Request with Decorator

	We can decrypt string with `@Decryption` Decorator and encrypt with `@Encryption` from `EncryptionModule`.

	For usage 

	```ts
	// src/encryption/encryption.controller.ts

	// Encryption
    @Get('/encrypt')
    @Encryption() // <<<< use like this
    async en(): Promise<IResponse> {
        return { message: this.messageService.get('encryption.en') };
    }

	// Decryption
	@Post('/decrypt-data')
    @Decryption() // <<<< use like this
    @HttpCode(HttpStatus.OK)
    async deData(@Body() body: Record<string, any>): Promise<IResponse> {
        return body;
    }
	```
