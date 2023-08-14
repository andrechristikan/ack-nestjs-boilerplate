# Response

## Prerequisites
Before start you can read for better understanding
1. [structure_response][doc-structure-response] 

## Description

`Response decorator` / `@Response` is one of the main modules of this boilerplate and has rich features behind it.

The main purpose of this decorator is to `centralize response and force response to be structured`. 

By default, `statusCode` will be the same as `httpStatus`.


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

### Options

Is optional and has an interface as `IResponseOptions`.
   
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

In this section, will describe how to use `@Response` with 5 scenario

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

The response will be
```json
{
    "statusCode": 308,
    "message": "Success return null value" // <---- this will convert base on language file
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
    @Get('/test/null-return')
    async test(): Promise<IResponse> { // <---- for helper, you can put IResponse interface
        
        const testNumber = "2";
        
        return {
            data: { testNumber }
        };
    }

}
```

The response will be
```json
{
    "statusCode": 200,
    "message": "Success return some data with serialization",
    "data": {
        "testNumber": 2, // <---- this will be convert into number
        "addValue": "addValue" // <---- this will added automatically
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

The response will be
```json
{
    "statusCode": 200,
    "message": "test.notFound" // <---- will return messagePath
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

The response will be
```json
// response test1
{
    "statusCode": 200,
    "message": "Success return deep message with custom property custom message property" // <---- {customProp} replace with custom message property
}


// response test2
{
    "statusCode": 200,
    "message": "Success return deep message with custom property deep message" // <---- {customProp} replace with custom message property
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

The response will be
```json
// response custom1, httpStatus will 200
{
    "statusCode": 200,
    "message": "Success custom 1" 
}


// response custom2, httpStatus will 308
{
    "statusCode": 1001,
    "message": "Success custom 2"
}
```

# Conclusion

The `@Response` decorator is suitable for many scenarios. The params and options also can be combined with others.


<!-- Docs -->
[doc-structure-response]: /docs/structures/structure_response.md
[doc-structure-module]: /docs/structures/structure_module.md
[doc-structure-folder]: /docs/structures/structure_folder.md