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
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import {
    DocContentTypeMapping,
    DocFileErrorResponses,
    DocPaginationCursorQueries,
    DocPaginationErrorResponses,
    DocPaginationOffsetQueries,
    DocStandardErrorResponse,
} from '@common/doc/constants/doc.constant';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { faker } from '@faker-js/faker';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';

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
                    default: EnumMessageLanguage.en,
                    example: EnumMessageLanguage.en,
                    type: 'string',
                },
            },
            {
                name: 'x-correlation-id',
                description:
                    'Correlation identifier for tracking requests across services',
                required: false,
                schema: {
                    example: faker.string.uuid(),
                    type: 'string',
                },
            },
        ]),
        DocStandardErrorResponse.internalServerError,
        DocStandardErrorResponse.requestTimeout,
        DocStandardErrorResponse.validationError,
        DocStandardErrorResponse.envForbidden,
        DocStandardErrorResponse.paramRequired
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

    if (options?.bodyType && options.bodyType in DocContentTypeMapping) {
        docs.push(ApiConsumes(DocContentTypeMapping[options.bodyType]));
    } else {
        docs.push(ApiConsumes('none'));
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
    const docs: Array<ClassDecorator | MethodDecorator> = [
        DocFileErrorResponses.extensionInvalid,
        DocFileErrorResponses.required,
        DocFileErrorResponses.requiredExtractFirst,
    ];

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
 * Creates an API documentation decorator for endpoints protected by authorization guards (role, policy, term policy).
 *
 * This decorator will automatically document possible forbidden (403) responses for each guard type enabled in the options:
 * - If `role` is true, adds forbidden response for role-based access control.
 * - If `policy` is true, adds forbidden response for policy-based access control.
 * - If `termPolicy` is true, adds forbidden response for term policy acceptance.
 *
 * @param {IDocGuardOptions} [options] - Guard documentation options:
 *   - role: boolean — Document forbidden if role is insufficient
 *   - policy: boolean — Document forbidden if policy is violated
 *   - termPolicy: boolean — Document forbidden if term policy not accepted
 * @returns {MethodDecorator} Swagger method decorator with forbidden responses for enabled guards
 */
export function DocGuard(options?: IDocGuardOptions): MethodDecorator {
    const oneOfForbidden: IDocOfOptions[] = [];

    if (options?.role) {
        oneOfForbidden.push({
            statusCode: EnumRoleStatusCodeError.forbidden,
            messagePath: 'role.error.forbidden',
        });
    }

    if (options?.policy) {
        oneOfForbidden.push({
            statusCode: EnumPolicyStatusCodeError.forbidden,
            messagePath: 'policy.error.forbidden',
        });
    }

    if (options?.termPolicy) {
        oneOfForbidden.push({
            statusCode: EnumTermPolicyStatusCodeError.requiredInvalid,
            messagePath: 'termPolicy.error.requiredInvalid',
        });
    }

    return applyDecorators(DocOneOf(HttpStatus.FORBIDDEN, ...oneOfForbidden));
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

    if (options?.jwtRefreshToken) {
        docs.push(ApiBearerAuth('refreshToken'));
        oneOfUnauthorized.push({
            messagePath: 'auth.error.refreshTokenUnauthorized',
            statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
        });
    }

    if (options?.jwtAccessToken) {
        docs.push(ApiBearerAuth('accessToken'));
        oneOfUnauthorized.push({
            messagePath: 'auth.error.accessTokenUnauthorized',
            statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
        });
    }

    if (options?.google) {
        docs.push(ApiBearerAuth('google'));
        oneOfUnauthorized.push(
            {
                messagePath: 'auth.error.socialGoogleInvalid',
                statusCode: EnumAuthStatusCodeError.socialGoogleInvalid,
            },
            {
                messagePath: 'auth.error.socialGoogleRequired',
                statusCode: EnumAuthStatusCodeError.socialGoogleRequired,
            }
        );
    }

    if (options?.apple) {
        docs.push(ApiBearerAuth('apple'));
        oneOfUnauthorized.push(
            {
                messagePath: 'auth.error.socialAppleInvalid',
                statusCode: EnumAuthStatusCodeError.socialAppleInvalid,
            },
            {
                messagePath: 'auth.error.socialAppleRequired',
                statusCode: EnumAuthStatusCodeError.socialAppleRequired,
            }
        );
    }

    if (options?.xApiKey) {
        docs.push(ApiSecurity('xApiKey'));
        oneOfUnauthorized.push(
            {
                statusCode: EnumApiKeyStatusCodeError.xApiKeyRequired,
                messagePath: 'apiKey.error.xApiKey.required',
            },
            {
                statusCode: EnumApiKeyStatusCodeError.xApiKeyNotFound,
                messagePath: 'apiKey.error.xApiKey.notFound',
            },
            {
                statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
                messagePath: 'apiKey.error.xApiKey.invalid',
            },
            {
                statusCode: EnumApiKeyStatusCodeError.xApiKeyForbidden,
                messagePath: 'apiKey.error.xApiKey.forbidden',
            }
        );
    }

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
 * Creates an API documentation decorator for paginated response endpoints.
 * This decorator automatically includes pagination query parameters and sets up the response schema
 * for paginated data with metadata about total count, current page, etc.
 *
 * The decorator supports two pagination types:
 * - **CURSOR**: Uses cursor-based pagination queries (cursor, nextCursor, previousCursor)
 * - **OFFSET**: Uses offset-based pagination queries (page, perPage, limit, offset)
 *
 * It also supports optional search and ordering functionality.
 * @template T - Type of the DTO for paginated response data
 * @param {string} messagePath - The message path/key for internationalization
 * @param {IDocResponsePagingOptions<T>} options - Configuration for paginated response documentation
 * @param {EnumPaginationType} options.type - Pagination type (CURSOR or OFFSET) to determine which query parameters to include
 * @returns {MethodDecorator} A method decorator that applies Swagger paginated response documentation
 */
export function DocResponsePaging<T>(
    messagePath: string,
    options: IDocResponsePagingOptions<T>
): MethodDecorator {
    const docs = [
        ApiProduces('application/json'),
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
        ...Object.values(DocPaginationErrorResponses),
    ];

    if (options.type === EnumPaginationType.cursor) {
        docs.push(...DocPaginationCursorQueries.map(query => ApiQuery(query)));
    } else {
        docs.push(...DocPaginationOffsetQueries.map(query => ApiQuery(query)));
    }

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
                example: EnumPaginationOrderDirectionType.asc,
                enum: EnumPaginationOrderDirectionType,
                type: 'string',
                description: `Order direction, available values: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}.`,
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
        ApiProduces(options?.extension ?? EnumFileExtensionDocument.csv),
        ApiResponse({
            description: httpStatus.toString(),
            status: httpStatus,
        })
    );
}
