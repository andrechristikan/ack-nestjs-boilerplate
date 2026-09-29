import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { MessageService } from '@common/message/services/message.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationOrderBy,
    IPaginationQuery,
} from '@common/pagination/interfaces/pagination.interface';
import {
    ResponseMessagePathMetaKey,
    ResponseSchemaMetaKey,
} from '@common/response/constants/response.constant';
import { ResponsePaginationInterceptor } from '@common/response/interceptors/response.pagination.interceptor';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ResponsePaginationShapeInvalidException } from '@common/response/exceptions/response.pagination-shape-invalid.exception';
import { ResponsePaginationTypeInvalidException } from '@common/response/exceptions/response.pagination-type-invalid.exception';
import { ResponseSerializationException } from '@common/response/exceptions/response.serialization.exception';
import { EnumResponseStatusCodeError } from '@common/response/enums/response.status-code.enum';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { ResponseMetadataDto } from '@common/response/dtos/response.metadata.dto';

const buildSchema = (
    resultFor: (item: unknown) => StandardSchemaV1.Result<unknown>
): StandardSchemaV1 => ({
    '~standard': {
        version: 1,
        vendor: 'test',
        validate: (item: unknown) => resultFor(item),
    },
});

describe('ResponsePaginationInterceptor', () => {
    const reflectorGet = vi.fn<(key: unknown, target?: unknown) => unknown>();
    const reflector: MockProxy<Reflector> = mock<Reflector>({
        get: reflectorGet as unknown as Reflector['get'],
    });
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const responseMetadataService: MockProxy<ResponseMetadataService> =
        mock<ResponseMetadataService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    const httpArgumentsHost: MockProxy<
        ReturnType<ExecutionContext['switchToHttp']>
    > = mock<ReturnType<ExecutionContext['switchToHttp']>>();
    const response: MockProxy<Response> = mock<Response>();
    const callHandler: MockProxy<CallHandler> = mock<CallHandler>();

    const metadata: ResponseMetadataDto = {
        language: EnumMessageLanguage.en,
        timestamp: 1660190937231,
        timezone: 'Asia/Jakarta',
        version: '1',
        repoVersion: '1.0.0',
        requestId: '01966c9a-2b8d-7000-a957-4e1c1de0c8f7',
        correlationId: '01966c9a-2b8d-7000-a957-4e1c1de0c8f8',
    };

    const successSchema = buildSchema((item: unknown) => ({ value: item }));

    let interceptor: ResponsePaginationInterceptor<unknown>;

    beforeEach(async () => {
        vi.resetAllMocks();

        context.getType.mockReturnValue('http');
        context.switchToHttp.mockReturnValue(httpArgumentsHost);
        httpArgumentsHost.getResponse.mockReturnValue(response);
        response.statusCode = 200;
        response.status.mockReturnValue(response);
        responseMetadataService.create.mockReturnValue(metadata);
        messageService.setMessage.mockReturnValue('localized message');
        requestStoreService.get.mockReturnValue(null);
        reflectorGet.mockImplementation((key: unknown) => {
            if (key === ResponseMessagePathMetaKey) {
                return 'response.pagination.default.path';
            }

            if (key === ResponseSchemaMetaKey) {
                return successSchema;
            }

            return undefined;
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResponsePaginationInterceptor,
                { provide: Reflector, useValue: reflector },
                { provide: MessageService, useValue: messageService },
                {
                    provide: ResponseMetadataService,
                    useValue: responseMetadataService,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        interceptor = module.get(ResponsePaginationInterceptor);
    });

    const emit = (responseData: IResponsePaginationReturn<unknown>): void => {
        callHandler.handle.mockReturnValue(
            of(Promise.resolve(responseData as unknown as Response))
        );
    };

    describe('intercept', () => {
        it('delegates to the handler unchanged for a non-http execution context', async () => {
            context.getType.mockReturnValue('rpc');
            callHandler.handle.mockReturnValue(of('passthrough'));

            const result = await firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            expect(result).toBe('passthrough');
            expect(context.switchToHttp).not.toHaveBeenCalled();
        });

        it('rejects when the handler returns no payload', async () => {
            emit(undefined as unknown as IResponsePaginationReturn<unknown>);

            const promise = firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            await expect(promise).rejects.toBeInstanceOf(
                ResponsePaginationShapeInvalidException
            );
            await expect(promise).rejects.toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.paginationShapeInvalid,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.paginationShapeInvalid
                    ],
                messagePath: 'response.error.paginationShapeInvalid',
            });
        });

        it('rejects when the pagination type is neither offset nor cursor', async () => {
            emit({
                type: 'bogus',
                data: [],
            } as unknown as IResponsePaginationReturn<unknown>);

            const promise = firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            await expect(promise).rejects.toBeInstanceOf(
                ResponsePaginationTypeInvalidException
            );
            await expect(promise).rejects.toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.paginationTypeInvalid,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.paginationTypeInvalid
                    ],
                messagePath: 'response.error.paginationTypeInvalid',
            });
        });

        it.each([[undefined], ['not-an-array']])(
            'rejects when data is %j instead of an array',
            async data => {
                emit({
                    type: EnumPaginationType.cursor,
                    perPage: 20,
                    hasNext: false,
                    data,
                } as unknown as IResponsePaginationReturn<unknown>);

                const promise = firstValueFrom(
                    interceptor.intercept(context, callHandler)
                );

                await expect(promise).rejects.toBeInstanceOf(
                    ResponsePaginationShapeInvalidException
                );
                await expect(promise).rejects.toMatchObject({
                    module: 'response',
                    statusCode:
                        EnumResponseStatusCodeError.paginationShapeInvalid,
                    statusCodeKey:
                        EnumResponseStatusCodeError[
                            EnumResponseStatusCodeError.paginationShapeInvalid
                        ],
                    messagePath: 'response.error.paginationShapeInvalid',
                });
            }
        );

        it('builds a cursor page from the store defaults with hasPrevious false', async () => {
            emit({
                type: EnumPaginationType.cursor,
                count: 5,
                perPage: 20,
                hasNext: true,
                cursor: 'eyJpZCI6IjE2In0',
                data: [{ id: '1' }],
            });

            const result = await firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            expect(result).toEqual({
                statusCode: 200,
                message: 'localized message',
                metadata: {
                    ...metadata,
                    type: EnumPaginationType.cursor,
                    count: 5,
                    hasNext: true,
                    hasPrevious: false,
                    totalPage: undefined,
                    nextCursor: 'eyJpZCI6IjE2In0',
                    previousCursor: undefined,
                    nextPage: undefined,
                    previousPage: undefined,
                    page: undefined,
                    perPage: 20,
                    search: undefined,
                    filters: undefined,
                    orderBy: [],
                    availableSearch: [],
                    availableOrderBy: [],
                },
                data: [{ id: '1' }],
            });
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'response.pagination.default.path',
                { customLanguage: metadata.language, properties: undefined }
            );
            expect(response.status).toHaveBeenCalledWith(200);
        });

        it('builds an offset page and merges pagination store fields into the metadata', async () => {
            const storedPagination: Partial<IPaginationQuery> = {
                search: 'jane',
                filters: { active: true },
                orderBy: [{ createdAt: EnumPaginationOrderDirectionType.desc }],
                availableSearch: ['name'],
                availableOrderBy: ['createdAt'],
            };
            requestStoreService.get.mockReturnValue(storedPagination);

            emit({
                type: EnumPaginationType.offset,
                count: 100,
                perPage: 20,
                hasNext: true,
                hasPrevious: true,
                page: 2,
                nextPage: 3,
                previousPage: 1,
                totalPage: 5,
                data: [{ id: '1' }, { id: '2' }],
                metadata: {
                    httpStatus: 201,
                    statusCode: 20001,
                    messagePath: 'response.pagination.overridden.path',
                    messageProperties: { name: 'jane' },
                },
            });

            const result = await firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            expect(result.statusCode).toBe(20001);
            expect(result.metadata).toMatchObject({
                type: EnumPaginationType.offset,
                totalPage: 5,
                nextPage: 3,
                previousPage: 1,
                page: 2,
                hasPrevious: true,
                search: 'jane',
                filters: { active: true },
                orderBy: [`createdAt:${EnumPaginationOrderDirectionType.desc}`],
                availableSearch: ['name'],
                availableOrderBy: ['createdAt'],
            });
            expect(result.metadata).not.toHaveProperty('httpStatus');
            expect(result.metadata).not.toHaveProperty('statusCode');
            expect(result.metadata).not.toHaveProperty('messagePath');
            expect(result.metadata).not.toHaveProperty('messageProperties');
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'response.pagination.overridden.path',
                {
                    customLanguage: metadata.language,
                    properties: { name: 'jane' },
                }
            );
            expect(response.status).toHaveBeenCalledWith(201);
        });

        it('rejects with no schema declared on the route', async () => {
            reflectorGet.mockImplementation((key: unknown) => {
                if (key === ResponseMessagePathMetaKey) {
                    return 'response.pagination.default.path';
                }

                return undefined;
            });
            emit({
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [{ id: '1' }],
            });

            const promise = firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            await expect(promise).rejects.toBeInstanceOf(
                ResponseSerializationException
            );
            await expect(promise).rejects.toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.serialization,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.serialization
                    ],
                messagePath: 'response.error.serialization',
            });
        });

        it('rejects with the schema issues when an item fails validation', async () => {
            const issues = [{ message: 'Invalid', path: ['id'] }];
            reflectorGet.mockImplementation((key: unknown) => {
                if (key === ResponseMessagePathMetaKey) {
                    return 'response.pagination.default.path';
                }

                if (key === ResponseSchemaMetaKey) {
                    return buildSchema(() => ({ issues }));
                }

                return undefined;
            });
            emit({
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [{ id: '1' }],
            });

            const promise = firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            await expect(promise).rejects.toBeInstanceOf(
                ResponseSerializationException
            );
            await expect(promise).rejects.toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.serialization,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.serialization
                    ],
                messagePath: 'response.error.serialization',
                rawError: issues,
            });
        });
    });

    describe('private: mapOrderBy', () => {
        it('answers an empty array when orderBy is undefined', () => {
            expect(interceptor['mapOrderBy'](undefined)).toEqual([]);
        });

        it('flattens every field:direction pair across the order list', () => {
            const orderBy: IPaginationOrderBy[] = [
                { createdAt: EnumPaginationOrderDirectionType.desc },
                { name: EnumPaginationOrderDirectionType.asc },
            ];

            expect(interceptor['mapOrderBy'](orderBy)).toEqual([
                `createdAt:${EnumPaginationOrderDirectionType.desc}`,
                `name:${EnumPaginationOrderDirectionType.asc}`,
            ]);
        });
    });

    describe('private: validatePaginationResponse', () => {
        it('throws ResponsePaginationShapeInvalidException when the response data is falsy', () => {
            let thrown: unknown;
            try {
                interceptor['validatePaginationResponse'](
                    undefined as unknown as IResponsePaginationReturn<unknown>
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(
                ResponsePaginationShapeInvalidException
            );
            expect(thrown).toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.paginationShapeInvalid,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.paginationShapeInvalid
                    ],
                messagePath: 'response.error.paginationShapeInvalid',
            });
        });

        it('throws ResponsePaginationTypeInvalidException when the type is neither offset nor cursor', () => {
            let thrown: unknown;
            try {
                interceptor['validatePaginationResponse']({
                    type: 'bogus',
                    data: [],
                } as unknown as IResponsePaginationReturn<unknown>);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(
                ResponsePaginationTypeInvalidException
            );
            expect(thrown).toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.paginationTypeInvalid,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.paginationTypeInvalid
                    ],
                messagePath: 'response.error.paginationTypeInvalid',
            });
        });

        it('throws ResponsePaginationShapeInvalidException when data is not an array', () => {
            let thrown: unknown;
            try {
                interceptor['validatePaginationResponse']({
                    type: EnumPaginationType.cursor,
                    data: 'not-an-array',
                } as unknown as IResponsePaginationReturn<unknown>);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(
                ResponsePaginationShapeInvalidException
            );
            expect(thrown).toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.paginationShapeInvalid,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.paginationShapeInvalid
                    ],
                messagePath: 'response.error.paginationShapeInvalid',
            });
        });

        it('passes for a well-shaped cursor response', () => {
            expect(() =>
                interceptor['validatePaginationResponse']({
                    type: EnumPaginationType.cursor,
                    data: [],
                } as unknown as IResponsePaginationReturn<unknown>)
            ).not.toThrow();
        });
    });

    describe('private: serialize', () => {
        it('throws ResponseSerializationException when no schema is declared', async () => {
            const promise = interceptor['serialize'](undefined, [{ id: '1' }]);

            await expect(promise).rejects.toBeInstanceOf(
                ResponseSerializationException
            );
            await expect(promise).rejects.toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.serialization,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.serialization
                    ],
                messagePath: 'response.error.serialization',
            });
        });

        it('throws ResponseSerializationException carrying the schema issues when an item fails validation', async () => {
            const issues = [{ message: 'Invalid', path: ['id'] }];
            const schema = buildSchema(() => ({ issues }));

            const promise = interceptor['serialize'](schema, [{ id: '1' }]);

            await expect(promise).rejects.toBeInstanceOf(
                ResponseSerializationException
            );
            await expect(promise).rejects.toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.serialization,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.serialization
                    ],
                messagePath: 'response.error.serialization',
                rawError: issues,
            });
        });

        it('returns every serialized item in order', async () => {
            const schema = buildSchema((item: unknown) => ({ value: item }));

            await expect(
                interceptor['serialize'](schema, [{ id: '1' }, { id: '2' }])
            ).resolves.toEqual([{ id: '1' }, { id: '2' }]);
        });
    });
});
