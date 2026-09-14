import { createMock } from '@golevelup/ts-vitest';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

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
import { ResponsePagingInterceptor } from '@common/response/interceptors/response.paging.interceptor';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import type { Response } from 'express';

describe('ResponsePagingInterceptor', () => {
    const metadata = {
        language: 'en',
        timestamp: 123,
        timezone: 'UTC',
        version: '1',
        repoVersion: '9.0.0',
        requestId: 'request-id',
        correlationId: 'correlation-id',
    } as const;
    const itemSchema = z.object({ id: z.string() });
    const reflector = createMock<Pick<Reflector, 'get'>>();
    const messageService = createMock<Pick<MessageService, 'setMessage'>>();
    const responseMetadataService =
        createMock<Pick<ResponseMetadataService, 'create' | 'setHeaders'>>();
    const requestStoreService = createMock<Pick<RequestStoreService, 'get'>>();
    const requestStoreGet = vi.mocked(requestStoreService.get);
    const status = vi.fn<Response['status']>();
    const response = createMock<Response>({ statusCode: 200, status });
    const handler = vi.fn();
    let context: ExecutionContext;

    let interceptor: ResponsePagingInterceptor<unknown>;

    beforeEach(async () => {
        vi.resetAllMocks();
        context = createMock<ExecutionContext>({
            getType: () => 'http',
            getHandler: () => handler,
            switchToHttp: () =>
                createMock<ReturnType<ExecutionContext['switchToHttp']>>({
                    getResponse: () => response,
                }),
        });
        response.statusCode = 200;
        responseMetadataService.create.mockReturnValue(metadata);
        messageService.setMessage.mockReturnValue('localized message');
        reflector.get.mockImplementation(key => {
            if (key === ResponseMessagePathMetaKey) return 'user.list';
            if (key === ResponseSchemaMetaKey) return itemSchema;
            return undefined;
        });
        requestStoreGet.mockReturnValue({
            search: 'ada',
            filters: { active: true },
            orderBy: [
                { createdAt: EnumPaginationOrderDirectionType.desc },
                { id: EnumPaginationOrderDirectionType.asc },
            ],
            availableSearch: ['name'],
            availableOrderBy: ['createdAt', 'id'],
        });

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ResponsePagingInterceptor,
                { provide: Reflector, useValue: reflector },
                { provide: MessageService, useValue: messageService },
                {
                    provide: ResponseMetadataService,
                    useValue: responseMetadataService,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        interceptor = moduleRef.get(ResponsePagingInterceptor);
    });

    it('maps an offset page and serializes each item', async () => {
        const next = {
            handle: vi.fn(() =>
                of({
                    type: EnumPaginationType.offset,
                    count: 2,
                    perPage: 10,
                    hasNext: true,
                    hasPrevious: false,
                    page: 1,
                    nextPage: 2,
                    totalPage: 3,
                    data: [
                        { id: 'one', password: 'secret' },
                        { id: 'two', password: 'secret' },
                    ],
                })
            ),
        } satisfies CallHandler;

        const result = await firstValueFrom(
            interceptor.intercept(context, next)
        );

        expect(result.data).toEqual([{ id: 'one' }, { id: 'two' }]);
        expect(result.metadata).toMatchObject({
            type: EnumPaginationType.offset,
            page: 1,
            nextPage: 2,
            totalPage: 3,
            hasPrevious: false,
            search: 'ada',
            filters: { active: true },
            orderBy: ['createdAt:desc', 'id:asc'],
            availableSearch: ['name'],
            availableOrderBy: ['createdAt', 'id'],
        });
        expect(requestStoreService.get).toHaveBeenCalledWith(
            PaginationStoreKey
        );
    });

    it('maps a cursor page to forward-only metadata', async () => {
        requestStoreGet.mockReturnValue(null);
        const next = {
            handle: vi.fn(() =>
                of({
                    type: EnumPaginationType.cursor,
                    count: 1,
                    perPage: 10,
                    hasNext: true,
                    cursor: 'next-cursor',
                    data: [{ id: 'one' }],
                })
            ),
        } satisfies CallHandler;

        const result = await firstValueFrom(
            interceptor.intercept(context, next)
        );

        expect(result.metadata).toMatchObject({
            type: EnumPaginationType.cursor,
            nextCursor: 'next-cursor',
            hasPrevious: false,
            orderBy: [],
            availableSearch: [],
            availableOrderBy: [],
        });
        expect(result.metadata.previousCursor).toBeUndefined();
        expect(result.metadata.page).toBeUndefined();
    });

    it.each([
        [
            'missing response',
            undefined,
            ResponsePaginationShapeInvalidException,
        ],
        [
            'unknown type',
            { type: 'unknown', data: [] },
            ResponsePaginationTypeInvalidException,
        ],
        [
            'non-array data',
            { type: EnumPaginationType.offset, data: 'invalid' },
            ResponsePaginationShapeInvalidException,
        ],
    ])('rejects %s', async (_name, payload, exceptionType) => {
        const next = { handle: vi.fn(() => of(payload)) } satisfies CallHandler;

        await expect(
            firstValueFrom(interceptor.intercept(context, next))
        ).rejects.toBeInstanceOf(exceptionType);
    });

    it('rejects a page when its item schema is missing', async () => {
        reflector.get.mockImplementation(key => {
            if (key === ResponseMessagePathMetaKey) return 'user.list';
            if (key === ResponseSchemaMetaKey) return undefined;
            return undefined;
        });
        const next = {
            handle: vi.fn(() =>
                of({
                    type: EnumPaginationType.cursor,
                    perPage: 10,
                    hasNext: false,
                    data: [{ id: 'one' }],
                })
            ),
        } satisfies CallHandler;

        await expect(
            firstValueFrom(interceptor.intercept(context, next))
        ).rejects.toBeInstanceOf(ResponseSerializationException);
    });

    it('rejects an item that does not satisfy the declared schema', async () => {
        const next = {
            handle: vi.fn(() =>
                of({
                    type: EnumPaginationType.cursor,
                    perPage: 10,
                    hasNext: false,
                    data: [{ id: 123 }],
                })
            ),
        } satisfies CallHandler;

        await expect(
            firstValueFrom(interceptor.intercept(context, next))
        ).rejects.toBeInstanceOf(ResponseSerializationException);
    });

    it('passes non-HTTP execution through unchanged', async () => {
        const payload = { data: [{ id: 'job-id' }] };
        const next = { handle: vi.fn(() => of(payload)) } satisfies CallHandler;
        const rpcContext = createMock<ExecutionContext>({
            getType: () => 'rpc',
        });

        await expect(
            firstValueFrom(interceptor.intercept(rpcContext, next))
        ).resolves.toBe(payload);
        expect(responseMetadataService.create).not.toHaveBeenCalled();
    });
});
