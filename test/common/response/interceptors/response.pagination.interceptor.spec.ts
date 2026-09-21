import {
    type CallHandler,
    type ExecutionContext,
    HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { z } from 'zod';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { MessageService } from '@common/message/services/message.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    ResponseMessagePathMetaKey,
    ResponseSchemaMetaKey,
} from '@common/response/constants/response.constant';
import { ResponsePaginationShapeInvalidException } from '@common/response/exceptions/response.pagination-shape-invalid.exception';
import { ResponsePaginationTypeInvalidException } from '@common/response/exceptions/response.pagination-type-invalid.exception';
import { ResponseSerializationException } from '@common/response/exceptions/response.serialization.exception';
import { ResponsePaginationInterceptor } from '@common/response/interceptors/response.pagination.interceptor';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import type { Response } from 'express';

describe('ResponsePaginationInterceptor', () => {
    const metadata = {
        language: EnumMessageLanguage.en,
        timestamp: 123,
        timezone: 'UTC',
        version: '1',
        repoVersion: '9.0.0',
        requestId: 'request-id',
        correlationId: 'correlation-id',
    } as const;
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const responseMetadataService: MockProxy<ResponseMetadataService> =
        mock<ResponseMetadataService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const response: MockProxy<Response> = mock<Response>();
    const handler = vi.fn();
    let context: MockProxy<ExecutionContext>;
    let interceptor: ResponsePaginationInterceptor<unknown>;

    beforeEach(async () => {
        vi.resetAllMocks();
        const httpContext =
            mock<ReturnType<ExecutionContext['switchToHttp']>>();
        httpContext.getResponse.mockReturnValue(response);
        context = mock<ExecutionContext>();
        context.getType.mockReturnValue('http');
        context.getHandler.mockReturnValue(handler);
        context.switchToHttp.mockReturnValue(httpContext);
        response.statusCode = 200;
        responseMetadataService.create.mockReturnValue(metadata);
        messageService.setMessage.mockReturnValue('localized message');
        requestStoreService.get.mockReturnValue(undefined);
        reflector.get.mockImplementation(key => {
            if (key === ResponseMessagePathMetaKey) return 'user.list';
            if (key === ResponseSchemaMetaKey)
                return z.object({ id: z.string() });
            return undefined;
        });

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ResponsePaginationInterceptor,
                { provide: Reflector, useValue: reflector },
                { provide: MessageService, useValue: messageService },
                {
                    provide: ResponseMetadataService,
                    useValue: responseMetadataService,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        interceptor = moduleRef.get(ResponsePaginationInterceptor);
    });

    describe('intercept', () => {
        it('serializes cursor data and merges request-store pagination metadata', async () => {
            requestStoreService.get.mockReturnValue({
                search: 'ada',
                filters: { active: true },
                orderBy: [
                    { name: EnumPaginationOrderDirectionType.asc },
                    { createdAt: EnumPaginationOrderDirectionType.desc },
                ],
                availableSearch: ['name'],
                availableOrderBy: ['name', 'createdAt'],
            });
            const next = {
                handle: vi.fn(() =>
                    of({
                        type: EnumPaginationType.cursor,
                        count: 3,
                        perPage: 2,
                        hasNext: true,
                        cursor: 'next-cursor',
                        data: [{ id: 'one', password: 'secret' }],
                    })
                ),
            } satisfies CallHandler;

            const result = await firstValueFrom(
                interceptor.intercept(context, next)
            );

            expect(result).toEqual({
                statusCode: 200,
                message: 'localized message',
                metadata: {
                    ...metadata,
                    type: EnumPaginationType.cursor,
                    count: 3,
                    hasNext: true,
                    hasPrevious: false,
                    totalPage: undefined,
                    nextCursor: 'next-cursor',
                    previousCursor: undefined,
                    nextPage: undefined,
                    previousPage: undefined,
                    page: undefined,
                    perPage: 2,
                    search: 'ada',
                    filters: { active: true },
                    orderBy: ['name:asc', 'createdAt:desc'],
                    availableSearch: ['name'],
                    availableOrderBy: ['name', 'createdAt'],
                },
                data: [{ id: 'one' }],
            });
            expect(requestStoreService.get).toHaveBeenCalledWith(
                PaginationStoreKey
            );
            expect(responseMetadataService.setHeaders).toHaveBeenCalledWith(
                response,
                metadata
            );
            expect(response.status).toHaveBeenCalledWith(200);
        });

        it('supports a final cursor page without a next cursor', async () => {
            const next = {
                handle: vi.fn(() =>
                    of({
                        type: EnumPaginationType.cursor,
                        perPage: 2,
                        hasNext: false,
                        data: [],
                    })
                ),
            } satisfies CallHandler;

            const result = await firstValueFrom(
                interceptor.intercept(context, next)
            );

            expect(result.metadata.nextCursor).toBeUndefined();
        });

        it('serializes offset data and applies response metadata overrides', async () => {
            const responseOverrides = {
                httpStatus: HttpStatus.CREATED,
                statusCode: 20001,
                messagePath: 'user.listed',
                messageProperties: { name: 'Ada' },
                custom: 'value',
            };
            const next = {
                handle: vi.fn(() =>
                    of(
                        Promise.resolve({
                            type: EnumPaginationType.offset,
                            count: 25,
                            perPage: 10,
                            hasNext: true,
                            hasPrevious: true,
                            page: 2,
                            nextPage: 3,
                            previousPage: 1,
                            totalPage: 3,
                            metadata: responseOverrides,
                            data: [{ id: 'one' }],
                        })
                    )
                ),
            } satisfies CallHandler;

            const result = await firstValueFrom(
                interceptor.intercept(context, next)
            );

            expect(result).toMatchObject({
                statusCode: 20001,
                metadata: {
                    type: EnumPaginationType.offset,
                    count: 25,
                    hasNext: true,
                    hasPrevious: true,
                    totalPage: 3,
                    nextPage: 3,
                    previousPage: 1,
                    page: 2,
                },
            });
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'user.listed',
                {
                    customLanguage: EnumMessageLanguage.en,
                    properties: { name: 'Ada' },
                }
            );
            expect(response.status).toHaveBeenCalledWith(HttpStatus.CREATED);
            expect(responseOverrides).toEqual({ custom: 'value' });
        });

        it('rejects absent, invalid-type, and non-array pagination shapes', async () => {
            const absent = {
                handle: vi.fn(() => of(undefined)),
            } satisfies CallHandler;
            await expect(
                firstValueFrom(interceptor.intercept(context, absent))
            ).rejects.toBeInstanceOf(ResponsePaginationShapeInvalidException);

            const invalidType = {
                handle: vi.fn(() => of({ type: 'other', data: [] })),
            } satisfies CallHandler;
            await expect(
                firstValueFrom(interceptor.intercept(context, invalidType))
            ).rejects.toBeInstanceOf(ResponsePaginationTypeInvalidException);

            const invalidData = {
                handle: vi.fn(() =>
                    of({ type: EnumPaginationType.cursor, data: null })
                ),
            } satisfies CallHandler;
            await expect(
                firstValueFrom(interceptor.intercept(context, invalidData))
            ).rejects.toBeInstanceOf(ResponsePaginationShapeInvalidException);
        });

        it('rejects a missing schema and schema validation issues', async () => {
            reflector.get.mockImplementation(key =>
                key === ResponseMessagePathMetaKey ? 'user.list' : undefined
            );
            const next = {
                handle: vi.fn(() =>
                    of({
                        type: EnumPaginationType.cursor,
                        perPage: 1,
                        hasNext: false,
                        data: [{ id: 'one' }],
                    })
                ),
            } satisfies CallHandler;
            await expect(
                firstValueFrom(interceptor.intercept(context, next))
            ).rejects.toBeInstanceOf(ResponseSerializationException);

            reflector.get.mockImplementation(key => {
                if (key === ResponseMessagePathMetaKey) return 'user.list';
                if (key === ResponseSchemaMetaKey)
                    return z.object({ id: z.string() });
                return undefined;
            });
            const invalid = {
                handle: vi.fn(() =>
                    of({
                        type: EnumPaginationType.cursor,
                        perPage: 1,
                        hasNext: false,
                        data: [{ id: 1 }],
                    })
                ),
            } satisfies CallHandler;
            await expect(
                firstValueFrom(interceptor.intercept(context, invalid))
            ).rejects.toBeInstanceOf(ResponseSerializationException);
        });

        it('passes non-HTTP execution through unchanged', async () => {
            const payload = { data: [{ id: 'job-id' }] };
            const next = {
                handle: vi.fn(() => of(payload)),
            } satisfies CallHandler;
            const rpcContext = mock<ExecutionContext>();
            rpcContext.getType.mockReturnValue('rpc');

            await expect(
                firstValueFrom(interceptor.intercept(rpcContext, next))
            ).resolves.toBe(payload);
            expect(responseMetadataService.create).not.toHaveBeenCalled();
        });
    });

    describe('mapOrderBy', () => {
        it('returns an empty list when ordering is absent', () => {
            expect(interceptor['mapOrderBy']()).toEqual([]);
        });
    });
});
