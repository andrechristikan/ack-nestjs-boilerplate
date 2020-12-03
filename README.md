<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="https://github.com/andrechristikan/ac.k">
    <img src="https://nestjs.com/img/logo-small.svg" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">AC.K</h3>

  <p align="center">
    An awesome nestJs boilerplate to jumpstart your projects!
    <br />
    <a href="https://github.com/andrechristikan/ac.k"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/andrechristikan/ac.k">View Demo</a>
    ·
    <a href="https://github.com/andrechristikan/ac.k/issues">Report Bug</a>
    ·
    <a href="https://github.com/andrechristikan/ac.k/issues">Request Feature</a>
  </p>
</p>



<!-- TABLE OF CONTENTS -->
## Table of Contents

* [About the Project](#about-the-project)
  * [Built With](#built-with)
* [Getting Started](#getting-started)
  * [Prerequisites](#prerequisites)
  * [Installation](#installation)
* [Usage](#usage)
* [Contributing](#contributing)
* [License](#license)
* [Contact](#contact)
* [Acknowledgements](#acknowledgements)



<!-- ABOUT THE PROJECT -->
## About The Project

Effortless. Lazy. Reuseable. That the motto for this boilerplate. <br>
I want to create a Boilerplate NestJs that base on components.

### Stack Spec
This section should list any major package usage for this boilerplate
* [NestJs](https://nestjs.com) - Common Framework.
* [Mongoose](https://github.com/nestjs/mongoose) - Package for integrating with the MongoDB database.
* [JsonWebToken](https://github.com/nestjs/jwt) - Authentication Package.


<!-- GETTING STARTED -->
## Getting Started

Folder structure will be like

```
	ac.k
	├── .dockerignore
	├── .env.example
	├── .eslintignore
	├── .eslintrc
	├── .gitignore
	├── .prettierrc 
	├── cspell.json
	├── docker-compose.yml 
	├── dockerfile 
	├── LICENSE.md
	├── nest-cli.json
	├── package.json
	├── README.md
	├── tsconfig.build.json
	├── tsconfig.build
	└── src
		├── app
		├── auth
		├── config
		├── database
		├── helper
		├── language
		├── middleware
		├── pipe
		├── response
		├── user
		└── main.ts
		 
```

### Prerequisites

Before start, we need to closing knowledge gaps and install some application (like Database, Package Manager, etc) 
* [MongoDB](#acknowledgements)
* [Mongoose](#acknowledgements)
* [NestJs](#acknowledgements)
* [Typescript](#acknowledgements)
* [JsonWebToken](#acknowledgements)
* [Passport](#acknowledgements)
* [ClassValidation](#acknowledgements)

### Installation

1. Clone the repo
```sh
git clone https://github.com/andrechristikan/ac.k.git ac.k
```
2. Install dependencies packages
```sh
yarn
```
3. Set our Environment. See example in file `.env.example`
4. Run app
```
yarn start:dev
```


<!-- USAGE EXAMPLES -->
## Usage

#### Env File
This env will be help you to setting this project.
```
# APP
APP_ENV=development
APP_URL=localhost
APP_PORT=3000
APP_LANGUAGE=en
APP_DEBUG=true

# DATABASE
DB_HOST=localhost:27017
DB_NAME=ack
DB_USER=
DB_PASSWORD=
```
Explain: 
- `APP_ENV` It's will help to maintenance for development and production environment. Default `development`.
- `APP_URL` Project Url. Default `localhost`.
- `APP_PORT` Project Port. Default `3000`.
- `APP_LANGUAGE` This project also support for multiple languages, so this is setting for project language . Default `en`.
- `APP_DEBUG` For debug purpose. Default `false`.
- `DB_HOST` Database Url.
- `DB_NAME` Database Name.
- `DB_USER` Database User, let it blank if you don't set the user.
- `DB_PASSWORD` Database Password, let it blank if you don't set the password.


#### Languages
Project support for multiple language. Default `en`. <br>
If we want to add a language. Just add new folder, in `src/language/resources`.

<img src="images/language/1.png?raw=true" width="20%" height="20%">
<br>
<br>

And don't forget to add the language to the language object `src/language/language.constant.ts`.
```ts
import en from 'language/resources/en';
import id from 'language/resources/id';

export default {
    en,
    id
};
```

#### Request Validation with ClassValidator
Here login rules validation for request.
```ts
import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class AuthLoginValidation {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}
```

And then, add 1 line in controller to implement that rules.
```ts
import { AuthLoginValidation } from 'auth/validation/auth.login.validation';
import { RequestValidationPipe } from 'pipe/request-validation.pipe';

...

@Post('/login')
async login(
    @Body(RequestValidationPipe(AuthLoginValidation)) data: ILogin
): Promise<IApiSuccessResponse> {}

...
```

The error message will set in `language/resource/${language}/request.ts`.
```ts
// $value
// $property
export default {
    default: 'Validation errors',
    maxLength: '$property has more elements than the maximum allowed.',
    minLength: '$property has less elements than the minimum allowed.',
    isString: '$property should be a type of string.',
    isNotEmpty: '$property cannot be empty.',
    isLowercase: '$property should be lowercase.'
};

```


#### Response in one gate
Response for the request will be set on one way. The response will set with `ResponseService`. This is default structure
```json
# Success Response
{
    "statusCode": 1000,
    "message": "blablalbalba",
    "data": {
        ...
    }
}
or
{
    "statusCode": 1000,
    "message": "blablalbalba"
}



# Error Response
{
    "statusCode": 1000,
    "message": "blablalbalba",
    "errors": {
        ...
    }
}
or
{
    "statusCode": 1000,
    "message": "blablalbalba"
}
```

This is how if we want to call it.
```ts
import { Response } from 'response/response.decorator';
import { ResponseService } from 'response/response.service';

export class UserController {
    constructor(
        @Response() private readonly responseService: ResponseService
    ) {}
}
```

This is how we use it.
```ts
import { Controller, Get } from '@nestjs/common';
import { AppService } from 'app/app.service';
import { ResponseService } from 'response/response.service';
import { IApiSuccessResponse } from 'response/response.interface';
import { Response } from 'response/response.decorator';
import { SystemSuccessStatusCode } from 'response/response.constant';

@Controller('/api/test')
export class AppController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        private readonly appService: AppService
    ) {}

    @Get('/')
    getHello(): IApiSuccessResponse {
        const message: string = this.appService.getHello();
        return this.responseService.success(SystemSuccessStatusCode.OK, {
            message
        });
    }
}
```


#### Authorization
The authorization are simple, just add 1 line `@UseGuards(xxx)`. Here an example
```ts
import {
    UseGuards,
} from '@nestjs/common';
import { JwtGuard } from 'auth/guard/jwt.guard';

...

@UseGuards(JwtGuard)
@Post('/create')
async create(
    @Body(RequestValidationPipe(UserCreateValidation)) data: IUserCreate
): Promise<IApiSuccessResponse> {

...
```

Here we get if we wont give `Bearer Token` in request header
```json
{
    "statusCode": 50002,
    "message": "Unauthorized Error."
}
```


#### Logger
We use morgan and winston for logger. <br>
All Request will write on log file in `/logs/http/YYYY-MM-DD.log` with format `':remote-addr' - ':remote-user' - '[:date[iso]]' - 'HTTP/:http-version' - '[:status]' - ':method' - ':url' - 'Request Header :: :req-headers' - 'Request Params :: :req-params' - 'Request Body :: :req-body' - 'Response Header :: :res[header]' - 'Response Body :: :res-body' - ':response-time ms' - ':referrer' - ':user-agent'`

Other logs will write in `/logs/system/default/YYYY-MM-DD.log`. This logger purpose for replace console log. Here how to call it.
```ts
import { Logger as LoggerService } from 'winston';
import { Logger } from 'middleware/logger/logger.decorator';

@Injectable()
export class ResponseService {
    constructor(
        @Logger() private readonly logger: LoggerService,
    ) {}
}

```

Here how to use that
```ts
this.logger.info('Success', response);
this.logger.error('Error', response);
this.logger.debug('Debug', response);
```


#### Error Handler


#### CRUD


#### Docker


<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


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
  * [TypeScript Documentation](https://www.typescriptlang.org/docs)
* Database
  * [MongoDb Documentation](https://docs.mongodb.com/manual)
  * [Mongoose Documentation](https://mongoosejs.com/docs/guide.html)
* Authorization Package
  * [Crypto Documentation](https://cryptojs.gitbook.io/docs/)
  * [Passport Documentation](https://github.com/jaredhanson/passport)
  * [Class Validation Documentation](https://github.com/typestack/class-validator#readme) 
* Testing
  * [JestJs](https://jestjs.io/docs/en/getting-started)
  * [SuperTest](https://github.com/visionmedia/supertest)
* Logger
  * [Winston Documentation](https://github.com/winstonjs/winston)
  * [Morgan Documentation](https://github.com/expressjs/morgan)
* Linter
  * [Prettier Documentation](https://prettier.io/docs/en/index.html)
  * [EsLint Documentation](https://eslint.org/docs/user-guide/getting-started)
* References
  * [NodeJs Best Practice Reference](https://github.com/goldbergyoni/nodebestpractices)
  * [NestJs Middleware Reference](https://github.com/wbhob/nest-middlewares)
  * [ReadMe Template](https://github.com/othneildrew/Best-README-Template)
* Other
  * [Class Validation Documentation](https://github.com/typestack/class-validator#readme) 
  * [Docker Documentation](https://docs.docker.com/)



[project-url]: https://github.com/andrechristikan/ac.k
[project-docs]: https://github.com/andrechristikan/ac.k
[project-issues]: https://github.com/andrechristikan/ac.k/issues/
[author-email]: mailto:andrechristikan@gmail.com
[author-linkedin]: https://id.linkedin.com/in/andre-christi-kan-6b5913143
[author-instagram]: https://www.instagram.com/___ac.k/