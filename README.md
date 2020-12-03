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



---


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
If we want to add a language.



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