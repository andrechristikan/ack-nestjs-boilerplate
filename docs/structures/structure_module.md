# Module structure

Full structure of module

```txt
.
└── module1
    ├── abstracts
    ├── constants
    ├── controllers 
    ├── decorators 
    ├── dtos 
    ├── docs 
    ├── errors // custom error
    ├── factories // custom factory
    ├── filters // custom filter 
    ├── guards // guard validate
    ├── indicators // custom health check indicator
    ├── interceptors // custom interceptors
    ├── interfaces
    ├── middleware
    ├── pipes
    ├── repository
        ├── entities // database entities
        ├── repositories // database repositories
        └── module1.repository.module.ts
    ├── serializations // response serialization
    ├── services
    ├── tasks // task for cron job
    └── module1.module.ts
```

## abstracts
...

## constants
Enum, static value, status code, etc

## controllers
Business logic for Rest Api

## decorators
Warper decorator, group decorator, or custom decorator

## dtos
Request validation

## docs
Swagger or OpenAPI 3

## errors 
Custom error

## factories
Custom factory

## filters
Custom filter 

## guards
Custom guard, and guard validate

## indicators
Custom health check indicator

## interceptors
Custom interceptors

## interfaces
...

## middleware
...

## pipes
...

## repository

### entities
Database entities

### repositories
Database repositories

### module1.repository.module.ts
Repository module named

## serializations
Response serialization

## services
...

## tasks
Task for cron job

## module1.module.ts
module named