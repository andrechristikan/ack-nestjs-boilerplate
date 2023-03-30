import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiExtraModels,
    ApiHeader,
    ApiHeaders,
    ApiParam,
    ApiProduces,
    ApiQuery,
    ApiResponse,
    ApiSecurity,
    getSchemaPath,
} from '@nestjs/swagger';
import { APP_LANGUAGE } from 'src/app/constants/app.constant';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/common/api-key/constants/api-key.status-code.constant';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/common/auth/constants/auth.status-code.constant';
import {
    ENUM_DOC_REQUEST_BODY_TYPE,
    ENUM_DOC_RESPONSE_BODY_TYPE,
} from 'src/common/doc/constants/doc.enum.constant';
import {
    IDocDefaultOptions,
    IDocOfOptions,
    IDocOptions,
    IDocPagingOptions,
} from 'src/common/doc/interfaces/doc.interface';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { ENUM_FILE_EXCEL_MIME } from 'src/common/file/constants/file.enum.constant';
import { FileMultipleDto } from 'src/common/file/dtos/file.multiple.dto';
import { FileSingleDto } from 'src/common/file/dtos/file.single.dto';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { Skip } from 'src/common/request/validations/request.skip.validation';
import { ResponseDefaultSerialization } from 'src/common/response/serializations/response.default.serialization';
import { ResponsePagingSerialization } from 'src/common/response/serializations/response.paging.serialization';

export function Doc<T>(
    messagePath: string,
    options?: IDocOptions<T>
): MethodDecorator {
    const docs = [];
    const normDoc: IDocDefaultOptions = {
        httpStatus: options?.response?.httpStatus ?? HttpStatus.OK,
        messagePath,
        statusCode: options?.response?.statusCode,
    };

    if (!normDoc.statusCode) {
        normDoc.statusCode = normDoc.httpStatus;
    }

    if (options?.request?.bodyType === ENUM_DOC_REQUEST_BODY_TYPE.FORM_DATA) {
        docs.push(ApiConsumes('multipart/form-data'));

        if (options?.request?.file?.multiple) {
            docs.push(
                ApiBody({
                    description: 'Multiple file',
                    type: FileMultipleDto,
                })
            );
        } else if (!options?.request?.file?.multiple) {
            docs.push(
                ApiBody({
                    description: 'Single file',
                    type: FileSingleDto,
                })
            );
        }
    } else if (options?.request?.bodyType === ENUM_DOC_REQUEST_BODY_TYPE.TEXT) {
        docs.push(ApiConsumes('text/plain'));
    } else {
        docs.push(ApiConsumes('application/json'));
    }

    if (options?.response?.bodyType === ENUM_DOC_RESPONSE_BODY_TYPE.FILE) {
        docs.push(ApiProduces(ENUM_FILE_EXCEL_MIME.XLSX));
    } else if (
        options?.response?.bodyType === ENUM_DOC_RESPONSE_BODY_TYPE.TEXT
    ) {
        docs.push(ApiProduces('text/plain'));
    } else {
        docs.push(ApiProduces('application/json'));
        if (options?.response?.serialization) {
            normDoc.serialization = options?.response?.serialization;
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
        auths.push(ApiSecurity('apiKey'));
        oneOfUnauthorized.push(
            {
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NEEDED_ERROR,
                messagePath: 'apiKey.error.keyNeeded',
            },
            {
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR,
                messagePath: 'apiKey.error.notFound',
            },
            {
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_INACTIVE_ERROR,
                messagePath: 'apiKey.error.inactive',
            },
            {
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_INVALID_ERROR,
                messagePath: 'apiKey.error.invalid',
            }
        );
    }

    if (options?.auth?.permissionToken) {
        auths.push(ApiSecurity('permissionToken'));
        oneOfUnauthorized.push(
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PERMISSION_TOKEN_ERROR,
                messagePath: 'auth.error.permissionTokenUnauthorized',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PERMISSION_TOKEN_INVALID_ERROR,
                messagePath: 'auth.error.permissionTokenInvalid',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PERMISSION_TOKEN_NOT_YOUR_ERROR,
                messagePath: 'auth.error.permissionTokenNotYour',
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
        ApiHeader({
            name: 'x-custom-lang',
            description: 'Custom language header',
            required: false,
            schema: {
                default: APP_LANGUAGE,
                example: APP_LANGUAGE,
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

export function DocPaging<T>(
    messagePath: string,
    options: IDocPagingOptions<T>
): MethodDecorator {
    // paging
    const docs = [];

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
        auths.push(ApiSecurity('apiKey'));
        oneOfUnauthorized.push(
            {
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NEEDED_ERROR,
                messagePath: 'apiKey.error.keyNeeded',
            },
            {
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR,
                messagePath: 'apiKey.error.notFound',
            },
            {
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_INACTIVE_ERROR,
                messagePath: 'apiKey.error.inactive',
            },
            {
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_INVALID_ERROR,
                messagePath: 'apiKey.error.invalid',
            }
        );
    }

    if (options?.auth?.permissionToken) {
        auths.push(ApiSecurity('permissionToken'));
        oneOfUnauthorized.push(
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PERMISSION_TOKEN_ERROR,
                messagePath: 'auth.error.permissionTokenUnauthorized',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PERMISSION_TOKEN_INVALID_ERROR,
                messagePath: 'auth.error.permissionTokenInvalid',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PERMISSION_TOKEN_NOT_YOUR_ERROR,
                messagePath: 'auth.error.permissionTokenNotYour',
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
        // paging
        ApiConsumes('application/json'),
        ApiExtraModels(ResponsePagingSerialization<T>),
        ApiExtraModels(options.response.serialization),
        ApiResponse({
            status: HttpStatus.OK,
            schema: {
                allOf: [
                    { $ref: getSchemaPath(ResponsePagingSerialization<T>) },
                ],
                properties: {
                    message: {
                        example: messagePath,
                    },
                    statusCode: {
                        type: 'number',
                        example: options.response.statusCode ?? HttpStatus.OK,
                    },
                    data: {
                        type: 'array',
                        items: {
                            $ref: getSchemaPath(options.response.serialization),
                        },
                    },
                    // todo metadata
                    // _metadata: {
                    //     pagination: {
                    //         availableSearch: options.response.availableSearch
                    //     }
                    // },
                    // '_metadata.pagination.availableOrderBy': {
                    //     example: options.response.availableOrderBy,
                    // },
                },
            },
        }),
        ApiQuery({
            name: 'search',
            required: false,
            allowEmptyValue: true,
            type: 'string',
            description:
                'Search will base on _availableSearch with rule contains, and case insensitive',
        }),
        ApiQuery({
            name: 'perPage',
            required: false,
            allowEmptyValue: true,
            example: 20,
            type: 'number',
            description: 'Data per page',
        }),
        ApiQuery({
            name: 'page',
            required: false,
            allowEmptyValue: true,
            example: 1,
            type: 'number',
            description: 'page number',
        }),
        ApiQuery({
            name: 'orderBy',
            required: false,
            allowEmptyValue: true,
            example: 'createdAt',
            type: 'string',
            description: 'Order by base on _availableOrderBy',
        }),
        ApiQuery({
            name: 'orderDirection',
            required: false,
            allowEmptyValue: true,
            example: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
            enum: ENUM_PAGINATION_ORDER_DIRECTION_TYPE,
            type: 'string',
            description: 'Order direction base on _availableOrderDirection',
        }),

        // default
        ApiHeader({
            name: 'x-custom-lang',
            description: 'Custom language header',
            required: false,
            schema: {
                default: APP_LANGUAGE,
                example: APP_LANGUAGE,
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

export function DocDefault<T>(options: IDocDefaultOptions): MethodDecorator {
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

export function DocOneOf<T>(
    httpStatus: HttpStatus,
    ...documents: IDocOfOptions[]
): MethodDecorator {
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
                    example: doc.statusCode ?? HttpStatus.OK,
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
): MethodDecorator {
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
                    example: doc.statusCode ?? HttpStatus.OK,
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
): MethodDecorator {
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
                    example: doc.statusCode ?? HttpStatus.OK,
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
