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
    generateSchema,
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
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import {
    DocContentTypeMapping,
    DocFileErrorResponses,
    DocPaginationCursorErrorResponses,
    DocPaginationCursorQueries,
    DocPaginationOffsetErrorResponses,
    DocPaginationOffsetQueries,
    DocPaginationSharedErrorResponses,
    DocStandardErrorResponse,
} from '@common/doc/constants/doc.constant';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { faker } from '@faker-js/faker';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';

// @note SchemaObject is not part of @nestjs/swagger's public exports; derive it from
// the public generateSchema return type instead of deep-importing dist internals.
type SchemaObject = ReturnType<typeof generateSchema>['schema'];

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
 * Documents a single response with the standard envelope (message, statusCode, optional data).
 */
export function DocDefault<T>(options: IDocDefaultOptions<T>): MethodDecorator {
    const docs: MethodDecorator[] = [];
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
 * Documents a response that may match one of several schemas (OpenAPI `oneOf`).
 */
export function DocOneOf(
    httpStatus: HttpStatus,
    ...documents: IDocOfOptions[]
): MethodDecorator {
    const docs: MethodDecorator[] = [];
    const oneOf: SchemaObject[] = [];

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
 * Documents a response that may match any combination of schemas (OpenAPI `anyOf`).
 */
export function DocAnyOf(
    httpStatus: HttpStatus,
    ...documents: IDocOfOptions[]
): MethodDecorator {
    const docs: MethodDecorator[] = [];
    const anyOf: SchemaObject[] = [];

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
 * Documents a response that must satisfy all provided schemas (OpenAPI `allOf`).
 */
export function DocAllOf(
    httpStatus: HttpStatus,
    ...documents: IDocOfOptions[]
): MethodDecorator {
    const docs: MethodDecorator[] = [];
    const allOf: SchemaObject[] = [];

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
 * Base endpoint doc: operation metadata, language/correlation headers, and standard error responses.
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
 * Documents request body, params, and queries. `ApiConsumes` is added only when `bodyType`
 * maps to a known MIME type; `none` or omitted skips it.
 */
export function DocRequest(options?: IDocRequestOptions): MethodDecorator {
    const docs: Array<ClassDecorator | MethodDecorator> = [];

    const mimeType =
        options?.bodyType && options.bodyType in DocContentTypeMapping
            ? DocContentTypeMapping[
                  options.bodyType as keyof typeof DocContentTypeMapping
              ]
            : null;

    if (mimeType) {
        docs.push(ApiConsumes(mimeType));
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
 * Documents a multipart/form-data file upload request plus file-related error responses.
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
 * Documents the 403 responses for each enabled authorization guard (role, policy, term policy).
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
 * Documents auth schemes (JWT, social, x-api-key) and their 401 responses per enabled option.
 */
export function DocAuth(options?: IDocAuthOptions): MethodDecorator {
    const docs: MethodDecorator[] = [];
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
 * Documents a standard JSON success response with an i18n message and optional DTO.
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
 * Documents a paginated response: data array plus cursor/offset queries, search, and order.
 * Reflects the public HTTP query contract only (`orderBy` as a single field), not richer
 * internal pagination shapes.
 */
export function DocResponsePaging<T>(
    messagePath: string,
    options: IDocResponsePagingOptions<T>
): MethodDecorator {
    const docs: MethodDecorator[] = [
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
        ...Object.values(DocPaginationSharedErrorResponses),
        ...(options.type === EnumPaginationType.cursor
            ? Object.values(DocPaginationCursorErrorResponses)
            : Object.values(DocPaginationOffsetErrorResponses)),
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
                isArray: true,
                example: `${options.availableOrder[0]}:${EnumPaginationOrderDirectionType.desc}`,
                type: 'string',
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${options.availableOrder.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
            })
        );
    }

    return applyDecorators(...docs);
}

/**
 * Documents a file download response (non-JSON), defaulting to CSV.
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
