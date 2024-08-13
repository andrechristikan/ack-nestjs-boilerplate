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
    getSchemaPath,
} from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import {
    Doc,
    DocAllOf,
    DocAnyOf,
    DocAuth,
    DocDefault,
    DocErrorGroup,
    DocGuard,
    DocOneOf,
    DocRequest,
    DocRequestFile,
    DocResponse,
    DocResponseFile,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import {
    IDocGuardOptions,
    IDocOfOptions,
    IDocRequestFileOptions,
    IDocRequestOptions,
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

describe('DocDecorators', () => {
    let moduleRef: TestingModule;

    beforeAll(async () => {
        moduleRef = await Test.createTestingModule({}).compile();
    });

    afterAll(async () => {
        await moduleRef.close();
    });

    describe('DocDefault', () => {
        it('should create a decorator with the correct ApiResponse schema', () => {
            const options = {
                messagePath: 'test.message',
                statusCode: HttpStatus.OK,
                httpStatus: HttpStatus.OK,
                dto: ResponseDto,
            };
            const decorator = DocDefault(options);

            const mockSchema = {
                allOf: [{ $ref: getSchemaPath(ResponseDto) }],
                properties: {
                    message: {
                        example: 'test.message',
                    },
                    statusCode: {
                        type: 'number',
                        example: HttpStatus.OK,
                    },
                    data: {
                        $ref: getSchemaPath(ResponseDto),
                    },
                },
            };

            const mockApplyDecorators = applyDecorators(
                ApiExtraModels(ResponseDto),
                ApiExtraModels(options.dto as any),
                ApiResponse({
                    description: HttpStatus.OK.toString(),
                    status: HttpStatus.OK,
                    schema: mockSchema,
                })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });
    });

    describe('DocResponse', () => {
        it('should create a decorator with ApiResponse and ApiProduces', () => {
            const options = {
                httpStatus: HttpStatus.OK,
                statusCode: HttpStatus.OK,
                dto: ResponseDto,
            };
            const decorator = DocResponse('test.message', options);

            const mockSchema = {
                allOf: [{ $ref: getSchemaPath(ResponseDto) }],
                properties: {
                    message: {
                        example: 'test.message',
                    },
                    statusCode: {
                        type: 'number',
                        example: HttpStatus.OK,
                    },
                    data: {
                        $ref: getSchemaPath(ResponseDto),
                    },
                },
            };

            const mockApplyDecorators = applyDecorators(
                ApiProduces('application/json'),
                ApiExtraModels(ResponseDto),
                ApiResponse({
                    description: HttpStatus.OK.toString(),
                    status: HttpStatus.OK,
                    schema: mockSchema,
                })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });

        it('should create a decorator with no options', () => {
            const decorator = DocResponse('test.message');

            const mockSchema = {
                allOf: [{ $ref: getSchemaPath(ResponseDto) }],
                properties: {
                    message: {
                        example: 'test.message',
                    },
                    statusCode: {
                        type: 'number',
                        example: HttpStatus.OK,
                    },
                    data: {
                        $ref: getSchemaPath(ResponseDto),
                    },
                },
            };

            const mockApplyDecorators = applyDecorators(
                ApiProduces('application/json'),
                ApiExtraModels(ResponseDto),
                ApiResponse({
                    description: HttpStatus.OK.toString(),
                    status: HttpStatus.OK,
                    schema: mockSchema,
                })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });
    });

    describe('DocOneOf', () => {
        it('should create a decorator with the correct ApiResponse schema', () => {
            const documents = [
                {
                    messagePath: 'test.message1',
                    statusCode: HttpStatus.CREATED,
                    dto: ResponseDto,
                },
                {
                    messagePath: 'test.message2',
                    statusCode: HttpStatus.BAD_REQUEST,
                    dto: ResponseDto,
                },
            ];
            const httpStatus = HttpStatus.OK;
            const decorator = DocOneOf(httpStatus, ...documents);

            const oneOfSchemas = documents.map(doc => {
                const schema: Record<string, any> = {
                    allOf: [{ $ref: getSchemaPath(ResponseDto) }],
                    properties: {
                        message: {
                            example: doc.messagePath,
                        },
                        statusCode: {
                            type: 'number',
                            example: doc.statusCode ?? HttpStatus.OK,
                        },
                        data: {
                            $ref: getSchemaPath(doc.dto),
                        },
                    },
                };
                return schema;
            });

            const mockApplyDecorators = applyDecorators(
                ApiExtraModels(ResponseDto),
                ...documents.map(doc => ApiExtraModels(doc.dto)),
                ApiResponse({
                    description: httpStatus.toString(),
                    status: httpStatus,
                    schema: {
                        oneOf: oneOfSchemas,
                    },
                })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });
    });

    describe('DocAnyOf', () => {
        it('should create a decorator with the correct ApiResponse schema', () => {
            const documents = [
                {
                    messagePath: 'test.message1',
                    statusCode: HttpStatus.CREATED,
                    dto: ResponseDto,
                },
                {
                    messagePath: 'test.message2',
                    statusCode: HttpStatus.BAD_REQUEST,
                    dto: ResponseDto,
                },
            ];
            const httpStatus = HttpStatus.OK;
            const decorator = DocAnyOf(httpStatus, ...documents);

            const anyOfSchemas = documents.map(doc => {
                const schema: Record<string, any> = {
                    allOf: [{ $ref: getSchemaPath(ResponseDto) }],
                    properties: {
                        message: {
                            example: doc.messagePath,
                        },
                        statusCode: {
                            type: 'number',
                            example: doc.statusCode ?? HttpStatus.OK,
                        },
                        data: {
                            $ref: getSchemaPath(doc.dto),
                        },
                    },
                };
                return schema;
            });

            const mockApplyDecorators = applyDecorators(
                ApiExtraModels(ResponseDto),
                ApiExtraModels(ResponseDto),
                ApiResponse({
                    description: httpStatus.toString(),
                    status: httpStatus,
                    schema: {
                        anyOf: anyOfSchemas,
                    },
                })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });

        it('should create a decorator with no document status code', () => {
            const documents = [
                {
                    messagePath: 'test.message1',
                    dto: ResponseDto,
                },
                {
                    messagePath: 'test.message2',
                    dto: ResponseDto,
                },
            ];
            const httpStatus = HttpStatus.OK;
            const decorator = DocAnyOf(httpStatus, ...(documents as any));

            const anyOfSchemas = documents.map(doc => {
                const schema: Record<string, any> = {
                    allOf: [{ $ref: getSchemaPath(ResponseDto) }],
                    properties: {
                        message: {
                            example: doc.messagePath,
                        },
                        statusCode: {
                            type: 'number',
                            example: HttpStatus.OK,
                        },
                        data: {
                            $ref: getSchemaPath(doc.dto),
                        },
                    },
                };
                return schema;
            });

            const mockApplyDecorators = applyDecorators(
                ApiExtraModels(ResponseDto),
                ApiExtraModels(ResponseDto),
                ApiResponse({
                    description: httpStatus.toString(),
                    status: httpStatus,
                    schema: {
                        anyOf: anyOfSchemas,
                    },
                })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });
    });

    describe('DocAllOf', () => {
        it('should create a decorator with the correct ApiResponse schema', () => {
            const documents = [
                {
                    messagePath: 'test.message1',
                    statusCode: HttpStatus.CREATED,
                    dto: ResponseDto,
                },
                {
                    messagePath: 'test.message2',
                    statusCode: HttpStatus.BAD_REQUEST,
                    dto: ResponseDto,
                },
            ];
            const httpStatus = HttpStatus.OK;
            const decorator = DocAllOf(httpStatus, ...documents);

            const allOfSchemas = documents.map(doc => {
                const schema: Record<string, any> = {
                    allOf: [{ $ref: getSchemaPath(ResponseDto) }],
                    properties: {
                        message: {
                            example: doc.messagePath,
                        },
                        statusCode: {
                            type: 'number',
                            example: doc.statusCode ?? HttpStatus.OK,
                        },
                        data: {
                            $ref: getSchemaPath(doc.dto),
                        },
                    },
                };
                return schema;
            });

            const mockApplyDecorators = applyDecorators(
                ApiExtraModels(ResponseDto),
                ...documents.map(doc => ApiExtraModels(doc.dto)),
                ApiResponse({
                    description: httpStatus.toString(),
                    status: httpStatus,
                    schema: {
                        allOf: allOfSchemas,
                    },
                })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });

        it('should create a decorator with no documents status code', () => {
            const documents = [
                {
                    messagePath: 'test.message1',
                    dto: ResponseDto,
                },
                {
                    messagePath: 'test.message2',
                    dto: ResponseDto,
                },
            ];
            const httpStatus = HttpStatus.OK;
            const decorator = DocAllOf(httpStatus, ...(documents as any));

            const allOfSchemas = documents.map(doc => {
                const schema: Record<string, any> = {
                    allOf: [{ $ref: getSchemaPath(ResponseDto) }],
                    properties: {
                        message: {
                            example: doc.messagePath,
                        },
                        statusCode: {
                            type: 'number',
                            example: HttpStatus.OK,
                        },
                        data: {
                            $ref: getSchemaPath(doc.dto),
                        },
                    },
                };
                return schema;
            });

            const mockApplyDecorators = applyDecorators(
                ApiExtraModels(ResponseDto),
                ...documents.map(doc => ApiExtraModels(doc.dto)),
                ApiResponse({
                    description: httpStatus.toString(),
                    status: httpStatus,
                    schema: {
                        allOf: allOfSchemas,
                    },
                })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });
    });

    describe('DocDecorator', () => {
        it('should create a decorator with the correct ApiOperation and ApiHeaders', () => {
            const options = {
                summary: 'Test Summary',
                deprecated: false,
                description: 'Test Description',
                operation: 'TestOperation',
            };

            const decorator = Doc(options);

            const mockApplyDecorators = applyDecorators(
                ApiOperation({
                    summary: options.summary,
                    deprecated: options.deprecated,
                    description: options.description,
                    operationId: options.operation,
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

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });
    });

    describe('DocRequestDecorator', () => {
        it('should create a decorator with the correct ApiConsumes for FORM_DATA', () => {
            const options: IDocRequestOptions = {
                bodyType: ENUM_DOC_REQUEST_BODY_TYPE.FORM_DATA,
            };

            const decorator = DocRequest(options);

            const mockApplyDecorators = applyDecorators(
                ApiConsumes('multipart/form-data'),
                DocDefault({
                    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                    statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.VALIDATION,
                    messagePath: 'request.validation',
                })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });

        it('should create a decorator with the correct ApiConsumes for TEXT', () => {
            const options: IDocRequestOptions = {
                bodyType: ENUM_DOC_REQUEST_BODY_TYPE.TEXT,
            };

            const decorator = DocRequest(options);

            const mockApplyDecorators = applyDecorators(
                ApiConsumes('text/plain'),
                DocDefault({
                    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                    statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.VALIDATION,
                    messagePath: 'request.validation',
                })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });

        it('should create a decorator with the correct ApiConsumes for JSON', () => {
            const options: IDocRequestOptions = {
                bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            };

            const decorator = DocRequest(options);

            const mockApplyDecorators = applyDecorators(
                ApiConsumes('application/json'),
                DocDefault({
                    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                    statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.VALIDATION,
                    messagePath: 'request.validation',
                })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });

        it('should create a decorator with the correct ApiParam and ApiQuery', () => {
            const options: IDocRequestOptions = {
                params: [{ name: 'id', required: true, type: 'string' }],
                queries: [{ name: 'filter', required: false, type: 'string' }],
            };

            const decorator = DocRequest(options);

            const mockApplyDecorators = applyDecorators(
                ApiParam({ name: 'id', required: true, type: 'string' }),
                ApiQuery({ name: 'filter', required: false, type: 'string' })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });

        it('should create a decorator with the correct ApiBody', () => {
            const options: IDocRequestOptions = {
                dto: class Dto {},
            };

            const decorator = DocRequest(options);

            const mockApplyDecorators = applyDecorators(
                ApiBody({ type: options.dto })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });
    });

    describe('DocRequestFileDecorator', () => {
        it('should create a decorator with the correct ApiConsumes and ApiParam', () => {
            const options: IDocRequestFileOptions = {
                params: [{ name: 'id', required: true, type: 'string' }],
            };

            const decorator = DocRequestFile(options);

            const mockApplyDecorators = applyDecorators(
                ApiConsumes('multipart/form-data'),
                ApiParam({ name: 'id', required: true, type: 'string' })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });

        it('should create a decorator with the correct ApiConsumes and ApiQuery', () => {
            const options: IDocRequestFileOptions = {
                queries: [{ name: 'filter', required: false, type: 'string' }],
            };

            const decorator = DocRequestFile(options);

            const mockApplyDecorators = applyDecorators(
                ApiConsumes('multipart/form-data'),
                ApiQuery({ name: 'filter', required: false, type: 'string' })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });

        it('should create a decorator with the correct ApiBody', () => {
            const options: IDocRequestFileOptions = {
                dto: class Dto {},
            };

            const decorator = DocRequestFile(options);

            const mockApplyDecorators = applyDecorators(
                ApiConsumes('multipart/form-data'),
                ApiBody({ type: options.dto })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });

        it('should create a decorator with the correct ApiConsumes, ApiParam, ApiQuery, and ApiBody', () => {
            const options: IDocRequestFileOptions = {
                params: [{ name: 'id', required: true, type: 'string' }],
                queries: [{ name: 'filter', required: false, type: 'string' }],
                dto: class Dto {},
            };

            const decorator = DocRequestFile(options);

            const mockApplyDecorators = applyDecorators(
                ApiConsumes('multipart/form-data'),
                ApiParam({ name: 'id', required: true, type: 'string' }),
                ApiQuery({ name: 'filter', required: false, type: 'string' }),
                ApiBody({ type: options.dto })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });
    });

    describe('DocGuardDecorator', () => {
        it('should call DocOneOf with role forbidden error', () => {
            const options: IDocGuardOptions = {
                role: true,
            };

            const expectedOptions: IDocOfOptions[] = [
                {
                    statusCode: ENUM_POLICY_STATUS_CODE_ERROR.ROLE_FORBIDDEN,
                    messagePath: 'policy.error.roleForbidden',
                },
            ];

            const decorator = DocGuard(options);

            const mockApplyDecorators = applyDecorators(
                DocOneOf(HttpStatus.FORBIDDEN, ...expectedOptions)
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });

        it('should call DocOneOf with policy forbidden error', () => {
            const options: IDocGuardOptions = {
                policy: true,
            };

            const expectedOptions: IDocOfOptions[] = [
                {
                    statusCode: ENUM_POLICY_STATUS_CODE_ERROR.ABILITY_FORBIDDEN,
                    messagePath: 'policy.error.abilityForbidden',
                },
            ];

            const decorator = DocGuard(options);

            const mockApplyDecorators = applyDecorators(
                DocOneOf(HttpStatus.FORBIDDEN, ...expectedOptions)
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });

        it('should call DocOneOf with both role and policy forbidden errors', () => {
            const options: IDocGuardOptions = {
                role: true,
                policy: true,
            };

            const expectedOptions: IDocOfOptions[] = [
                {
                    statusCode: ENUM_POLICY_STATUS_CODE_ERROR.ROLE_FORBIDDEN,
                    messagePath: 'policy.error.roleForbidden',
                },
                {
                    statusCode: ENUM_POLICY_STATUS_CODE_ERROR.ABILITY_FORBIDDEN,
                    messagePath: 'policy.error.abilityForbidden',
                },
            ];

            const decorator = DocGuard(options);
            const mockApplyDecorators = applyDecorators(
                DocOneOf(HttpStatus.FORBIDDEN, ...expectedOptions)
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });

        it('should call DocOneOf with no options', () => {
            const decorator = DocGuard();
            const mockApplyDecorators = applyDecorators(
                DocOneOf(HttpStatus.FORBIDDEN, [] as any)
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });
    });

    describe('DocAuthDecorator', () => {
        it('should call DocOneOf with all options', () => {
            const decorator = DocAuth({
                apple: true,
                google: true,
                jwtAccessToken: true,
                jwtRefreshToken: true,
                xApiKey: true,
            });

            const mockDocs = [
                ApiBearerAuth('refreshToken'),
                ApiBearerAuth('accessToken'),
                ApiBearerAuth('google'),
                ApiBearerAuth('apple'),
                ApiBearerAuth('xApiKey'),
            ];

            const mockOneOfUnauthorized = [
                {
                    messagePath: 'auth.error.refreshTokenUnauthorized',
                    statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_REFRESH_TOKEN,
                },
                {
                    messagePath: 'auth.error.accessTokenUnauthorized',
                    statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                },
                {
                    messagePath: 'auth.error.socialGoogle',
                    statusCode: ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_GOOGLE,
                },
                {
                    messagePath: 'auth.error.socialApple',
                    statusCode: ENUM_AUTH_STATUS_CODE_ERROR.SOCIAL_APPLE,
                },
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
                        ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_EXPIRED,
                    messagePath: 'apiKey.error.xApiKey.expired',
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
            ];

            const mockApplyDecorators = applyDecorators(
                ...mockDocs,
                DocOneOf(HttpStatus.UNAUTHORIZED, ...mockOneOfUnauthorized)
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });
    });

    describe('DocErrorGroup', () => {
        it('should return applyDecorators', () => {
            const decorator = DocErrorGroup([]);
            const mockApplyDecorators = applyDecorators(...[]);

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });
    });

    describe('DocResponsePaging', () => {
        it('should create a decorator with ApiResponse and ApiProduces', () => {
            const options = {
                httpStatus: HttpStatus.OK,
                statusCode: HttpStatus.OK,
                dto: ResponseDto,
            };
            const decorator = DocResponsePaging('test.message', options);
            const mockApplyDecorators = applyDecorators(
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
                    description: HttpStatus.OK.toString(),
                    status: HttpStatus.OK,
                    schema: {
                        allOf: [{ $ref: getSchemaPath(ResponsePagingDto) }],
                        properties: {
                            message: {
                                example: 'test.message',
                            },
                            statusCode: {
                                type: 'number',
                                example: HttpStatus.OK,
                            },
                            data: {
                                type: 'array',
                                items: {
                                    $ref: getSchemaPath(ResponseDto),
                                },
                            },
                        },
                    },
                })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });

        it('should create a decorator with no options', () => {
            const options = {
                dto: ResponseDto,
            };
            const decorator = DocResponsePaging('test.message', options);
            const mockApplyDecorators = applyDecorators(
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
                    description: HttpStatus.OK.toString(),
                    status: HttpStatus.OK,
                    schema: {
                        allOf: [{ $ref: getSchemaPath(ResponsePagingDto) }],
                        properties: {
                            message: {
                                example: 'test.message',
                            },
                            statusCode: {
                                type: 'number',
                                example: HttpStatus.OK,
                            },
                            data: {
                                type: 'array',
                                items: {
                                    $ref: getSchemaPath(ResponseDto),
                                },
                            },
                        },
                    },
                })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });
    });

    describe('DocResponseFile', () => {
        it('should create a decorator with ApiResponse and ApiProduces', () => {
            const options = {
                httpStatus: HttpStatus.OK,
                fileType: ENUM_FILE_MIME.CSV,
            };

            const decorator = DocResponseFile(options);

            const mockApplyDecorators = applyDecorators(
                ApiProduces(ENUM_FILE_MIME.CSV),
                ApiResponse({
                    description: HttpStatus.OK.toString(),
                    status: HttpStatus.OK,
                })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });

        it('should create a decorator with no options', () => {
            const decorator = DocResponseFile();

            const mockApplyDecorators = applyDecorators(
                ApiProduces(ENUM_FILE_MIME.CSV),
                ApiResponse({
                    description: HttpStatus.OK.toString(),
                    status: HttpStatus.OK,
                })
            );

            expect(decorator.toString()).toEqual(
                mockApplyDecorators.toString()
            );
        });
    });
});
