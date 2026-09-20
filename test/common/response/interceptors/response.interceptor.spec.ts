import { createMock } from '@golevelup/ts-vitest';
import {
    type CallHandler,
    type ExecutionContext,
    HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { MessageService } from '@common/message/services/message.service';
import {
    ResponseMessagePathMetaKey,
    ResponseSchemaMetaKey,
} from '@common/response/constants/response.constant';
import { ResponseSerializationException } from '@common/response/exceptions/response.serialization.exception';
import { ResponseInterceptor } from '@common/response/interceptors/response.interceptor';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import type { Response } from 'express';

describe('ResponseInterceptor', () => {
    const metadata = {
        language: EnumMessageLanguage.en,
        timestamp: 123,
        timezone: 'UTC',
        version: '1',
        repoVersion: '9.0.0',
        requestId: 'request-id',
        correlationId: 'correlation-id',
    } as const;
    const reflector = createMock<Pick<Reflector, 'get'>>();
    const messageService = createMock<Pick<MessageService, 'setMessage'>>();
    const responseMetadataService =
        createMock<Pick<ResponseMetadataService, 'create' | 'setHeaders'>>();
    const status = vi.fn<Response['status']>();
    const response = createMock<Response>({ statusCode: 200, status });
    const handler = vi.fn();
    let context: ExecutionContext;

    let interceptor: ResponseInterceptor<unknown>;

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
            if (key === ResponseMessagePathMetaKey) return 'user.get';
            if (key === ResponseSchemaMetaKey) return undefined;
            return undefined;
        });

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ResponseInterceptor,
                { provide: Reflector, useValue: reflector },
                { provide: MessageService, useValue: messageService },
                {
                    provide: ResponseMetadataService,
                    useValue: responseMetadataService,
                },
            ],
        }).compile();

        interceptor = moduleRef.get(ResponseInterceptor);
    });

    it('serializes declared data, strips unknown fields, and wraps the response', async () => {
        const schema = z.object({ id: z.string() });
        reflector.get.mockImplementation(key => {
            if (key === ResponseMessagePathMetaKey) return 'user.get';
            if (key === ResponseSchemaMetaKey) return schema;
            return undefined;
        });
        const next = {
            handle: vi.fn(() =>
                of({ data: { id: 'user-id', password: 'secret' } })
            ),
        } satisfies CallHandler;

        const result = await firstValueFrom(
            interceptor.intercept(context, next)
        );

        expect(result).toEqual({
            statusCode: 200,
            message: 'localized message',
            metadata,
            data: { id: 'user-id' },
        });
        expect(responseMetadataService.setHeaders).toHaveBeenCalledWith(
            response,
            metadata
        );
        expect(status).toHaveBeenCalledWith(200);
    });

    it('applies response metadata overrides to status and localization', async () => {
        const schema = z.object({ id: z.string() });
        reflector.get.mockImplementation(key => {
            if (key === ResponseMessagePathMetaKey) return 'user.get';
            if (key === ResponseSchemaMetaKey) return schema;
            return undefined;
        });
        const next = {
            handle: vi.fn(() =>
                of({
                    data: { id: 'user-id' },
                    metadata: {
                        httpStatus: HttpStatus.CREATED,
                        statusCode: 20001,
                        messagePath: 'user.created',
                        messageProperties: { name: 'Ada' },
                    },
                })
            ),
        } satisfies CallHandler;

        const result = await firstValueFrom(
            interceptor.intercept(context, next)
        );

        expect(result.statusCode).toBe(20001);
        expect(status).toHaveBeenCalledWith(HttpStatus.CREATED);
        expect(messageService.setMessage).toHaveBeenCalledWith('user.created', {
            customLanguage: 'en',
            properties: { name: 'Ada' },
        });
    });

    it('rejects a payload when the route declares no schema', async () => {
        const next = {
            handle: vi.fn(() => of({ data: { id: 'user-id' } })),
        } satisfies CallHandler;

        await expect(
            firstValueFrom(interceptor.intercept(context, next))
        ).rejects.toBeInstanceOf(ResponseSerializationException);
    });

    it('rejects data that does not satisfy the declared schema', async () => {
        const schema = z.object({ id: z.string() });
        reflector.get.mockImplementation(key => {
            if (key === ResponseMessagePathMetaKey) return 'user.get';
            if (key === ResponseSchemaMetaKey) return schema;
            return undefined;
        });
        const next = {
            handle: vi.fn(() => of({ data: { id: 123 } })),
        } satisfies CallHandler;

        await expect(
            firstValueFrom(interceptor.intercept(context, next))
        ).rejects.toBeInstanceOf(ResponseSerializationException);
    });

    it('allows a route without a schema when it returns no data', async () => {
        const next = {
            handle: vi.fn(() => of(undefined)),
        } satisfies CallHandler;

        const result = await firstValueFrom(
            interceptor.intercept(context, next)
        );

        expect(result.data).toBeUndefined();
    });

    it('passes non-HTTP execution through unchanged', async () => {
        const payload = { data: { id: 'job-id' } };
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
