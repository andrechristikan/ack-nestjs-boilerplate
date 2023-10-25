# Pagination

## Prerequisites
Before start, you can read some docs for better understanding
1. [structure_response][doc-structure-response] 
2. [response][doc-response] 

## Purpose
Making server-side pagination easier to implement. 

## Description

Server-Side Pagination that contains 2 main features

1. `@PaginationQuery`

    > The details will be described below

    This decorator is a helper for converting a `@Query` into a `query database`.
    `@PaginationQuery` has 7 types.

    - PaginationQuery
    - PaginationQueryFilterInBoolean
    - PaginationQueryFilterInEnum
    - PaginationQueryFilterEqual
    - PaginationQueryFilterContain
    - PaginationQueryFilterDate
    - PaginationQueryFilterEqualObjectId
  
2. `@ResponsePaging`

    > The details will be described below

    This decorator is inherited with [response][doc-response]. So in this section, I will describe only the differences.

    The difference is
    - In `@ResponsePaging` options, serialization is required, but in `@Response`, it is optional. For usage, there is no difference.
    - In `@Response`, for help inconsistency, that has an `IResponse` interface, but in `@ResponsePaging`, that has an `IResponsePaging`.


--- 

# PaginationQuery

> Next development will use repository for convert the `@Query` so it will support all repository

`@PaginationQuery` is a helper for converting a `@Query` into a `query database`. 
This decorator consumes `pipe` from `nestjs` with some manipulation. 
Now there are 7 Types that have different purpose.

List of `@Query` that used by `@PaginationQuery`

> If you want to know what is this, you can jump to scenario section of PaginationQuestion

- `search`: text searching
- `perPage`: set limit
- `page`: set page
- `orderBy`: set order by
- `orderDirection`: ser order direction

## PaginationQuery

> It is a default decorator and will always required when doing server-side pagination. 

This is uses for make default value for pagination.

```ts
export function PaginationQuery(
    defaultPerPage: number,
    defaultOrderBy: string,
    defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE,
    availableSearch: string[],
    availableOrderBy: string[]
): ParameterDecorator {
    ...
}
```

### Params and Options

#### defaultPerPage

Default per page is a limit data per request.

```ts
const defaultPerPage = 20;
```

#### defaultOrderBy
Default order by scope base on `availableOrderBy`. Otherwise will return `createdAt`.

```ts
const defaultOrderBy = 'createdAt';
```

#### defaultOrderDirection
Default order direction will following `ENUM_PAGINATION_ORDER_DIRECTION_TYPE`. Otherwise will return `ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC`.

```ts
const defaultOrderDirection = ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC;
```

#### availableSearch
This will be the scope of text searching.

```ts
const availableSearch = [
    'name',
];
```

#### availableOrderBy
This will be the scope for ordering or sorting.

```ts
const availableSearch = [
    'createdAt',
    'name',
];
```

## PaginationQueryFilterInBoolean

This is used to set the default boolean value for pagination and convert into query database. 
If null or undefined, that will be returned as `defaultValue`.

```ts
export function PaginationQueryFilterInBoolean(
    field: string,
    defaultValue: boolean[],
    queryField?: string,
    raw = false
): ParameterDecorator {
    ...
}
```

### Params and Options

#### field

This option is required and will be a field name for the query request and database.

#### defaultValue

This option is required and will be a default value when null or undefined query.

#### queryField

This option is optional and will force a field name for the query database.

#### raw

This option is optional and will return value as array of boolean and not convert into query database.


## PaginationQueryFilterInEnum

This is used to set the default enum value for pagination and convert into query database. 
If null or undefined, that will be returned as `defaultValue`.

```ts
export function PaginationQueryFilterInEnum<T>(
    field: string,
    defaultValue: T,
    defaultEnum: Record<string, any>,
    queryField?: string,
    raw = false
): ParameterDecorator {
    ...
}
```

### Params and Options

#### field

This option is required and will be a field name for the query request and database.

#### defaultValue

This option is required and will be a default value when null or undefined query.

#### defaultEnum

This option is required and will be the default enum for checking the query request value.

#### queryField

This option is optional and will force a field name for the query database.

#### raw

This option is optional and will return value as array of enum and not convert into query database.


## PaginationQueryFilterEqual

This is used to set the value for pagination and convert into query database with equal options. 
If null or undefined, that will be returned `undefined`.

```ts
export function PaginationQueryFilterEqual(
    field: string,
    queryField?: string,
    options?: IPaginationFilterStringEqualOptions,
    raw = false
): ParameterDecorator {
    ...
}
```

### Params and Options

#### field

This option is required and will be a field name for the query request and database.

#### queryField

This option is optional and will force a field name for the query database.

#### options

This option is optional and will used for convert custom query database

#### raw

This option is optional and will return value as raw query request and not convert into query database.

## PaginationQueryFilterContain

This is used to set the value for pagination and convert into query database with equal options and incase sensitive. 
If null or undefined, that will be returned `undefined`.

```ts
export function PaginationQueryFilterContain(
    field: string,
    queryField?: string,
    options?: IPaginationFilterStringContainOptions,
    raw = false
): ParameterDecorator {
    ...
}
```

### Params and Options

#### field

This option is required and will be a field name for the query request and database.

#### queryField

This option is optional and will force a field name for the query database.

#### options

This option is optional and will used for convert custom query database

#### raw

This option is optional and will return value as raw query request and not convert into query database.

## PaginationQueryFilterDate

This is used to set the value for pagination and convert into query database with equal options and date type. 
If null or undefined, that will be returned `undefined`.

```ts
export function PaginationQueryFilterDate(
    field: string,
    queryField?: string,
    options?: IPaginationFilterDateOptions,
    raw = false
): ParameterDecorator {
    ...
}
```

### Params and Options


#### field

This option is required and will be a field name for the query request and database.

#### queryField

This option is optional and will force a field name for the query database.

#### options

This option is optional and will used for convert custom query database

#### raw

This option is optional and will return value as raw query request and not convert into query database.

## PaginationQueryFilterEqualObjectId

This is used to set the value for pagination and convert into query database with equal options and object id type. 
If null or undefined, that will be returned `undefined`.

```ts
export function PaginationQueryFilterEqualObjectId(
    field: string,
    queryField?: string,
    raw = false
): ParameterDecorator {
    ...
}
```

### Params and Options


#### field

This option is required and will be a field name for the query request and database.

#### queryField

This option is optional and will force a field name for the query database.

#### raw

This option is optional and will return value as raw query request and not convert into query database.

## How to use

Use this decorator as a `ParameterDecorator` from nestjs.

```ts
@Controller()
export class Controller {

    @Get('/test')
    async test(
        @PaginationQuery(
            TEST_DEFAULT_PER_PAGE,
            TEST_DEFAULT_ORDER_BY,
            TEST_DEFAULT_ORDER_DIRECTION,
            TEST_DEFAULT_AVAILABLE_SEARCH,
            TEST_DEFAULT_AVAILABLE_ORDER_BY
        )
        { _search, _limit, _offset, _order }: PaginationListDto, // <---- here,
    ): Promise<void> {
        return;
    }

}
```

## Scenario

The scenario will be based on the request url, and this is an example of a source that represents RestAPI.

> Imagine total data is 100

```ts
const TEST_DEFAULT_ORDER_BY = 'createdAt';
const TEST_DEFAULT_ORDER_DIRECTION =
    ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC;
const TEST_DEFAULT_PER_PAGE = 20;
const TEST_DEFAULT_AVAILABLE_ORDER_BY = ['createdAt'];
const TEST_DEFAULT_AVAILABLE_SEARCH = ["name", "city"];

export const TEST_DEFAULT_BOOLEAN = [true, false];

@Controller()
export class Controller {

    @Response('messagePath')
    @Get('/test')
    async test(
        @PaginationQuery(
            TEST_DEFAULT_PER_PAGE,
            TEST_DEFAULT_ORDER_BY,
            TEST_DEFAULT_ORDER_DIRECTION,
            TEST_DEFAULT_AVAILABLE_SEARCH,
            TEST_DEFAULT_AVAILABLE_ORDER_BY
        )
        { _search, _limit, _offset, _order }: PaginationListDto, // <---- get PaginationQuery,
        @PaginationQueryFilterInBoolean('test', TEST_DEFAULT_BOOLEAN)
        testBoolean: Record<string, any>,
    ): Promise<IResponse> {
        return {
            data: {
                testBoolean,
                _search, 
                _limit, 
                _offset, 
                _order 
            }
        };
    }

}

```

### Scenario1

Url with no query request `http://localhost/v1/test`

The response will be

```json
{
    "statusCode": 200,
    "message": "messagePath",
    "_metadata": {
        "languages": [
            "en"
        ],
        "timestamp": 1692031787997,
        "timezone": "Asia/Jakarta",
        "requestId": "165b5484-4287-4812-94cd-33a79c67a0fa",
        "path": "/api/v1/test",
        "version": "1",
        "repoVersion": "1.0.0"
    },
    "data": {
        "testBoolean": {
            "test" : { 
                "$in":[
                    true,
                    false
                ]
            }
        },
        "_search": "", 
        "_limit": 20, 
        "_offset": 0, 
        "_order": {
            "createdAt": -1
        }
    }
}
```

### Scenario2

Url with set of query request `http://localhost/v1/test?search=try&perPage=10&page=5`

The response will be

```json
{
    "statusCode": 200,
    "message": "messagePath",
    "_metadata": {
        "languages": [
            "en"
        ],
        "timestamp": 1692031787997,
        "timezone": "Asia/Jakarta",
        "requestId": "165b5484-4287-4812-94cd-33a79c67a0fa",
        "path": "/api/v1/test",
        "version": "1",
        "repoVersion": "1.0.0"
    },
    "data": {
        "testBoolean": {
            "test" : { 
                "$in":[
                    true,
                    false
                ]
            }
        },
        "_search": {
            "$or": [
                {
                    "name": {
                        "$regex": "try",
                        "$options": "i",
                    }
                },
                {
                    "city": {
                        "$regex": "try",
                        "$options": "i",
                    }
                }
            ]
        }, 
        "_limit": 10, 
        "_offset": 40, 
        "_order": {
            "createdAt": -1
        }
    }
}
```

--- 

# ResponsePaging

> will describe only the differences.

## Params and Options

`@ResponsePaging` also has a parameter and options, so you can use it based on a scenario.

```ts
export function ResponsePaging<T>(
    messagePath: string,
    options?: IResponsePagingOptions<T>
): MethodDecorator {
    ...
    ...
    ...
}
```

### messagePath

> inherited [response][doc-response]

### options

Has an interface as `IResponsePagingOptions`.

```ts
export type IMessageOptionsProperties = Record<string, string | number>;

export interface IResponseOptions<T> {
    serialization?: ClassConstructor<T>;
    messageProperties?: IMessageOptionsProperties;
}

export interface IResponsePagingOptions<T>
    extends Omit<IResponseOptions<T>, 'serialization'> {
    serialization: ClassConstructor<T>;
}
```

Options is required and have 2 parameters. 

1. `serialization`: Serialize a response to some class.
2. `messageProperties`: If you have some custom properties in the language files, It will be useful when the message is used for 2, 3, or many `@ResponsePaging`.

## How to use

To use response decorator put `@ResponsePaging` in Controller level like this

```ts

@Controller()
export class Controller {

    @ResponsePaging('messagePath', {
        serialization: PaginationSerialization
    }) // <---- here
    @Get('/test')
    async test(
    ): Promise<IResponsePaging> { // <---- must return a response
        ...
    }

}

```

## Scenario

The scenario of `@ResponsePaging` is the same as `@Response` in [response][doc-response] but the structure will follow `IResponsePaging`.

### Scenario1
Return some data with `IResponsePaging` interface.


```ts
const TEST_DEFAULT_ORDER_BY = 'createdAt';
const TEST_DEFAULT_ORDER_DIRECTION =
    ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC;
const TEST_DEFAULT_PER_PAGE = 20;
const TEST_DEFAULT_AVAILABLE_ORDER_BY = ['createdAt'];
const TEST_DEFAULT_AVAILABLE_SEARCH = [];

class PaginationSerialization{
    @Type(() => String)
    test: string;
}

@Controller()
export class Controller {

    @ResponsePaging('messagePath', {
        serialization: PaginationSerialization
    }) // <---- here
    @Get('/test')
    async test(
        @PaginationQuery(
            TEST_DEFAULT_PER_PAGE,
            TEST_DEFAULT_ORDER_BY,
            TEST_DEFAULT_ORDER_DIRECTION,
            TEST_DEFAULT_AVAILABLE_SEARCH,
            TEST_DEFAULT_AVAILABLE_ORDER_BY
        )
        { _search, _limit, _offset, _order }: PaginationListDto, // <---- get PaginationQuery
    ): Promise<IResponsePaging> { // <---- must return a response
        const find: Record<string, any> = {
            ..._search,
        };

        // get data from testService
        const tests: TestEntity[] = await this.testService.findAll(find, {
            paging: {
                limit: _limit,
                offset: _offset,
            },
            order: _order,
        });

        // get total data
        const total: number = await this.testService.getTotal(find);

        // calculate totalPage base on limit and total
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        return {
            _pagination: { total, totalPage },
            data: tests,
        };
    }

}

```

The response data will convert testNumber into number, and add addValue automatically.
```json
{
    "statusCode": 200,
    "message": "messagePath",
    "_metadata": {
        "languages": [
            "en"
        ],
        "timestamp": 1692031787997,
        "timezone": "Asia/Jakarta",
        "requestId": "165b5484-4287-4812-94cd-33a79c67a0fa",
        "path": "/api/v1/test",
        "version": "1",
        "repoVersion": "1.0.0",
        "pagination": {
            "search": "",
            "availableSearch": [],
            "page": 1,
            "perPage": 20,
            "orderBy": "createdAt",
            "orderDirection": "asc",
            "availableOrderBy": [
                "createdAt"
            ],
            "availableOrderDirection": [
                "asc",
                "desc"
            ],
            "total": 2,
            "totalPage": 1
        }
    },
    "data": [
        {
            "test": "1"
        },
        {
            "test": "2"
        }
    ]
}
```

# Conclusion



<!-- Docs -->
[doc-response]: /docs/response.md
[doc-structure-module]: /docs/stru
[doc-structure-response]: /docs/structures/structure_response.md
[doc-structure-module]: /docs/structures/structure_module.md
[doc-structure-folder]: /docs/structures/structure_folder.md