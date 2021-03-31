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

Effortless. Lazy. Reuseable. <br>
I want to create a Boilerplate NestJs that base on components.
This package build in NestJs, Mongoose, and MongoDB. 

<!-- GETTING STARTED -->
## Getting Started

Futures :
```
[x] Mongoose
[x] JWT Auth Implementation
[x] Basic Token Auth Implementation
[x] Local Auth With Email Implementation
[x] Config in YML File
[x] Request Validation With Pipe and Class Validation Package
[x] Support Class Transformer Package
[x] Centralize Response To Be JSON Object (Standard Open API 3.x)
[x] Hash Password With Bcrypt
[x] Support Multi-Language For Response Message
[~] Support Encryption Request and Response
[x] Middleware Rate Limit, Compression, Helmet, Cors, BodyParser, dst
[x] Server Side Pagination
[x] Support File Logging With Winston And Morgan Package
[x] Example For User and Login Component
[ ] Migration
[x] E2E Testing
[ ] Unit Testing
[~] Documentation
```

#### Folder Structure

```
	ac.k-boilerplate-nestjs-api
	├── .dockerignore
	├── .eslintignore
	├── .eslintrc
	├── .gitignore
	├── .prettierrc 
	├── config-example.yml
	├── cspell.json
	├── docker-compose.yml 
	├── dockerfile 
	├── LICENSE.md
	├── nest-cli.json
	├── nodemon.json
	├── package.json
	├── README.md
	├── tsconfig.build.json
	├── tsconfig.json
	├── test
		├── jest.json
	├── e2e
		├── jest.json
		├── auth
		├── user
	└── src
		├── app
		├── auth
		├── config
		├── database
		├── encryption
		├── hash
		├── language
		├── logger
		├── message
		├── middleware
		├── pagination
		├── pipe
		├── response
		├── status-code
		├── user
		└── main.ts
		 
```

### Prerequisites

Before start, we need to closing knowledge gaps and install some application (like Database, Package Manager, etc) 
* Framework: [NestJs](#acknowledgements)
* Database: [MongoDB](#acknowledgements)
* Package Manager: [Yarn](#acknowledgements)
* Common Package: [Mongoose](#acknowledgements)
* Other,.. see [acknowledgements](#acknowledgements)


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
  * [Class Validation Documentation](https://github.com/typestack/class-validator#readme) 
* Logger
  * [Winston Documentation](https://github.com/winstonjs/winston)
  * [Morgan Documentation](https://github.com/expressjs/morgan)
* Linter
  * [Prettier Documentation](https://prettier.io/docs/en/index.html)
  * [EsLint Documentation](https://eslint.org/docs/user-guide/getting-started)
* Package Manager
  * [Yarn Documentation](https://yarnpkg.com/getting-started)
* References
  * [NodeJs Best Practice Reference](https://github.com/goldbergyoni/nodebestpractices)
  * [NestJs Middleware Reference](https://github.com/wbhob/nest-middlewares)
* Other
  * [Class Validation Documentation](https://github.com/typestack/class-validator#readme) 
  * [Docker Documentation](https://docs.docker.com/)
  * [Docker Compose Documentation](https://docs.docker.com/compose/)



[project-url]: https://github.com/andrechristikan/ac.k
[project-docs]: https://github.com/andrechristikan/ac.k
[project-issues]: https://github.com/andrechristikan/ac.k/issues/
[author-email]: mailto:andrechristikan@gmail.com
[author-linkedin]: https://id.linkedin.com/in/andrechristikan
[author-instagram]: https://www.instagram.com/___ac.k/