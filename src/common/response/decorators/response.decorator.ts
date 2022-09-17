import {
    applyDecorators,
    HttpStatus,
    SetMetadata,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiExtraModels,
    ApiOkResponse,
    ApiParam,
    ApiProduces,
    ApiQuery,
    ApiResponse,
    getSchemaPath,
} from '@nestjs/swagger';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { ENUM_FILE_EXCEL_MIME } from 'src/common/file/constants/file.enum.constant';
import { ENUM_PAGINATION_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { RequestHeaderDoc } from 'src/common/request/decorators/request.decorator';
import {
    RESPONSE_CUSTOM_TIMEOUT_META_KEY,
    RESPONSE_CUSTOM_TIMEOUT_VALUE_META_KEY,
    RESPONSE_MESSAGE_PATH_META_KEY,
    RESPONSE_MESSAGE_PROPERTIES_META_KEY,
    RESPONSE_PAGING_TYPE_META_KEY,
    RESPONSE_SERIALIZATION_META_KEY,
} from 'src/common/response/constants/response.constant';
import { ResponseDefaultInterceptor } from 'src/common/response/interceptors/response.default.interceptor';
import { ResponseExcelInterceptor } from 'src/common/response/interceptors/response.excel.interceptor';
import { ResponsePagingInterceptor } from 'src/common/response/interceptors/response.paging.interceptor';
import {
    IResponseDocOptions,
    IResponseDocPagingOptions,
    IResponseDoc,
    IResponseOptions,
    IResponseDocs,
} from 'src/common/response/interfaces/response.interface';
import { ResponseDefaultSerialization } from 'src/common/response/serializations/response.default.serialization';
import { ResponsePagingSerialization } from 'src/common/response/serializations/response.paging.serialization';

export function ResponseDoc<T>(document: IResponseDoc): any {
    const docs = [];
    const schema: Record<string, any> = {
        allOf: [{ $ref: getSchemaPath(ResponseDefaultSerialization<T>) }],
        properties: {
            message: {
                example: document.messagePath,
            },
            statusCode: {
                type: 'number',
                example: document.statusCode || HttpStatus.OK,
            },
        },
    };

    if (document.serialization) {
        docs.push(ApiExtraModels(document.serialization));
        schema.properties = {
            ...schema.properties,
            data: {
                $ref: getSchemaPath(document.serialization),
            },
        };
    }

    return applyDecorators(
        ApiExtraModels(ResponseDefaultSerialization<T>),
        ApiResponse({
            status: document.httpStatus,
            schema,
        }),
        ...docs
    );
}

export function ResponseDocOneOf<T>(
    httpStatus: HttpStatus,
    ...documents: IResponseDocs[]
): any {
    const docs = [];
    const oneOf = [];

    for (const doc of documents) {
        const oneOfSchema: Record<string, any> = {
            allOf: [{ $ref: getSchemaPath(ResponseDefaultSerialization<T>) }],
            properties: {
                message: {
                    example: doc.messagePath,
                },
                statusCode: {
                    type: 'number',
                    example: doc.statusCode || HttpStatus.OK,
                },
            },
        };

        if (doc.serialization) {
            docs.push(ApiExtraModels(doc.serialization));
            oneOfSchema.properties = {
                ...oneOfSchema.properties,
                data: {
                    $ref: getSchemaPath(doc.serialization),
                },
            };
        }

        oneOf.push(oneOfSchema);
    }

    return applyDecorators(
        ApiExtraModels(ResponseDefaultSerialization<T>),
        ApiResponse({
            status: httpStatus,
            schema: {
                oneOf,
            },
        }),
        ...docs
    );
}

export function ResponseDocAnyOf<T>(
    httpStatus: HttpStatus,
    ...documents: IResponseDocs[]
): any {
    const docs = [];
    const anyOf = [];

    for (const doc of documents) {
        const anyOfSchema: Record<string, any> = {
            allOf: [{ $ref: getSchemaPath(ResponseDefaultSerialization<T>) }],
            properties: {
                message: {
                    example: doc.messagePath,
                },
                statusCode: {
                    type: 'number',
                    example: doc.statusCode || HttpStatus.OK,
                },
            },
        };

        if (doc.serialization) {
            docs.push(ApiExtraModels(doc.serialization));
            anyOfSchema.properties = {
                ...anyOfSchema.properties,
                data: {
                    $ref: getSchemaPath(doc.serialization),
                },
            };
        }

        anyOf.push(anyOfSchema);
    }

    return applyDecorators(
        ApiExtraModels(ResponseDefaultSerialization<T>),
        ApiResponse({
            status: httpStatus,
            schema: {
                anyOf,
            },
        }),
        ...docs
    );
}

export function ResponseDocAllOf<T>(
    httpStatus: HttpStatus,
    ...documents: IResponseDocs[]
): any {
    const docs = [];
    const allOf = [];

    for (const doc of documents) {
        const allOfSchema: Record<string, any> = {
            allOf: [{ $ref: getSchemaPath(ResponseDefaultSerialization<T>) }],
            properties: {
                message: {
                    example: doc.messagePath,
                },
                statusCode: {
                    type: 'number',
                    example: doc.statusCode || HttpStatus.OK,
                },
            },
        };

        if (doc.serialization) {
            docs.push(ApiExtraModels(doc.serialization));
            allOfSchema.properties = {
                ...allOfSchema.properties,
                data: {
                    $ref: getSchemaPath(doc.serialization),
                },
            };
        }

        allOf.push(allOfSchema);
    }

    return applyDecorators(
        ApiExtraModels(ResponseDefaultSerialization<T>),
        ApiResponse({
            status: httpStatus,
            schema: {
                allOf,
            },
        }),
        ...docs
    );
}

export function Response<T>(
    messagePath: string,
    options?: IResponseOptions<T>
): any {
    const docs = [];
    const docOptions =
        options && options.doc ? (options.doc as IResponseDocOptions) : {};
    const schema: Record<string, any> = {
        allOf: [{ $ref: getSchemaPath(ResponseDefaultSerialization<T>) }],
        properties: {
            message: {
                example: messagePath,
            },
        },
    };

    if (options) {
        docs.push(ApiExtraModels(options.classSerialization));
        schema.properties = {
            ...schema.properties,
            data: {
                $ref: getSchemaPath(options.classSerialization),
            },
        };
    }

    if (docOptions.statusCode) {
        schema.properties = {
            ...schema.properties,
            statusCode: {
                type: 'number',
                example: docOptions.statusCode
                    ? docOptions.statusCode
                    : HttpStatus.OK,
            },
        };
    }

    if (docOptions.responses) {
        docs.push(
            ...docOptions.responses.map((response) => ResponseDoc(response))
        );
    }

    if (docOptions.params) {
        docs.push(...docOptions.params.map((param) => ApiParam(param)));
    }

    if (docOptions.queries) {
        docs.push(...docOptions.queries.map((query) => ApiQuery(query)));
    }

    return applyDecorators(
        UseInterceptors(ResponseDefaultInterceptor<T>),
        SetMetadata(RESPONSE_MESSAGE_PATH_META_KEY, messagePath),
        SetMetadata(
            RESPONSE_SERIALIZATION_META_KEY,
            options ? options.classSerialization : undefined
        ),
        SetMetadata(
            RESPONSE_MESSAGE_PROPERTIES_META_KEY,
            options ? options.messageProperties : undefined
        ),

        // doc
        RequestHeaderDoc(),
        ResponseDoc({
            httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
            messagePath: 'http.serverError.serviceUnavailable',
            statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_SERVICE_UNAVAILABLE,
        }),
        ResponseDoc({
            httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
            messagePath: 'http.serverError.internalServerError',
            statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
        }),
        ResponseDoc({
            httpStatus: HttpStatus.REQUEST_TIMEOUT,
            messagePath: 'http.serverError.requestTimeout',
            statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_REQUEST_TIMEOUT,
        }),
        ApiExtraModels(ResponseDefaultSerialization),
        ApiResponse({
            status: docOptions.httpStatus || HttpStatus.OK,
            schema,
        }),
        ...docs
    );
}

export function ResponsePagingType(type: ENUM_PAGINATION_TYPE) {
    return applyDecorators(SetMetadata(RESPONSE_PAGING_TYPE_META_KEY, type));
}

export function ResponseExcel(options?: IResponseOptions<void>) {
    const docs = [];
    const docOptions =
        options && options.doc ? (options.doc as IResponseDocOptions) : {};

    if (docOptions.responses) {
        docs.push(
            ...docOptions.responses.map((response) => ResponseDoc(response))
        );
    }

    if (docOptions.params) {
        docs.push(...docOptions.params.map((param) => ApiParam(param)));
    }

    if (docOptions.queries) {
        docs.push(...docOptions.queries.map((query) => ApiQuery(query)));
    }

    return applyDecorators(
        UseInterceptors(ResponseExcelInterceptor),
        SetMetadata(
            RESPONSE_SERIALIZATION_META_KEY,
            options ? options.classSerialization : undefined
        ),
        SetMetadata(
            RESPONSE_MESSAGE_PROPERTIES_META_KEY,
            options ? options.messageProperties : undefined
        ),

        // doc
        RequestHeaderDoc(),
        ResponseDoc({
            httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
            messagePath: 'http.serverError.serviceUnavailable',
            statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_SERVICE_UNAVAILABLE,
        }),
        ResponseDoc({
            httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
            messagePath: 'http.serverError.internalServerError',
            statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
        }),
        ResponseDoc({
            httpStatus: HttpStatus.REQUEST_TIMEOUT,
            messagePath: 'http.serverError.requestTimeout',
            statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_REQUEST_TIMEOUT,
        }),
        ApiOkResponse(),
        ApiProduces(ENUM_FILE_EXCEL_MIME.XLSX),
        ...docs
    );
}

export function ResponsePaging<T>(
    messagePath: string,
    options?: IResponseOptions<T>
): any {
    const docs = [];
    const docOptions =
        options && options.doc
            ? (options.doc as IResponseDocPagingOptions)
            : {};
    const schema: Record<string, any> = {
        allOf: [{ $ref: getSchemaPath(ResponsePagingSerialization<T>) }],
        properties: {
            message: {
                example: messagePath,
            },
        },
    };

    if (options) {
        docs.push(ApiExtraModels(options.classSerialization));
        schema.allOf.push({
            properties: {
                data: {
                    type: 'array',
                    items: {
                        $ref: getSchemaPath(options.classSerialization),
                    },
                },
            },
        });
    }

    if (docOptions.statusCode) {
        schema.properties = {
            ...schema.properties,
            statusCode: {
                type: 'number',
                example: docOptions.statusCode
                    ? docOptions.statusCode
                    : HttpStatus.OK,
            },
        };
    }

    if (docOptions.availableSearch) {
        schema.properties = {
            ...schema.properties,
            availableSearch: {
                example: docOptions.availableSearch,
            },
        };
    }

    if (docOptions.availableSort) {
        schema.properties = {
            ...schema.properties,
            availableSort: {
                example: docOptions.availableSort,
            },
        };
    }

    if (docOptions.responses) {
        docs.push(
            ...docOptions.responses.map((response) => ResponseDoc(response))
        );
    }

    if (docOptions.params) {
        docs.push(...docOptions.params.map((param) => ApiParam(param)));
    }

    if (docOptions.queries) {
        docs.push(...docOptions.queries.map((query) => ApiQuery(query)));
    }

    return applyDecorators(
        UseInterceptors(ResponsePagingInterceptor<T>),
        SetMetadata(RESPONSE_MESSAGE_PATH_META_KEY, messagePath),
        SetMetadata(
            RESPONSE_SERIALIZATION_META_KEY,
            options ? options.classSerialization : undefined
        ),
        SetMetadata(
            RESPONSE_MESSAGE_PROPERTIES_META_KEY,
            options ? options.messageProperties : undefined
        ),

        // doc
        RequestHeaderDoc(),
        ResponseDoc({
            httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
            messagePath: 'http.serverError.serviceUnavailable',
            statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_SERVICE_UNAVAILABLE,
        }),
        ResponseDoc({
            httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
            messagePath: 'http.serverError.internalServerError',
            statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
        }),
        ResponseDoc({
            httpStatus: HttpStatus.REQUEST_TIMEOUT,
            messagePath: 'http.serverError.requestTimeout',
            statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_REQUEST_TIMEOUT,
        }),
        ApiQuery({
            name: 'search',
            required: false,
            allowEmptyValue: true,
            type: 'string',
            description:
                'Search will base on availableSearch with rule contains, and case insensitive',
        }),
        ApiQuery({
            name: 'perPage',
            required: true,
            allowEmptyValue: false,
            example: 20,
            type: 'number',
            description: 'Data per page',
        }),
        ApiQuery({
            name: 'page',
            required: true,
            allowEmptyValue: false,
            example: 1,
            type: 'number',
            description: 'page number',
        }),
        ApiQuery({
            name: 'sort',
            required: true,
            allowEmptyValue: false,
            example: 'createdAt@desc',
            type: 'string',
            description: 'Sort base on availableSort, type is `asc` and `desc`',
        }),
        ApiExtraModels(ResponsePagingSerialization),
        ApiResponse({
            status: HttpStatus.OK,
            schema,
        }),
        ...docs
    );
}

export function ResponseTimeout(seconds: string): any {
    return applyDecorators(
        SetMetadata(RESPONSE_CUSTOM_TIMEOUT_META_KEY, true),
        SetMetadata(RESPONSE_CUSTOM_TIMEOUT_VALUE_META_KEY, seconds)
    );
}
