import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiConsumes,
    ApiExtraModels,
    ApiHeader,
    ApiHeaders,
    ApiParam,
    ApiProduces,
    ApiQuery,
    ApiResponse,
    getSchemaPath,
} from '@nestjs/swagger';
import { AppLanguage } from 'src/app/constants/app.constant';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/common/auth/constants/auth.status-code.constant';
import {
    IDocDefaultOptions,
    IDocOfOptions,
    IDocOptions,
} from 'src/common/doc/interfaces/doc.interface';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { Skip } from 'src/common/request/validations/request.skip.validation';
import { ResponseDefaultSerialization } from 'src/common/response/serializations/response.default.serialization';

export function Doc<T>(messagePath: string, options?: IDocOptions<T>): any {
    const docs = [];
    const normDoc: IDocDefaultOptions = {
        httpStatus: options?.response?.httpStatus ?? HttpStatus.OK,
        messagePath,
        statusCode: options?.response?.statusCode,
    };

    if (!options?.responseVoid) {
        docs.push(ApiConsumes('application/json'));
        if (options?.response?.classSerialization) {
            normDoc.serialization = options?.response?.classSerialization;
        }
    }

    docs.push(DocDefault(normDoc));

    if (options?.request?.params) {
        docs.push(...options?.request?.params.map((param) => ApiParam(param)));
    }

    if (options?.request?.queries) {
        docs.push(...options?.request?.queries.map((query) => ApiQuery(query)));
    }

    const oneOfUnauthorized: IDocOfOptions[] = [];
    const oneOfForbidden: IDocOfOptions[] = [];

    // auth
    const auths = [];
    if (options?.auth?.jwtRefreshToken) {
        auths.push(ApiBearerAuth('refreshToken'));
        oneOfUnauthorized.push({
            messagePath: 'auth.error.refreshTokenUnauthorized',
            statusCode:
                ENUM_AUTH_STATUS_CODE_ERROR.AUTH_JWT_REFRESH_TOKEN_ERROR,
        });
    }

    if (options?.auth?.jwtAccessToken) {
        auths.push(ApiBearerAuth('accessToken'));
        oneOfUnauthorized.push({
            messagePath: 'auth.error.accessTokenUnauthorized',
            statusCode: ENUM_AUTH_STATUS_CODE_ERROR.AUTH_JWT_ACCESS_TOKEN_ERROR,
        });
        oneOfForbidden.push(
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PERMISSION_INVALID_ERROR,
                messagePath: 'auth.error.permissionForbidden',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_ACCESS_FOR_INVALID_ERROR,
                messagePath: 'auth.error.accessForForbidden',
            }
        );
    }

    if (options?.auth?.apiKey) {
        auths.push(ApiBearerAuth('apiKey'));
        oneOfUnauthorized.push(
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_NEEDED_ERROR,
                messagePath: 'auth.apiKey.error.keyNeeded',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_PREFIX_INVALID_ERROR,
                messagePath: 'auth.apiKey.error.prefixInvalid',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_SCHEMA_INVALID_ERROR,
                messagePath: 'auth.apiKey.error.schemaInvalid',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_NOT_FOUND_ERROR,
                messagePath: 'auth.apiKey.error.notFound',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_INACTIVE_ERROR,
                messagePath: 'auth.apiKey.error.inactive',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_INVALID_ERROR,
                messagePath: 'auth.apiKey.error.invalid',
            }
        );
    }

    // request headers
    const requestHeaders = [];
    if (options?.requestHeader?.userAgent) {
        oneOfForbidden.push(
            {
                statusCode:
                    ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_USER_AGENT_INVALID_ERROR,
                messagePath: 'request.error.userAgentInvalid',
            },
            {
                statusCode:
                    ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_USER_AGENT_BROWSER_INVALID_ERROR,
                messagePath: 'request.error.userAgentBrowserInvalid',
            },
            {
                statusCode:
                    ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_USER_AGENT_OS_INVALID_ERROR,
                messagePath: 'request.error.userAgentOsInvalid',
            }
        );
        requestHeaders.push({
            name: 'user-agent',
            description: 'User agent header',
            required: true,
            schema: {
                example:
                    'Mozilla/5.0 (platform; rv:geckoversion) Gecko/geckotrail Firefox/firefoxversion',
                type: 'string',
            },
        });
    }

    if (options?.requestHeader?.timestamp) {
        oneOfForbidden.push({
            statusCode:
                ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_TIMESTAMP_INVALID_ERROR,
            messagePath: 'request.error.timestampInvalid',
        });
        requestHeaders.push({
            name: 'x-timestamp',
            description: 'Timestamp header, in microseconds',
            required: true,
            schema: {
                example: 1662876305642,
                type: 'number',
            },
        });
    }

    return applyDecorators(
        ApiProduces('application/json'),
        ApiHeader({
            name: 'x-custom-lang',
            description: 'Custom language header',
            required: false,
            schema: {
                default: AppLanguage,
                example: AppLanguage,
                type: 'string',
            },
        }),
        ApiHeaders(requestHeaders),
        DocDefault({
            httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
            messagePath: 'http.serverError.serviceUnavailable',
            statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_SERVICE_UNAVAILABLE,
        }),
        DocDefault({
            httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
            messagePath: 'http.serverError.internalServerError',
            statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
        }),
        DocDefault({
            httpStatus: HttpStatus.REQUEST_TIMEOUT,
            messagePath: 'http.serverError.requestTimeout',
            statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_REQUEST_TIMEOUT,
        }),
        oneOfForbidden.length > 0
            ? DocOneOf(HttpStatus.FORBIDDEN, ...oneOfForbidden)
            : Skip(),
        oneOfUnauthorized.length > 0
            ? DocOneOf(HttpStatus.UNAUTHORIZED, ...oneOfUnauthorized)
            : Skip(),
        ...auths,
        ...docs
    );
}

export function DocDefault<T>(options: IDocDefaultOptions): any {
    const docs = [];
    const schema: Record<string, any> = {
        allOf: [{ $ref: getSchemaPath(ResponseDefaultSerialization<T>) }],
        properties: {
            message: {
                example: options.messagePath,
            },
            statusCode: {
                type: 'number',
                example: options.statusCode,
            },
        },
    };

    if (options.serialization) {
        docs.push(ApiExtraModels(options.serialization));
        schema.properties = {
            ...schema.properties,
            data: {
                $ref: getSchemaPath(options.serialization),
            },
        };
    }

    return applyDecorators(
        ApiExtraModels(ResponseDefaultSerialization<T>),
        ApiResponse({
            status: options.httpStatus,
            schema,
        }),
        ...docs
    );
}

/// ---- excel
// const docs = [];
// const docOptions =
//     options && options.doc ? (options.doc as IResponseDocOptions) : {};

// if (!options || !options.excludeRequestBodyJson) {
//     docs.push(ApiConsumes('application/json'));
// }

// if (docOptions.responses) {
//     docs.push(
//         ...docOptions.responses.map((response) => ResponseDoc(response))
//     );
// }

// if (docOptions.params) {
//     docs.push(...docOptions.params.map((param) => ApiParam(param)));
// }

// if (docOptions.queries) {
//     docs.push(...docOptions.queries.map((query) => ApiQuery(query)));
// }

// RequestHeaderDoc(),
// ResponseDoc({
//     httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
//     messagePath: 'http.serverError.serviceUnavailable',
//     statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_SERVICE_UNAVAILABLE,
// }),
// ResponseDoc({
//     httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
//     messagePath: 'http.serverError.internalServerError',
//     statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
// }),
// ResponseDoc({
//     httpStatus: HttpStatus.REQUEST_TIMEOUT,
//     messagePath: 'http.serverError.requestTimeout',
//     statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_REQUEST_TIMEOUT,
// }),
// ApiOkResponse(),
// ApiProduces(ENUM_FILE_EXCEL_MIME.XLSX),
// ...docs

// --- paging
// const docs = [];
// const docOptions =
//     options && options.doc
//         ? (options.doc as IResponseDocPagingOptions)
//         : {};
// const schema: Record<string, any> = {
//     allOf: [{ $ref: getSchemaPath(ResponsePagingSerialization<T>) }],
//     properties: {
//         message: {
//             example: messagePath,
//         },
//     },
// };

// if (options && options.classSerialization) {
//     docs.push(ApiExtraModels(options.classSerialization));
//     schema.allOf.push({
//         properties: {
//             data: {
//                 type: 'array',
//                 items: {
//                     $ref: getSchemaPath(options.classSerialization),
//                 },
//             },
//         },
//     });
// }

// if (docOptions.statusCode) {
//     schema.properties = {
//         ...schema.properties,
//         statusCode: {
//             type: 'number',
//             example: docOptions.statusCode
//                 ? docOptions.statusCode
//                 : HttpStatus.OK,
//         },
//     };
// }

// if (docOptions.availableSearch) {
//     schema.properties = {
//         ...schema.properties,
//         availableSearch: {
//             example: docOptions.availableSearch,
//         },
//     };
// }

// if (docOptions.availableSort) {
//     schema.properties = {
//         ...schema.properties,
//         availableSort: {
//             example: docOptions.availableSort,
//         },
//     };
// }

// if (docOptions.responses) {
//     docs.push(
//         ...docOptions.responses.map((response) => ResponseDoc(response))
//     );
// }

// if (docOptions.params) {
//     docs.push(...docOptions.params.map((param) => ApiParam(param)));
// }

// if (docOptions.queries) {
//     docs.push(...docOptions.queries.map((query) => ApiQuery(query)));
// }

// // doc
// ApiProduces('application/json'),
// ApiConsumes('application/json'),
// RequestHeaderDoc(),
// ResponseDoc({
//     httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
//     messagePath: 'http.serverError.serviceUnavailable',
//     statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_SERVICE_UNAVAILABLE,
// }),
// ResponseDoc({
//     httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
//     messagePath: 'http.serverError.internalServerError',
//     statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
// }),
// ResponseDoc({
//     httpStatus: HttpStatus.REQUEST_TIMEOUT,
//     messagePath: 'http.serverError.requestTimeout',
//     statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_REQUEST_TIMEOUT,
// }),
// ApiQuery({
//     name: 'search',
//     required: false,
//     allowEmptyValue: true,
//     type: 'string',
//     description:
//         'Search will base on availableSearch with rule contains, and case insensitive',
// }),
// ApiQuery({
//     name: 'perPage',
//     required: true,
//     allowEmptyValue: false,
//     example: 20,
//     type: 'number',
//     description: 'Data per page',
// }),
// ApiQuery({
//     name: 'page',
//     required: true,
//     allowEmptyValue: false,
//     example: 1,
//     type: 'number',
//     description: 'page number',
// }),
// ApiQuery({
//     name: 'sort',
//     required: true,
//     allowEmptyValue: false,
//     example: 'createdAt@desc',
//     type: 'string',
//     description: 'Sort base on availableSort, type is `asc` and `desc`',
// }),
// ApiResponse({
//     status: HttpStatus.OK,
//     schema,
// }),
// ...docs

// export function Doc<T>(document: IResponseDoc): any {
//     const docs = [];
//     const schema: Record<string, any> = {
//         allOf: [{ $ref: getSchemaPath(ResponseDefaultSerialization<T>) }],
//         properties: {
//             message: {
//                 example: document.messagePath,
//             },
//             statusCode: {
//                 type: 'number',
//                 example: document.statusCode || HttpStatus.OK,
//             },
//         },
//     };

//     if (document.serialization) {
//         docs.push(ApiExtraModels(document.serialization));
//         schema.properties = {
//             ...schema.properties,
//             data: {
//                 $ref: getSchemaPath(document.serialization),
//             },
//         };
//     }

//     return applyDecorators(
//         ApiExtraModels(ResponseDefaultSerialization<T>),
//         ApiResponse({
//             status: document.httpStatus,
//             schema,
//         }),
//         ...docs
//     );
// }

export function DocOneOf<T>(
    httpStatus: HttpStatus,
    ...documents: IDocOfOptions[]
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

export function DocAnyOf<T>(
    httpStatus: HttpStatus,
    ...documents: IDocOfOptions[]
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

export function DocAllOf<T>(
    httpStatus: HttpStatus,
    ...documents: IDocOfOptions[]
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
