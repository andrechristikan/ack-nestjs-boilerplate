# Response Default

> _metadata useful when we need to give the frontend some information

Default response for the response

```ts
export class ResponseMetadataSerialization {
    languages: string[];
    timestamp: number;
    timezone: string;
    requestId: string;
    path: string;
    version: string;
    repoVersion: string;
    [key: string]: any;
}

export class ResponseDefaultSerialization {
    statusCode: number;
    message: string;
    _metadata: ResponseMetadataSerialization;
    data?: Record<string, any>;
}
```

# Response Paging

> _metadata useful when we need to give the frontend some information

Default response for pagination.

```ts
export class RequestPaginationSerialization {
    search: string;
    filters: Record<
        string,
        string | number | boolean | Array<string | number | boolean>
    >;
    page: number;
    perPage: number;
    orderBy: string;
    orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE;
    availableSearch: string[];
    availableOrderBy: string[];
    availableOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE[];
}

export class ResponsePaginationSerialization extends RequestPaginationSerialization {
    total: number;
    totalPage: number;
}

export class ResponsePaginationCursorSerialization {
    nextPage: string;
    previousPage: string;
    firstPage: string;
    lastPage: string;
}

export interface ResponsePagingMetadataSerialization
    extends ResponseMetadataSerialization {
    cursor: ResponsePaginationCursorSerialization;
    pagination: ResponsePaginationSerialization;
}

export class ResponsePagingSerialization {
    statusCode: number;
    message: string;
    _metadata: ResponsePagingMetadataSerialization;
    data: Record<string, any>[];
}

```