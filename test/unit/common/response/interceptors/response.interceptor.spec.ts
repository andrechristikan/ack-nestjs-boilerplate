import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { MessageService } from '@common/message/services/message.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    ResponseMessagePathMetaKey,
    ResponseSchemaMetaKey,
} from '@common/response/constants/response.constant';
import { ResponseInterceptor } from '@common/response/interceptors/response.interceptor';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import { EnumResponseStatusCodeError } from '@common/response/enums/response.status-code.enum';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { ResponseMetadataDto } from '@common/response/dtos/response.metadata.dto';
import { buildResultSchema } from '@test/unit/helpers/test.unit.response.helper';

describe('ResponseInterceptor', () => {
    const reflectorGet = vi.fn<(key: unknown, target?: unknown) => unknown>();
    const reflector: MockProxy<Reflector> = mock<Reflector>({
        get: reflectorGet as unknown as Reflector['get'],
    });
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const responseMetadataService: MockProxy<ResponseMetadataService> =
        mock<ResponseMetadataService>();
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

    let interceptor: ResponseInterceptor<unknown>;

    beforeEach(async () => {
        vi.resetAllMocks();

        context.getType.mockReturnValue('http');
        context.switchToHttp.mockReturnValue(httpArgumentsHost);
        httpArgumentsHost.getResponse.mockReturnValue(response);
        response.statusCode = 200;
        response.status.mockReturnValue(response);
        responseMetadataService.create.mockReturnValue(metadata);
        messageService.setMessage.mockReturnValue('localized message');
        reflectorGet.mockImplementation((key: unknown) => {
            if (key === ResponseMessagePathMetaKey) {
                return 'response.default.path';
            }

            return undefined;
        });

        const module: TestingModule = await Test.createTestingModule({
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

        interceptor = module.get(ResponseInterceptor);
    });

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

        it('falls back to the response status and default message path when the handler returns no data', async () => {
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(undefined as unknown as Response))
            );

            const emitted = await firstValueFrom(
                interceptor.intercept(context, callHandler)
            );
            const result = await emitted;

            expect(result).toEqual({
                statusCode: 200,
                message: 'localized message',
                metadata,
                data: undefined,
            });
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'response.default.path',
                { customLanguage: metadata.language, properties: undefined }
            );
            expect(response.status).toHaveBeenCalledWith(200);
        });

        it('leaves data undefined when the handler returns a payload with no data field', async () => {
            const responseData: IResponseReturn<unknown> = {};
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData as unknown as Response))
            );

            const emitted = await firstValueFrom(
                interceptor.intercept(context, callHandler)
            );
            const result = await emitted;

            expect(result.data).toBeUndefined();
        });

        it('serializes the payload and applies every response metadata override', async () => {
            reflectorGet.mockImplementation((key: unknown) => {
                if (key === ResponseMessagePathMetaKey) {
                    return 'response.default.path';
                }

                if (key === ResponseSchemaMetaKey) {
                    return buildResultSchema({ value: { foo: 'parsed' } });
                }

                return undefined;
            });

            const responseData: IResponseReturn<unknown> = {
                data: { foo: 'raw' },
                metadata: {
                    httpStatus: 201,
                    statusCode: 20001,
                    messagePath: 'response.overridden.path',
                    messageProperties: { name: 'jane' },
                },
            };
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData as unknown as Response))
            );

            const emitted = await firstValueFrom(
                interceptor.intercept(context, callHandler)
            );
            const result = await emitted;

            expect(result).toEqual({
                statusCode: 20001,
                message: 'localized message',
                metadata,
                data: { foo: 'parsed' },
            });
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'response.overridden.path',
                {
                    customLanguage: metadata.language,
                    properties: { name: 'jane' },
                }
            );
            expect(response.status).toHaveBeenCalledWith(201);
        });

        it('rejects with no schema declared on the route', async () => {
            const responseData: IResponseReturn<unknown> = {
                data: { foo: 'raw' },
            };
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData as unknown as Response))
            );

            const promise = firstValueFrom(
                interceptor.intercept(context, callHandler)
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

        it('rejects with the schema issues when the payload fails validation', async () => {
            const issues = [{ message: 'Invalid', path: ['foo'] }];
            reflectorGet.mockImplementation((key: unknown) => {
                if (key === ResponseMessagePathMetaKey) {
                    return 'response.default.path';
                }

                if (key === ResponseSchemaMetaKey) {
                    return buildResultSchema({ issues });
                }

                return undefined;
            });

            const responseData: IResponseReturn<unknown> = {
                data: { foo: 'raw' },
            };
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData as unknown as Response))
            );

            const promise = firstValueFrom(
                interceptor.intercept(context, callHandler)
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

    describe('serialize', () => {
        it('throws ResponseSerializationException when no schema is declared', async () => {
            const promise = interceptor['serialize'](undefined, {
                foo: 'raw',
            });

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

        it('throws ResponseSerializationException carrying the schema issues when the payload fails validation', async () => {
            const issues = [{ message: 'Invalid', path: ['foo'] }];
            const schema = buildResultSchema({ issues });

            const promise = interceptor['serialize'](schema, { foo: 'raw' });

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

        it('returns the serialized value when the payload passes validation', async () => {
            const schema = buildResultSchema({ value: { foo: 'clean' } });

            await expect(
                interceptor['serialize'](schema, { foo: 'raw' })
            ).resolves.toEqual({ foo: 'clean' });
        });
    });
});
