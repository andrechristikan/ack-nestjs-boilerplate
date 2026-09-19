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
} from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger';
import { createSchema } from 'zod-openapi';
import { z } from 'zod';
import type {
    IDocAuthOptions,
    IDocGuardOptions,
    IDocOptions,
    IDocRequestFileOptions,
    IDocRequestOptions,
    IDocResponseEntry,
    IDocResponseErrorOptions,
    IDocResponseFileOptions,
    IDocResponseOptions,
    IDocResponsePaginationOptions,
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
    DocGlobalErrorResponses,
    DocPaginationCursorErrorResponses,
    DocPaginationCursorQueries,
    DocPaginationErrorResponses,
    DocPaginationOffsetErrorResponses,
    DocPaginationOffsetQueries,
    DocResponseEntryMetaKey,
} from '@common/doc/constants/doc.constant';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { faker } from '@faker-js/faker';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

/**
 * Accumulates documented response entries on the decorated method and re-emits every entry of
 * each status the incoming entries touch, so a later decorator cannot erase an earlier one. Each
 * entry's envelope is built here and nowhere else: `entry.envelope` or `ResponseSchema`, carrying
 * `entry.schema` as `data` when the entry declares one.
 */
function accumulateResponseEntries(
    entries: IDocResponseEntry[]
): MethodDecorator {
    return (target, propertyKey, descriptor): void => {
        if (entries.length === 0) {
            return;
        }

        const method = descriptor.value as object;
        const stored =
            (Reflect.getMetadata(DocResponseEntryMetaKey, method) as
                | IDocResponseEntry[]
                | undefined) ?? [];

        const accumulated: IDocResponseEntry[] = [...stored];
        const seen = new Set<string>(
            stored.map(
                entry =>
                    `${entry.httpStatus}:${entry.statusCode}:${entry.messagePath}`
            )
        );

        for (const entry of entries) {
            const key = `${entry.httpStatus}:${entry.statusCode}:${entry.messagePath}`;

            if (seen.has(key)) {
                continue;
            }

            seen.add(key);
            accumulated.push(entry);
        }

        Reflect.defineMetadata(DocResponseEntryMetaKey, accumulated, method);

        const described = new Set<HttpStatus>(
            stored.map(entry => entry.httpStatus)
        );
        const touched = new Set<HttpStatus>(
            entries.map(entry => entry.httpStatus)
        );

        for (const httpStatus of touched) {
            const schemas: SchemaObject[] = accumulated
                .filter(entry => entry.httpStatus === httpStatus)
                .map(entry => {
                    const envelope: z.ZodObject =
                        entry.envelope ?? ResponseSchema;
                    const enveloped: z.ZodObject = entry.schema
                        ? envelope.extend({ data: entry.schema })
                        : envelope;
                    const documented = enveloped.extend({
                        message: enveloped.shape.message.meta({
                            example: entry.messagePath,
                        }),
                        statusCode: enveloped.shape.statusCode.meta({
                            example: entry.statusCode ?? HttpStatus.OK,
                        }),
                    });

                    return createSchema(documented, { io: 'output' })
                        .schema as SchemaObject;
                });
            const schema: SchemaObject =
                schemas.length === 1 ? schemas[0] : { oneOf: schemas };
            const description = described.has(httpStatus)
                ? ''
                : httpStatus.toString();

            ApiResponse({ description, status: httpStatus, schema })(
                target,
                propertyKey,
                descriptor
            );
        }
    };
}

/**
 * Documents the error responses a status may return, accumulated with every other entry at that
 * status: a single entry emits a plain schema, two or more emit a `oneOf`.
 * @public
 */
export function DocResponseError(
    httpStatus: HttpStatus,
    ...entries: IDocResponseErrorOptions[]
): MethodDecorator {
    return accumulateResponseEntries(
        entries.map(entry => ({ ...entry, httpStatus }))
    );
}

/**
 * Base endpoint doc: operation metadata, language/correlation headers, and the global error responses.
 * @public
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
        DocGlobalErrorResponses.internalServerError,
        DocGlobalErrorResponses.requestTimeout,
        DocGlobalErrorResponses.validationError,
        DocGlobalErrorResponses.envForbidden,
        DocGlobalErrorResponses.tooManyRequests
    );
}

/**
 * Documents params and queries. `ApiConsumes` is added only when `bodyType`
 * maps to a known MIME type; `none` or omitted skips it.
 * @public
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
 * @public
 */
export function DocRequestFile(
    options?: IDocRequestFileOptions
): MethodDecorator {
    const docs: Array<ClassDecorator | MethodDecorator> = [
        DocFileErrorResponses.extensionInvalid,
        DocFileErrorResponses.required,
        DocFileErrorResponses.requiredExtractFirst,
        DocFileErrorResponses.exceedMaxSizeUpload,
        DocFileErrorResponses.exceedMaxFiles,
        DocFileErrorResponses.fieldUnexpected,
        DocFileErrorResponses.multipartInvalid,
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
 * Documents the 401 and 403 responses each enabled authorization guard (user, role, policy,
 * term policy) can return.
 * @public
 */
export function DocGuard(options?: IDocGuardOptions): MethodDecorator {
    const oneOfUnauthorized: IDocResponseErrorOptions[] = [];
    const oneOfForbidden: IDocResponseErrorOptions[] = [];

    if (options?.user) {
        oneOfUnauthorized.push({
            statusCode: EnumUserStatusCodeError.notAuthenticated,
            messagePath: 'user.error.notAuthenticated',
        });
        oneOfForbidden.push(
            {
                statusCode: EnumUserStatusCodeError.notFoundForbidden,
                messagePath: 'user.error.notFound',
            },
            {
                statusCode: EnumUserStatusCodeError.blockedForbidden,
                messagePath: 'user.error.blocked',
            },
            {
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
                messagePath: 'user.error.inactive',
            },
            {
                statusCode: EnumUserStatusCodeError.passwordExpired,
                messagePath: 'auth.error.passwordExpired',
            },
            {
                statusCode: EnumUserStatusCodeError.emailNotVerified,
                messagePath: 'user.error.emailNotVerified',
            }
        );
    }

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

    return accumulateResponseEntries([
        ...oneOfUnauthorized.map(document => ({
            ...document,
            httpStatus: HttpStatus.UNAUTHORIZED,
        })),
        ...oneOfForbidden.map(document => ({
            ...document,
            httpStatus: HttpStatus.FORBIDDEN,
        })),
    ]);
}

/**
 * Documents auth schemes (JWT, social, x-api-key) and the 401, 403 and 500 responses each
 * enabled option can return.
 * @public
 */
export function DocAuth(options?: IDocAuthOptions): MethodDecorator {
    const docs: MethodDecorator[] = [];
    const oneOfUnauthorized: IDocResponseErrorOptions[] = [];
    const oneOfForbidden: IDocResponseErrorOptions[] = [];
    const oneOfServerError: IDocResponseErrorOptions[] = [];

    if (options?.jwtRefreshToken) {
        docs.push(ApiBearerAuth('refreshToken'));
        oneOfUnauthorized.push({
            messagePath: 'auth.error.refreshTokenUnauthorized',
            statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
        });
    }

    if (options?.jwtAccessToken) {
        docs.push(ApiBearerAuth('accessToken'));
        oneOfUnauthorized.push(
            {
                messagePath: 'auth.error.accessTokenUnauthorized',
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
            },
            {
                messagePath: 'session.error.forbidden',
                statusCode: EnumSessionStatusCodeError.forbidden,
            }
        );
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
                statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
                messagePath: 'apiKey.error.xApiKey.invalid',
            }
        );
        oneOfForbidden.push(
            {
                statusCode: EnumApiKeyStatusCodeError.xApiKeyNotFound,
                messagePath: 'apiKey.error.xApiKey.notFound',
            },
            {
                statusCode: EnumApiKeyStatusCodeError.xApiKeyForbidden,
                messagePath: 'apiKey.error.xApiKey.forbidden',
            }
        );
        oneOfServerError.push({
            statusCode: EnumApiKeyStatusCodeError.xApiKeyPredefinedNotFound,
            messagePath: 'apiKey.error.xApiKey.predefinedNotFound',
        });
    }

    return applyDecorators(
        ...docs,
        accumulateResponseEntries([
            ...oneOfUnauthorized.map(document => ({
                ...document,
                httpStatus: HttpStatus.UNAUTHORIZED,
            })),
            ...oneOfForbidden.map(document => ({
                ...document,
                httpStatus: HttpStatus.FORBIDDEN,
            })),
            ...oneOfServerError.map(document => ({
                ...document,
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
            })),
        ])
    );
}

/**
 * Documents a standard JSON success response with an i18n message and optional data schema.
 * @public
 */
export function DocResponse<T = void>(
    messagePath: string,
    options?: IDocResponseOptions<T>
): MethodDecorator {
    const docs: IDocResponseEntry<T> = {
        httpStatus: options?.httpStatus ?? HttpStatus.OK,
        messagePath,
        statusCode: options?.statusCode ?? options?.httpStatus ?? HttpStatus.OK,
    };

    if (options?.schema) {
        docs.schema = options.schema;
    }

    return applyDecorators(
        ApiProduces('application/json'),
        accumulateResponseEntries([docs])
    );
}

/**
 * Documents a paginated response: data array plus cursor/offset queries, search, and order.
 * Reflects the public HTTP query contract only (`orderBy` as a single field), not richer
 * internal pagination shapes.
 * @public
 */
export function DocResponsePagination<T>(
    messagePath: string,
    options: IDocResponsePaginationOptions<T>
): MethodDecorator {
    const docs: MethodDecorator[] = [
        ApiProduces('application/json'),
        accumulateResponseEntries([
            {
                httpStatus: options.httpStatus ?? HttpStatus.OK,
                messagePath,
                statusCode:
                    options.statusCode ?? options.httpStatus ?? HttpStatus.OK,
                envelope: ResponsePagingSchema,
                schema: z.array(options.schema).meta({
                    description: 'Page of result items',
                    example: [],
                }),
            },
        ]),
        ...Object.values(DocPaginationErrorResponses),
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
 * @public
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
        }),
        DocFileErrorResponses.exceedMaxDataExport,
        DocFileErrorResponses.exceedMaxSizeExport
    );
}
