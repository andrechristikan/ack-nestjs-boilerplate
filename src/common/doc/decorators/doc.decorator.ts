import { HttpStatus, applyDecorators } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiHeaders,
    ApiOperation,
    ApiParam,
    ApiProduces,
    ApiQuery,
    ApiResponse,
    ApiSecurity,
    SchemaObject,
} from '@nestjs/swagger';
import { createSchema } from 'zod-openapi';
import { z } from 'zod';
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
import { ResponseSchema } from '@common/response/dtos/response.dto';
import { ResponsePagingSchema } from '@common/response/dtos/response.paging.dto';
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

function createEnvelopeSchemaObject(
    envelope: z.ZodObject,
    messagePath: string,
    statusCode: number
): SchemaObject {
    const documented = envelope.extend({
        message: envelope.shape.message.meta({ example: messagePath }),
        statusCode: envelope.shape.statusCode.meta({ example: statusCode }),
    });

    return createSchema(documented, { io: 'output' }).schema as SchemaObject;
}

function createSchemaObject(doc: IDocOfOptions): SchemaObject {
    return createEnvelopeSchemaObject(
        doc.schema
            ? ResponseSchema.extend({ data: doc.schema })
            : ResponseSchema,
        doc.messagePath,
        doc.statusCode ?? HttpStatus.OK
    );
}

/**
 * Documents a single response with the standard envelope (message, statusCode, optional data).
 */
export function DocDefault<T>(options: IDocDefaultOptions<T>): MethodDecorator {
    return applyDecorators(
        ApiResponse({
            description: options.httpStatus.toString(),
            status: options.httpStatus,
            schema: createSchemaObject(options),
        })
    );
}

/**
 * Documents a response that may match one of several schemas (OpenAPI `oneOf`).
 */
export function DocOneOf(
    httpStatus: HttpStatus,
    ...documents: IDocOfOptions[]
): MethodDecorator {
    const oneOf: SchemaObject[] = documents.map(doc => createSchemaObject(doc));

    return applyDecorators(
        ApiResponse({
            description: httpStatus.toString(),
            status: httpStatus,
            schema: {
                oneOf,
            },
        })
    );
}

/**
 * Documents a response that may match any combination of schemas (OpenAPI `anyOf`).
 */
export function DocAnyOf(
    httpStatus: HttpStatus,
    ...documents: IDocOfOptions[]
): MethodDecorator {
    const anyOf: SchemaObject[] = documents.map(doc => createSchemaObject(doc));

    return applyDecorators(
        ApiResponse({
            description: httpStatus.toString(),
            status: httpStatus,
            schema: {
                anyOf,
            },
        })
    );
}

/**
 * Documents a response that must satisfy all provided schemas (OpenAPI `allOf`).
 */
export function DocAllOf(
    httpStatus: HttpStatus,
    ...documents: IDocOfOptions[]
): MethodDecorator {
    const allOf: SchemaObject[] = documents.map(doc => createSchemaObject(doc));

    return applyDecorators(
        ApiResponse({
            description: httpStatus.toString(),
            status: httpStatus,
            schema: {
                allOf,
            },
        })
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
 * Documents params and queries. `ApiConsumes` is added only when `bodyType`
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

    if (options?.schema) {
        docs.push(
            ApiBody({
                schema: createSchema(options.schema, {
                    io: 'input',
                }).schema as SchemaObject,
            })
        );
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
 * Documents a standard JSON success response with an i18n message and optional data schema.
 */
export function DocResponse<T = void>(
    messagePath: string,
    options?: IDocResponseOptions<T>
): MethodDecorator {
    const docs: IDocDefaultOptions<T> = {
        httpStatus: options?.httpStatus ?? HttpStatus.OK,
        messagePath,
        statusCode: options?.statusCode ?? options?.httpStatus ?? HttpStatus.OK,
    };

    if (options?.schema) {
        docs.schema = options.schema;
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
        ApiResponse({
            description:
                options.httpStatus?.toString() ?? HttpStatus.OK.toString(),
            status: options.httpStatus ?? HttpStatus.OK,
            schema: createEnvelopeSchemaObject(
                ResponsePagingSchema.extend({
                    data: z.array(options.schema).meta({
                        description: 'Page of result items',
                        example: [],
                    }),
                }),
                messagePath,
                options.statusCode ?? options.httpStatus ?? HttpStatus.OK
            ),
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

    if (options.availableOrderBy) {
        docs.push(
            ApiQuery({
                name: 'orderBy',
                required: false,
                allowEmptyValue: true,
                isArray: true,
                example: `${options.availableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
                type: 'string',
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${options.availableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
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
