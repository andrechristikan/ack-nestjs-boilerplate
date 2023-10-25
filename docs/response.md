# Response

## Prerequisites
Before start, you can read some docs for better understanding
1. [structure_response][doc-structure-response] 


## Purpose
Centralize response and force response to be structured

## Description

> By default, `statusCode` will be the same as `httpStatus`.

`Response decorator` / `@Response` is one of the main modules of this boilerplate and has rich features behind it.

## Params and Options

`@Response` also has a parameter and options, so you can use it based on a scenario.

```ts
export function Response<T>(
    messagePath: string,
    options?: IResponseOptions<T>
): MethodDecorator {
    ...
    ...
    ...
}
```

### messagePath
Represents the path of a message based on our languages files in `/src/languages/`. Otherwise, it will return `messagePath`.
If the past is have child, you can put messagePath like this `parentPath.childPath`

### options

Has an interface as `IResponseOptions`.
   
```ts
export type IMessageOptionsProperties = Record<string, string | number>;

export interface IResponseOptions<T> {
    serialization?: ClassConstructor<T>;
    messageProperties?: IMessageOptionsProperties;
}
```

Options will have 2 optional parameters.

1. `serialization`: If you want to serialize a response to some class.
2. `messageProperties`: If you have some custom properties in the language files, It will be useful when the message is used for 2, 3, or many `@Responses`.


## How to use

To use response decorator put `@Response` in Controller level like this

```ts
@Controller()
export class Controller {

    @Response('messagePath') // <---- here
    @Get('/test')
    async test(): Promise<void> {
        return;
    }

}

```

## Scenario

In this section, will describe how to use `@Response` with 5 scenarios

### Language File
Imagine if you have language file like this. In `src/languages` there has only one file `test.json`

```json
{
    "nullReturn": "Success return null value",
    "returnSomeData": "Success return some data with serialization",
    "deep": {
        "withMessageProperty": "Success return deep message with custom property {customProp}"
    },
    "custom1": "Success custom 1",
    "custom2": "Success custom 2"
}
```

### Scenario1
Null return, and override HttpStatus to 308

```ts
@Controller()
export class Controller {

    @Response('test.nullReturn') // <---- here
    @HttpCode(HttpStatus.PERMANENT_REDIRECT) // <---- here
    @Get('/test/null-return')
    async test(): Promise<void> {
        return;
    }

}
```

The response statusCode will change to 308 from 200, and message will convert base on language file

```json
{
    "statusCode": 308,
    "message": "Success return null value",
    "_metadata": {
        "languages": [
            "en"
        ],
        "timestamp": 1692031787997,
        "timezone": "Asia/Jakarta",
        "requestId": "165b5484-4287-4812-94cd-33a79c67a0fa",
        "path": "/api/v1/test/null-return",
        "version": "1",
        "repoVersion": "1.0.0"
    }
}
```


### Scenario2
Return some data, and want to serialization response

```ts
class SomeDataSerialization{
    @Type(() => Number)
    testNum: number;

    @Expose()
    @Transform(() => "addValue")
    addValue: string;
}

@Controller()
export class Controller {

    @Response('test.returnSomeData',{
        serialization: SomeDataSerialization
    }) // <---- here
    @Get('/test/null-some-data')
    async test(): Promise<IResponse> { // <---- for help inconsistency, you can put IResponse interface
        
        const testNumber = "2";
        
        return {
            data: { testNumber }
        };
    }

}
```

The response data will convert testNumber into number, and add addValue automatically.

```json
{
    "statusCode": 200,
    "message": "Success return some data with serialization",
    "_metadata": {
        "languages": [
            "en"
        ],
        "timestamp": 1692031787997,
        "timezone": "Asia/Jakarta",
        "requestId": "165b5484-4287-4812-94cd-33a79c67a0fa",
        "path": "/api/v1/test/null-some-data",
        "version": "1",
        "repoVersion": "1.0.0"
    },
    "data": {
        "testNumber": 2,
        "addValue": "addValue"
    }
}
```

### Scenario3
Return messagePath because of missing value in language files

```ts
@Controller()
export class Controller {

    @Response('test.notFound') // <---- here
    @Get('/test/not-found')
    async test(): Promise<void> {
        return;
    }

}

```

The response will return messagePath

```json
{
    "statusCode": 200,
    "message": "test.notFound",
    "_metadata": {
        "languages": [
            "en"
        ],
        "timestamp": 1692031787997,
        "timezone": "Asia/Jakarta",
        "requestId": "165b5484-4287-4812-94cd-33a79c67a0fa",
        "path": "/api/v1/test/not-found",
        "version": "1",
        "repoVersion": "1.0.0"
    }
}
```


### Scenario4
Return message with custom message property

```ts
@Controller()
export class Controller {

    @Response('test.deep.withMessageProperty', {
        messageProperties: {
            customProp: "custom message property"
        }
    }) // <---- here
    @Get('/test/custom-message-property1')
    async test1(): Promise<void> {
        return;
    }


    @Response('test.deep.withMessageProperty', {
        messageProperties: {
            customProp: "deep message"
        }
    }) // <---- here
    @Get('/test/custom-message-property2')
    async test2(): Promise<void> {
        return;
    }

}

```

The response test1 will be. {customProp} replace with custom message property

```json
{
    "statusCode": 200,
    "message": "Success return deep message with custom property custom message property",
    "_metadata": {
        "languages": [
            "en"
        ],
        "timestamp": 1692031787997,
        "timezone": "Asia/Jakarta",
        "requestId": "165b5484-4287-4812-94cd-33a79c67a0fa",
        "path": "/api/v1/test/custom-message-property1",
        "version": "1",
        "repoVersion": "1.0.0"
    }
}
```

The response test2 will be. {customProp} replace with custom message property

```json
{
    "statusCode": 200,
    "message": "Success return deep message with custom property deep message",
    "_metadata": {
        "languages": [
            "en"
        ],
        "timestamp": 1692031787997,
        "timezone": "Asia/Jakarta",
        "requestId": "165b5484-4287-4812-94cd-33a79c67a0fa",
        "path": "/api/v1/test/custom-message-property2",
        "version": "1",
        "repoVersion": "1.0.0"
    }
}
```

### Scenario5
Return a custom success response. Sometimes there is more than one successful response, and we want to make a difference between them.

> Custom success is also capable of using messagesProperties too, as in scenario 4.

```ts
@Controller()
export class Controller {

    @Response('test.custom1') // <---- here
    @Get('/test/custom1')
    async test(@Query('custom') custom: string): Promise<IResponse> {

        if(custom){
            return {
                _metadata: {
                    statusCode: 1001,
                    message: 'test.custom2',
                    httpStatus: HttpStatus.PERMANENT_REDIRECT
                }
            };
        }

        return;
    }

}

```

The response custom1 will be. httpStatus will 200

```json
// response custom1
{
    "statusCode": 200,
    "message": "Success custom 1",
    "_metadata": {
        "languages": [
            "en"
        ],
        "timestamp": 1692031787997,
        "timezone": "Asia/Jakarta",
        "requestId": "165b5484-4287-4812-94cd-33a79c67a0fa",
        "path": "/api/v1/test/custom1",
        "version": "1",
        "repoVersion": "1.0.0"
    }
}
```

The response custom2 will be. httpStatus will 308, and statusCode will 1001.

```json
{
    "statusCode": 1001,
    "message": "Success custom 2",
    "_metadata": {
        "languages": [
            "en"
        ],
        "timestamp": 1692031787997,
        "timezone": "Asia/Jakarta",
        "requestId": "165b5484-4287-4812-94cd-33a79c67a0fa",
        "path": "/api/v1/test/custom2",
        "version": "1",
        "repoVersion": "1.0.0"
    }
}
```

# Conclusion

The `@Response` decorator is suitable for many scenarios. The params and options also can be combined with others.


<!-- Docs -->
[doc-structure-response]: /docs/structures/structure_response.md
[doc-structure-module]: /docs/structures/structure_module.md
[doc-structure-folder]: /docs/structures/structure_folder.md