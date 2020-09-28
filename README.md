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

There are many great Boilerplate NestJs for Restful API available on GitHub, however, I didn't find one that really suit my needs so I created this enhanced one. I want to create a Boilerplate NestJs that it'll be the last one you ever need.

Here's why:

    [x] MongoDB as The Database
    [x] Config in File *.env*
    [x] Support for Multi language
    [x] Request Validation with Joi
    [x] Pagination on Server Side
    [x] HmacSHA512 as Password Encryption with Crypto
    [ ] JWT as Authorization with JsonWebToken
    [ ] Blacklist JWT Token
    [x] Handle Errors Centrally and Easily for Maintenance Our Error Code 
    [x] Logger in File (day by day) with Winston
    [x] Logger Http Request in File (day by day) with Morgan
    [x] EsLint as Linter
    [x] Prettier as Formatter
    [ ] User Settings on Database
    [ ] Master Setting on Database
    [ ] Database Migration
    [ ] Docker
    [x] CRUD Example

Of course, no one boilerplate will serve all projects since your needs may be different. So I'll be adding more in the near future. You may also suggest changes by forking this repo and creating a pull request or opening an issue.

A list of commonly used resources that I find helpful are listed in the acknowledgements.

### Built With
This section should list any major package usage for this boilerplate
* [NestJs](https://nestjs.com) - Common Framework.
* [Mongoose](https://github.com/nestjs/mongoose) - Package for integrating with the MongoDB database.
* [Crypto](https://github.com/brix/crypto-js) - Password Hash Package.
* [Joi](https://github.com/sideway/joi) - Request Validation Package
* [JWT](https://github.com/nestjs/jwt) - Authentication Package.
* [Winston](https://github.com/gremo/nest-winston) - Logger Package.
* [Morgan](https://github.com/expressjs/morgan) - HTTP Logger Package



---



<!-- GETTING STARTED -->
## Getting Started

This is an example of how you may give instructions on setting up your project locally.
To get a local copy up and running follow these simple example steps.

```
	ac.k
	├── .dockerignore
	├── .env.example // Env File Example
	├── .eslintignore
	├── .eslintrc
	├── .gitignore
	├── .prettierrc 
	├── docker-compose.yml 
	├── dockerfile 
	├── LICENSE.md
	├── nest-cli.json
	├── package.json
	├── README.md
	├── tsconfig.build.json
	├── tsconfig.build
	└── src // Source App
		├── app
		├── auth
		├── body-parser
		├── config
		├── country
		├── database
		├── error
		├── language
		├── logger
		├── middleware
		├── pipe
		├── user
		└── main.ts
		 
```

### Prerequisites

This is an example of how to list things you need to use the software and how to install them.
* npm
```sh
npm install npm@latest -g
```

### Installation

1. Get a free API Key at [https://example.com](https://example.com)
2. Clone the repo
```sh
git clone https://github.com/your_username_/Project-Name.git
```
3. Install NPM packages
```sh
npm install
```
4. Enter your API in `config.js`
```JS
const API_KEY = 'ENTER YOUR API';
```



<!-- USAGE EXAMPLES -->
## Usage

Use this space to show useful examples of how a project can be used. Additional screenshots, code examples and demos work well in this space. You may also link to more resources.

_For more examples, please refer to the [Documentation](project-docs)_



---



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
  * [Express Documentation](https://expressjs.com/en/5x/api.html)
  * [TypeScript Documentation](https://www.typescriptlang.org/docs)
* Database
  * [MongoDb Documentation](https://docs.mongodb.com/manual)
* Common Package
  * [Mongoose Documentation](https://mongoosejs.com/docs/guide.html)
  * [Crypto Documentation](https://cryptojs.gitbook.io/docs/)
  * [JWT Documentation](https://github.com/nestjs/jwt)
  * [Joi Documentation](https://joi.dev/api/) 
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
  * [NodeJs Best Practice Reference](https://www.typescriptlang.org/docs)
  * [NestJs Middleware Reference](https://github.com/wbhob/nest-middlewares)
  * [ReadMe Template](https://github.com/othneildrew/Best-README-Template)
* Other
  * [Docker Documentation](https://docs.docker.com/)



[project-url]: https://github.com/andrechristikan/ac.k
[project-docs]: https://github.com/andrechristikan/ac.k
[project-issues]: https://github.com/andrechristikan/ac.k/issues/
[author-email]: mailto:andrechristikan@gmail.com
[author-linkedin]: https://id.linkedin.com/in/andre-christi-kan-6b5913143
[author-instagram]: https://www.instagram.com/___ac.k/