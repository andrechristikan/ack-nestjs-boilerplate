import { applyDecorators, HttpStatus } from '@nestjs/common';
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
} from 'src/common/doc/interfaces/doc.interface';
import { ENUM_FILE_MIME } from 'src/common/file/enums/file.enum';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/enums/request.status-code.enum';
import { ResponseDto } from 'src/common/response/dtos/response.dto';
import { ResponsePagingDto } from 'src/common/response/dtos/response.paging.dto';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/modules/api-key/enums/api-key.status-code.enum';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/modules/auth/enums/auth.status-code.enum';
import { ENUM_POLICY_STATUS_CODE_ERROR } from 'src/modules/policy/enums/policy.status-code.enum';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';

export function DocDefault<T>(options: IDocDefaultOptions<T>): MethodDecorator {
    const docs = [];
    const schema: Record<string, any> = {
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
        docs.push(ApiExtraModels(options.dto as any));
        schema.properties = {
            ...schema.properties,
            data: {
                $ref: getSchemaPath(options.dto as any),
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

export function DocOneOf(
    httpStatus: HttpStatus,
    ...documents: IDocOfOptions[]
): MethodDecorator {
    const docs = [];
    const oneOf = [];

    for (const doc of documents) {
        const oneOfSchema: Record<string, any> = {
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
            docs.push(ApiExtraModels(doc.dto));
            oneOfSchema.properties = {
                ...oneOfSchema.properties,
                data: {
                    $ref: getSchemaPath(doc.dto),
                },
            };
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

export function DocAnyOf(
    httpStatus: HttpStatus,
    ...documents: IDocOfOptions[]
): MethodDecorator {
    const docs = [];
    const anyOf = [];

    for (const doc of documents) {
        const anyOfSchema: Record<string, any> = {
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
            docs.push(ApiExtraModels(doc.dto));
            anyOfSchema.properties = {
                ...anyOfSchema.properties,
                data: {
                    $ref: getSchemaPath(doc.dto),
                },
            };
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

export function DocAllOf(
    httpStatus: HttpStatus,
    ...documents: IDocOfOptions[]
): MethodDecorator {
    const docs = [];
    const allOf = [];

    for (const doc of documents) {
        const allOfSchema: Record<string, any> = {
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
            docs.push(ApiExtraModels(doc.dto));
            allOfSchema.properties = {
                ...allOfSchema.properties,
                data: {
                    $ref: getSchemaPath(doc.dto),
                },
            };
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
        DocDefault({
            httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
            messagePath: 'http.serverError.internalServerError',
            statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
        }),
        DocDefault({
            httpStatus: HttpStatus.REQUEST_TIMEOUT,
            messagePath: 'http.serverError.requestTimeout',
            statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.TIMEOUT,
        })
    );
}

export function DocRequest(options?: IDocRequestOptions) {
    const docs: Array<ClassDecorator | MethodDecorator> = [];

    if (options?.bodyType === ENUM_DOC_REQUEST_BODY_TYPE.FORM_DATA) {
        docs.push(ApiConsumes('multipart/form-data'));
    } else if (options?.bodyType === ENUM_DOC_REQUEST_BODY_TYPE.TEXT) {
        docs.push(ApiConsumes('text/plain'));
    } else if (options?.bodyType === ENUM_DOC_REQUEST_BODY_TYPE.JSON) {
        docs.push(ApiConsumes('application/json'));
    }

    if (options?.bodyType) {
        docs.push(
            DocDefault({
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.VALIDATION,
                messagePath: 'request.validation',
            })
        );
    }

    if (options?.params) {
        const params: MethodDecorator[] = options?.params?.map(param =>
            ApiParam(param)
        );
        docs.push(...params);
    }

    if (options?.queries) {
        const queries: MethodDecorator[] = options?.queries?.map(query =>
            ApiQuery(query)
        );
        docs.push(...queries);
    }

    if (options?.dto) {
        docs.push(ApiBody({ type: options?.dto }));
    }

    return applyDecorators(...docs);
}

export function DocRequestFile(options?: IDocRequestFileOptions) {
    const docs: Array<ClassDecorator | MethodDecorator> = [];

    if (options?.params) {
        const params: MethodDecorator[] = options?.params.map(param =>
            ApiParam(param)
        );
        docs.push(...params);
    }

    if (options?.queries) {
        const queries: MethodDecorator[] = options?.queries?.map(query =>
            ApiQuery(query)
        );
        docs.push(...queries);
    }

    if (options?.dto) {
        docs.push(ApiBody({ type: options?.dto }));
    }

    return applyDecorators(ApiConsumes('multipart/form-data'), ...docs);
}

export function DocGuard(options?: IDocGuardOptions) {
    const oneOfForbidden: IDocOfOptions[] = [];

    if (options?.role) {
        oneOfForbidden.push({
            statusCode: ENUM_POLICY_STATUS_CODE_ERROR.ROLE_FORBIDDEN,
            messagePath: 'policy.error.roleForbidden',
        });
    }

    if (options?.policy) {
        oneOfForbidden.push({
            statusCode: ENUM_POLICY_STATUS_CODE_ERROR.ABILITY_FORBIDDEN,
            messagePath: 'policy.error.abilityForbidden',
        });
    }

    return applyDecorators(DocOneOf(HttpStatus.FORBIDDEN, ...oneOfForbidden));
}

export function DocAuth(options?: IDocAuthOptions) {
    const docs: Array<ClassDecorator | MethodDecorator> = [];
    const oneOfUnauthorized: IDocOfOptions[] = [];

    if (options?.jwtRefreshToken) {
        docs.push(ApiBearerAuth('refreshToken'));
        oneOfUnauthorized.push({
            messagePath: 'auth.error.refreshTokenUnauthorized',
            statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_REFRESH_TOKEN,
        });
    }

    if (options?.jwtAccessToken) {
        docs.push(ApiBearerAuth('accessToken'));
        oneOfUnauthorized.push({
            messagePath: 'auth.error.accessTokenUnauthorized',
            statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
        });
    }

    if (options?.google) {
        docs.push(ApiBearerAuth('google'));
        oneOfUnauthorized.push({
            messagePath: 'auth.error.socialGoogle',
            statusCode: ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_GOOGLE,
        });
    }

    if (options?.apple) {
        docs.push(ApiBearerAuth('apple'));
        oneOfUnauthorized.push({
            messagePath: 'auth.error.socialApple',
            statusCode: ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_APPLE,
        });
    }

    if (options?.xApiKey) {
        docs.push(ApiSecurity('xApiKey'));
        oneOfUnauthorized.push(
            {
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_REQUIRED,
                messagePath: 'apiKey.error.xApiKey.required',
            },
            {
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_NOT_FOUND,
                messagePath: 'apiKey.error.xApiKey.notFound',
            },
            {
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_EXPIRED,
                messagePath: 'apiKey.error.xApiKey.expired',
            },
            {
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INVALID,
                messagePath: 'apiKey.error.xApiKey.invalid',
            },
            {
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_FORBIDDEN,
                messagePath: 'apiKey.error.xApiKey.forbidden',
            }
        );
    }

    return applyDecorators(
        ...docs,
        DocOneOf(HttpStatus.UNAUTHORIZED, ...oneOfUnauthorized)
    );
}

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

export function DocErrorGroup(docs: MethodDecorator[]) {
    return applyDecorators(...docs);
}

export function DocResponsePaging<T>(
    messagePath: string,
    options: IDocResponseOptions<T>
): MethodDecorator {
    const docs: IDocDefaultOptions = {
        httpStatus: options?.httpStatus ?? HttpStatus.OK,
        messagePath,
        statusCode: options?.statusCode ?? options?.httpStatus ?? HttpStatus.OK,
    };

    if (options?.dto) {
        docs.dto = options?.dto;
    }

    return applyDecorators(
        ApiProduces('application/json'),
        ApiQuery({
            name: 'search',
            required: false,
            allowEmptyValue: true,
            type: 'string',
            description:
                'Search will base on _metadata.pagination._availableSearch with rule contains, and case insensitive',
        }),
        ApiQuery({
            name: 'perPage',
            required: false,
            allowEmptyValue: true,
            example: 20,
            type: 'number',
            description: 'Data per page, max 100',
        }),
        ApiQuery({
            name: 'page',
            required: false,
            allowEmptyValue: true,
            example: 1,
            type: 'number',
            description: 'page number, max 20',
        }),
        ApiQuery({
            name: 'orderBy',
            required: false,
            allowEmptyValue: true,
            example: 'createdAt',
            type: 'string',
            description:
                'Order by base on _metadata.pagination.availableOrderBy',
        }),
        ApiQuery({
            name: 'orderDirection',
            required: false,
            allowEmptyValue: true,
            example: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
            enum: ENUM_PAGINATION_ORDER_DIRECTION_TYPE,
            type: 'string',
            description:
                'Order direction base on _metadata.pagination.availableOrderDirection',
        }),
        ApiExtraModels(ResponsePagingDto),
        ApiExtraModels(options.dto as any),
        ApiResponse({
            description: docs.httpStatus.toString(),
            status: docs.httpStatus,
            schema: {
                allOf: [{ $ref: getSchemaPath(ResponsePagingDto) }],
                properties: {
                    message: {
                        example: messagePath,
                    },
                    statusCode: {
                        type: 'number',
                        example: docs.statusCode,
                    },
                    data: {
                        type: 'array',
                        items: {
                            $ref: getSchemaPath(docs.dto),
                        },
                    },
                },
            },
        })
    );
}

export function DocResponseFile(
    options?: IDocResponseFileOptions
): MethodDecorator {
    const httpStatus: HttpStatus = options?.httpStatus ?? HttpStatus.OK;

    return applyDecorators(
        ApiProduces(options?.fileType ?? ENUM_FILE_MIME.CSV),
        ApiResponse({
            description: httpStatus.toString(),
            status: httpStatus,
        })
    );
}
