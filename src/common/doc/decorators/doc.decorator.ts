import { HttpStatus, applyDecorators } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiExtraModels,
    ApiHeaders,
    ApiOperation,
    ApiParam,
    ApiProduces,
    ApiQuery,
    ApiResponse,
    ApiSecurity,
    getSchemaPath,
} from '@nestjs/swagger';
import {
    IDocAuthOptions,
    IDocDefaultOptions,
    IDocGuardOptions,
    IDocOfOptions,
    IDocOptions,
    IDocRequestFileOptions,
    IDocRequestOptions,
    IDocResponseFileOptions,
    IDocResponseOptions,
    IDocResponsePagingOptions,
} from '@common/doc/interfaces/doc.interface';
import { ResponseDto } from '@common/response/dtos/response.dto';
import { ResponsePagingDto } from '@common/response/dtos/response.paging.dto';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from '@modules/api-key/enums/api-key.status-code.enum';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@modules/auth/enums/auth.status-code.enum';
import { ENUM_POLICY_STATUS_CODE_ERROR } from '@modules/policy/enums/policy.status-code.enum';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@common/pagination/enums/pagination.enum';
import {
    DOC_CONTENT_TYPE_MAPPING,
    DOC_PAGINATION_QUERIES,
    DOC_STANDARD_ERROR_RESPONSES,
} from '@common/doc/constants/doc.constant';
import { ENUM_ROLE_STATUS_CODE_ERROR } from '@modules/role/enums/role.status-code.enum';
import { ENUM_FILE_EXTENSION } from '@common/file/enums/file.enum';

/**
 * Helper function to create a schema object with consistent structure.
 * @param doc - Document options containing DTO and status information
 * @returns Schema object for OpenAPI specification
 */
function createSchemaObject(doc: IDocOfOptions): SchemaObject {
    const schema: SchemaObject = {
        allOf: [{ $ref: getSchemaPath(ResponseDto) }],
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

    if (doc.dto) {
        schema.properties = {
            ...schema.properties,
            data: {
                $ref: getSchemaPath(doc.dto),
            },
        };
    }

    return schema;
}

/**
 * Creates a default API documentation decorator with a standard response schema.
 * This decorator defines the basic structure for API responses including message, status code, and optional data.
 * @template T - Type of the optional DTO for response data
 * @param {IDocDefaultOptions<T>} options - Configuration options for the default documentation
 * @returns {MethodDecorator} A method decorator that applies Swagger API documentation
 */
export function DocDefault<T>(options: IDocDefaultOptions<T>): MethodDecorator {
    const docs = [];
    const schema: SchemaObject = {
        allOf: [{ $ref: getSchemaPath(ResponseDto) }],
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

    if (options.dto) {
        docs.push(ApiExtraModels(options.dto));
        schema.properties = {
            ...schema.properties,
            data: {
                $ref: getSchemaPath(options.dto),
            },
        };
    }

    return applyDecorators(
        ApiExtraModels(ResponseDto),
        ApiResponse({
            description: options.httpStatus.toString(),
            status: options.httpStatus,
            schema,
        }),
        ...docs
    );
}

/**
 * Creates an API documentation decorator that supports multiple possible response schemas using OpenAPI's `oneOf`.
 * This is useful when an endpoint can return one of several different response types.
 * @param {HttpStatus} httpStatus - The HTTP status code for the response
 * @param {...IDocOfOptions[]} documents - Variable number of document options, each representing a possible response
 * @returns {MethodDecorator} A method decorator that applies Swagger API documentation with oneOf schema
 */
export function DocOneOf(
    httpStatus: HttpStatus,
    ...documents: IDocOfOptions[]
): MethodDecorator {
    const docs = [];
    const oneOf = [];

    for (const doc of documents) {
        const oneOfSchema = createSchemaObject(doc);

        if (doc.dto) {
            docs.push(ApiExtraModels(doc.dto));
        }

        oneOf.push(oneOfSchema);
    }

    return applyDecorators(
        ApiExtraModels(ResponseDto),
        ApiResponse({
            description: httpStatus.toString(),
            status: httpStatus,
            schema: {
                oneOf,
            },
        }),
        ...docs
    );
}

/**
 * Creates an API documentation decorator that supports multiple possible response schemas using OpenAPI's `anyOf`.
 * This allows for responses that can match any combination of the provided schemas.
 * @param {HttpStatus} httpStatus - The HTTP status code for the response
 * @param {...IDocOfOptions[]} documents - Variable number of document options, each representing a possible response schema
 * @returns {MethodDecorator} A method decorator that applies Swagger API documentation with anyOf schema
 */
export function DocAnyOf(
    httpStatus: HttpStatus,
    ...documents: IDocOfOptions[]
): MethodDecorator {
    const docs = [];
    const anyOf = [];

    for (const doc of documents) {
        const anyOfSchema = createSchemaObject(doc);

        if (doc.dto) {
            docs.push(ApiExtraModels(doc.dto));
        }

        anyOf.push(anyOfSchema);
    }

    return applyDecorators(
        ApiExtraModels(ResponseDto),
        ApiResponse({
            description: httpStatus.toString(),
            status: httpStatus,
            schema: {
                anyOf,
            },
        }),
        ...docs
    );
}

/**
 * Creates an API documentation decorator that requires all provided response schemas using OpenAPI's `allOf`.
 * This means the response must satisfy all the provided schema definitions.
 * @param {HttpStatus} httpStatus - The HTTP status code for the response
 * @param {...IDocOfOptions[]} documents - Variable number of document options, all of which must be satisfied
 * @returns {MethodDecorator} A method decorator that applies Swagger API documentation with allOf schema
 */
export function DocAllOf(
    httpStatus: HttpStatus,
    ...documents: IDocOfOptions[]
): MethodDecorator {
    const docs = [];
    const allOf = [];

    for (const doc of documents) {
        const allOfSchema = createSchemaObject(doc);

        if (doc.dto) {
            docs.push(ApiExtraModels(doc.dto));
        }

        allOf.push(allOfSchema);
    }

    return applyDecorators(
        ApiExtraModels(ResponseDto),
        ApiResponse({
            description: httpStatus.toString(),
            status: httpStatus,
            schema: {
                allOf,
            },
        }),
        ...docs
    );
}

/**
 * Creates a basic API documentation decorator that sets up common API operation metadata.
 * This decorator automatically includes standard error responses and custom language headers.
 * @param {IDocOptions} [options] - Optional configuration for the API documentation
 * @returns {MethodDecorator} A method decorator that applies basic Swagger API documentation
 */
export function Doc(options?: IDocOptions): MethodDecorator {
    return applyDecorators(
        ApiOperation({
            summary: options?.summary,
            deprecated: options?.deprecated,
            description: options?.description,
            operationId: options?.operation,
        }),
        ApiHeaders([
            {
                name: 'x-custom-lang',
                description: 'Custom language header',
                required: false,
                schema: {
                    default: ENUM_MESSAGE_LANGUAGE.EN,
                    example: ENUM_MESSAGE_LANGUAGE.EN,
                    type: 'string',
                },
            },
        ]),
        DOC_STANDARD_ERROR_RESPONSES.INTERNAL_SERVER_ERROR,
        DOC_STANDARD_ERROR_RESPONSES.REQUEST_TIMEOUT
    );
}

/**
 * Creates an API documentation decorator for request specifications including body, parameters, and queries.
 * This decorator handles different content types and automatically adds validation error responses.
 * @param {IDocRequestOptions} [options] - Optional configuration for request documentation
 * @returns {MethodDecorator} A method decorator that applies Swagger request documentation
 */
export function DocRequest(options?: IDocRequestOptions): MethodDecorator {
    const docs: Array<ClassDecorator | MethodDecorator> = [];

    if (options?.bodyType && options.bodyType in DOC_CONTENT_TYPE_MAPPING) {
        docs.push(ApiConsumes(DOC_CONTENT_TYPE_MAPPING[options.bodyType]));
    } else {
        docs.push(ApiConsumes('none'));
    }

    if (options?.bodyType) {
        docs.push(DOC_STANDARD_ERROR_RESPONSES.VALIDATION_ERROR);
    }

    if (options?.params?.length) {
        docs.push(...options.params.map(param => ApiParam(param)));
    }

    if (options?.queries?.length) {
        docs.push(...options.queries.map(query => ApiQuery(query)));
    }

    if (options?.dto) {
        docs.push(ApiBody({ type: options?.dto }));
    }

    return applyDecorators(...docs);
}

/**
 * Creates an API documentation decorator specifically for file upload endpoints.
 * This decorator automatically sets the content type to multipart/form-data and handles file-related parameters.
 * @param {IDocRequestFileOptions} [options] - Optional configuration for file request documentation
 * @returns {MethodDecorator} A method decorator that applies Swagger file upload documentation
 */
export function DocRequestFile(
    options?: IDocRequestFileOptions
): MethodDecorator {
    const docs: Array<ClassDecorator | MethodDecorator> = [];

    if (options?.params?.length) {
        docs.push(...options.params.map(param => ApiParam(param)));
    }

    if (options?.queries?.length) {
        docs.push(...options.queries.map(query => ApiQuery(query)));
    }

    if (options?.dto) {
        docs.push(ApiBody({ type: options?.dto }));
    }

    return applyDecorators(ApiConsumes('multipart/form-data'), ...docs);
}

/**
 * Creates an API documentation decorator for endpoints that require authorization guards.
 * This decorator automatically documents forbidden responses based on the guard types used.
 * @param {IDocGuardOptions} [options] - Optional configuration for guard documentation
 * @returns {MethodDecorator} A method decorator that applies Swagger guard documentation
 */
export function DocGuard(options?: IDocGuardOptions): MethodDecorator {
    const oneOfForbidden: IDocOfOptions[] = [];
    const docs: Array<ClassDecorator | MethodDecorator> = [];

    const guardErrors = [
        {
            condition: options?.role,
            error: {
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.FORBIDDEN,
                messagePath: 'role.error.forbidden',
            },
        },
        {
            condition: options?.policy,
            error: {
                statusCode: ENUM_POLICY_STATUS_CODE_ERROR.FORBIDDEN,
                messagePath: 'policy.error.forbidden',
            },
        },
        {
            condition: options?.twoFactor,
            error: {
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.TWO_FACTOR_FORBIDDEN,
                messagePath: 'auth.error.twoFactorForbidden',
            },
            decorator: ApiBearerAuth('twoFactor'),
        },
    ];

    guardErrors.forEach(({ condition, error, decorator }) => {
        if (condition) {
            oneOfForbidden.push(error);
            if (decorator) {
                docs.push(decorator);
            }
        }
    });

    return applyDecorators(
        ...docs,
        DocOneOf(HttpStatus.FORBIDDEN, ...oneOfForbidden)
    );
}

/**
 * Creates an API documentation decorator for endpoints that require authentication.
 * This decorator handles various authentication methods and their corresponding error responses.
 * @param {IDocAuthOptions} [options] - Optional configuration for authentication documentation
 * @returns {MethodDecorator} A method decorator that applies Swagger authentication documentation
 */
export function DocAuth(options?: IDocAuthOptions): MethodDecorator {
    const docs: Array<ClassDecorator | MethodDecorator> = [];
    const oneOfUnauthorized: IDocOfOptions[] = [];

    const authConfigs = [
        {
            condition: options?.jwtRefreshToken,
            decorator: ApiBearerAuth('refreshToken'),
            errors: [
                {
                    messagePath: 'auth.error.refreshTokenUnauthorized',
                    statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_REFRESH_TOKEN,
                },
            ],
        },
        {
            condition: options?.jwtAccessToken,
            decorator: ApiBearerAuth('accessToken'),
            errors: [
                {
                    messagePath: 'auth.error.accessTokenUnauthorized',
                    statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                },
            ],
        },
        {
            condition: options?.google,
            decorator: ApiBearerAuth('google'),
            errors: [
                {
                    messagePath: 'auth.error.socialGoogleInvalid',
                    statusCode:
                        ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_GOOGLE_INVALID,
                },
                {
                    messagePath: 'auth.error.socialGoogleRequired',
                    statusCode:
                        ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_GOOGLE_REQUIRED,
                },
            ],
        },
        {
            condition: options?.apple,
            decorator: ApiBearerAuth('apple'),
            errors: [
                {
                    messagePath: 'auth.error.socialAppleInvalid',
                    statusCode:
                        ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_APPLE_INVALID,
                },
                {
                    messagePath: 'auth.error.socialAppleRequired',
                    statusCode:
                        ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_APPLE_REQUIRED,
                },
            ],
        },
        {
            condition: options?.xApiKey,
            decorator: ApiSecurity('xApiKey'),
            errors: [
                {
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_REQUIRED,
                    messagePath: 'apiKey.error.xApiKey.required',
                },
                {
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_NOT_FOUND,
                    messagePath: 'apiKey.error.xApiKey.notFound',
                },
                {
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INVALID,
                    messagePath: 'apiKey.error.xApiKey.invalid',
                },
                {
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_FORBIDDEN,
                    messagePath: 'apiKey.error.xApiKey.forbidden',
                },
            ],
        },
    ];

    authConfigs.forEach(({ condition, decorator, errors }) => {
        if (condition) {
            docs.push(decorator);
            oneOfUnauthorized.push(...errors);
        }
    });

    return applyDecorators(
        ...docs,
        DocOneOf(HttpStatus.UNAUTHORIZED, ...oneOfUnauthorized)
    );
}

/**
 * Creates an API documentation decorator for standard response documentation.
 * This decorator sets up the response schema with the specified message and optional DTO.
 * @template T - Type of the optional DTO for response data
 * @param {string} messagePath - The message path/key for internationalization
 * @param {IDocResponseOptions<T>} [options] - Optional configuration for response documentation
 * @returns {MethodDecorator} A method decorator that applies Swagger response documentation
 */
export function DocResponse<T = void>(
    messagePath: string,
    options?: IDocResponseOptions<T>
): MethodDecorator {
    const docs: IDocDefaultOptions = {
        httpStatus: options?.httpStatus ?? HttpStatus.OK,
        messagePath,
        statusCode: options?.statusCode ?? options?.httpStatus ?? HttpStatus.OK,
    };

    if (options?.dto) {
        docs.dto = options?.dto;
    }

    return applyDecorators(ApiProduces('application/json'), DocDefault(docs));
}

/**
 * Groups multiple error documentation decorators into a single decorator.
 * This is useful for combining common error responses that apply to multiple endpoints.
 * @param {MethodDecorator[]} docs - Array of method decorators representing different error scenarios
 * @returns {MethodDecorator} A method decorator that applies all the provided error documentation
 */
export function DocErrorGroup(docs: MethodDecorator[]): MethodDecorator {
    return applyDecorators(...docs);
}

/**
 * Creates an API documentation decorator for paginated response endpoints.
 * This decorator automatically includes pagination query parameters and sets up the response schema
 * for paginated data with metadata about total count, current page, etc.
 * It also supports optional search and ordering functionality.
 * @template T - Type of the DTO for paginated response data
 * @param {string} messagePath - The message path/key for internationalization
 * @param {IDocResponsePagingOptions<T>} options - Configuration for paginated response documentation
 * @returns {MethodDecorator} A method decorator that applies Swagger paginated response documentation
 */
export function DocResponsePaging<T>(
    messagePath: string,
    options: IDocResponsePagingOptions<T>
): MethodDecorator {
    const docs = [
        ApiProduces('application/json'),
        ...DOC_PAGINATION_QUERIES.map(query => ApiQuery(query)),
        ApiExtraModels(ResponsePagingDto),
        ApiExtraModels(options.dto),
        ApiResponse({
            description:
                options.httpStatus?.toString() ?? HttpStatus.OK.toString(),
            status: options.httpStatus ?? HttpStatus.OK,
            schema: {
                allOf: [{ $ref: getSchemaPath(ResponsePagingDto) }],
                properties: {
                    message: {
                        example: messagePath,
                    },
                    statusCode: {
                        type: 'number',
                        example:
                            options.statusCode ??
                            options.httpStatus ??
                            HttpStatus.OK,
                    },
                    data: {
                        type: 'array',
                        items: {
                            $ref: getSchemaPath(options.dto),
                        },
                    },
                },
            },
        }),
    ];

    if (options.availableSearch) {
        docs.push(
            ApiQuery({
                name: 'search',
                required: false,
                allowEmptyValue: true,
                type: 'string',
                description: `Search query, available fields: ${options.availableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
            })
        );
    }

    if (options.availableOrder) {
        docs.push(
            ApiQuery({
                name: 'orderBy',
                required: false,
                allowEmptyValue: true,
                example: options.availableOrder[0],
                enum: options.availableOrder,
                type: 'string',
                description: `Order by field, available fields: ${options.availableOrder.join(', ')}.`,
            }),
            ApiQuery({
                name: 'orderDirection',
                required: false,
                allowEmptyValue: true,
                example: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
                enum: ENUM_PAGINATION_ORDER_DIRECTION_TYPE,
                type: 'string',
                description: `Order direction, available values: ${Object.values(ENUM_PAGINATION_ORDER_DIRECTION_TYPE).join(', ')}.`,
            })
        );
    }

    return applyDecorators(...docs);
}

/**
 * Creates an API documentation decorator for file download/response endpoints.
 * This decorator sets up the response to indicate that a file will be returned instead of JSON.
 * @param {IDocResponseFileOptions} [options] - Optional configuration for file response documentation
 * @returns {MethodDecorator} A method decorator that applies Swagger file response documentation
 */
export function DocResponseFile(
    options?: IDocResponseFileOptions
): MethodDecorator {
    const httpStatus: HttpStatus = options?.httpStatus ?? HttpStatus.OK;

    return applyDecorators(
        ApiProduces(options?.extension ?? ENUM_FILE_EXTENSION.CSV),
        ApiResponse({
            description: httpStatus.toString(),
            status: httpStatus,
        })
    );
}
