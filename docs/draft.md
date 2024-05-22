# Why u are writing interfaces
The interface is used for the definition of the class and to protect the class from being accidentally changed.
Example:

## Interface `IUserService` 
- findOne(find: object): Promise<User>;
- findOneById(_id: string): Promise<User>;
- findAll(find: object): Promise<User[]>;
- getTotal(find: object): Promise<number>;

## `UserService`
### Correct
- findOne(find: object): Promise<User>{}
- findOneById(_id: string): Promise<User>{}
- findAll(find: object): Promise<User[]>{}
- getTotal(find: object): Promise<number>{}

### Error
- findOne(name: string): Promise<User> {}       <---- WILL ERROR
- findOneById(_id: string): Promise<User> {}
- findAll(find: object): Promise<Object[]> {}   <---- WILL ERROR
- getTotal(find: object): Promise<number> {}









# What is doc
`Doc` is used for the definition of OpenAPI3, aka Swagger.
The idea for `Doc` is centralize and reuseable the component.

List of Decorator
- Doc: default definition
- DocOneOf: just like native stagger oneOf definition, group
- DocAllOf: just like native stagger allOf definition, group
- DocAnyOf: just like native stagger anyOf definition, group
- DocDefault: add a definition
- DocAuth: for auth definition, token
- DocGuard: for role and permission definition
- DocRequest: for request definition, without file
- DocRequestFile: for request definition, with file
- DocResponse: for response definition, default response
- DocResponsePaging: for response paging definition
- DocResponseFile: for response file definition
- DocErrorGroup: for additional http error definition

## Example
If we use `DocGuard` and `role` property is `true`
Then in Swagger will add 1 definition of `role required`

If `permission` property is `true`
Then in Swagger will add some definitions of `ability forbidden`









# What is request for
Request has many purpose
- Set Throttler
- Set Timeout
- Set global validation with `class-validator`
- Add custom `class-validator`
- Set Sentry
- Set middleware
  
## List of middleware
- RequestHelmetMiddleware,
- RequestIdMiddleware,
- RequestJsonBodyParserMiddleware,
- RequestTextBodyParserMiddleware,
- RequestRawBodyParserMiddleware,
- RequestUrlencodedBodyParserMiddleware,
- RequestCorsMiddleware,
- RequestVersionMiddleware,
- RequestTimestampMiddleware,
- RequestTimezoneMiddleware










# What is response for
Response is one of main idea of this project

Response is used for
- Centralize response
- Serialize response from controller to some `Class`
- Mapping return value from controller into our `ResponseInterface`
- Convert `messagePath` to real message base on `src/languages/*.json`
- Insert `_metadata` into response

## Example
```ts
@Response('apiKey.update', { 
    serialization: ResponseIdSerialization ,
    messageProperty: 'object'
})
```









# What is serialization for
Serialization is used to serialize responses before giving them back to the frontend based on class.
The controller's focus is business logic, and the mapping response is done by the `@Response` decorator.














# What is debugger
Simply debugger is just `console.log` / `print` into file.
If `DEBUGGER_WRITE_INTO_FILE` in env file is set to `true`, then debugger will write an HTTP request and an error (internal server error only) into a file.

But not only that, you can also use the debugger freely by just importing the module.


## Example
How to import
```ts
@Module({
    providers: [],
    exports: [],
    controllers: [],
    imports: [DebuggerModule],
})
export class UserModule {}

```

How to call
```ts
constructor(
    private readonly debuggerService: DebuggerService
) {}
```

How to use
```ts
this.debuggerService.info({
    type: 'request',
    method: request.method,
    path: request.path,
    originalUrl: request.originalUrl,
    params: request.params,
    body: request.body,
    baseUrl: request.baseUrl,
    query: request.query,
    ip: request.ip,
    hostname: request.hostname,
    protocol: request.protocol,
});
```

### FYI
Before this project uses `Sentry`, the project uses `Winston` package.
That's why the module is called `debugger`.





