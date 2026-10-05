import type { ArgumentsHost } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AppBaseExceptionFilter } from '@app/filters/app.base-exception.filter';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { MessageService } from '@common/message/services/message.service';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestValidationException } from '@common/request/exceptions/request.validation.exception';
import type { ResponseMetadataDto } from '@common/response/dtos/response.metadata.dto';
import { ResponseSerializationException } from '@common/response/exceptions/response.serialization.exception';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { AuthTwoFactorAttemptTemporaryLockException } from '@modules/auth/exceptions/auth.two-factor-attempt-temporary-lock.exception';

describe('AppBaseExceptionFilter', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const responseMetadataService: MockProxy<ResponseMetadataService> =
        mock<ResponseMetadataService>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const response: MockProxy<Response> = mock<Response>();
    const httpArgumentsHost: MockProxy<
        ReturnType<ArgumentsHost['switchToHttp']>
    > = mock<ReturnType<ArgumentsHost['switchToHttp']>>();
    const argumentsHost: MockProxy<ArgumentsHost> = mock<ArgumentsHost>();

    let metadata: ResponseMetadataDto;
    let filter: AppBaseExceptionFilter;

    beforeAll(() => {
        metadata = {
            language: EnumMessageLanguage.en,
            timestamp: 1758153600000,
            timezone: 'Asia/Jakarta',
            version: '1',
            repoVersion: '1.0.0',
            requestId: '01966c9a-2b8d-7000-a957-4e1c1de0c8f7',
            correlationId: '01966c9a-2b8d-7000-a957-4e1c1de0c8f8',
        };
    });

    beforeEach(async () => {
        vi.resetAllMocks();

        argumentsHost.switchToHttp.mockReturnValue(httpArgumentsHost);
        httpArgumentsHost.getResponse.mockReturnValue(response);
        response.status.mockReturnValue(response);
        responseMetadataService.create.mockReturnValue(metadata);
        messageService.setMessage.mockReturnValue('Internal Server Error');

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppBaseExceptionFilter,
                { provide: MessageService, useValue: messageService },
                {
                    provide: ResponseMetadataService,
                    useValue: responseMetadataService,
                },
                { provide: SentryService, useValue: sentryService },
            ],
        }).compile();

        filter = module.get(AppBaseExceptionFilter);
    });

    describe('catch', () => {
        it('renders the exception into the standard error envelope', async () => {
            const exception = new AppUnknownException(new Error('boom'));

            await filter.catch(exception, argumentsHost);

            expect(response.status).toHaveBeenCalledWith(
                HttpStatus.INTERNAL_SERVER_ERROR
            );
            expect(response.json).toHaveBeenCalledWith({
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                module: 'app',
                message: 'Internal Server Error',
                metadata,
                data: undefined,
            });
        });

        it('answers with the exception own httpStatus and module for a 4xx exception', async () => {
            const exception = new RequestValidationException([]);

            await filter.catch(exception, argumentsHost);

            expect(response.status).toHaveBeenCalledWith(
                HttpStatus.UNPROCESSABLE_ENTITY
            );
            expect(response.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: EnumRequestStatusCodeError.validation,
                    statusCodeKey:
                        EnumRequestStatusCodeError[
                            EnumRequestStatusCodeError.validation
                        ],
                    module: 'request',
                })
            );
        });

        it('translates the exception messagePath with its messageProperties and the metadata language', async () => {
            const exception = new AuthTwoFactorAttemptTemporaryLockException(
                30
            );

            await filter.catch(exception, argumentsHost);

            expect(messageService.setMessage).toHaveBeenCalledWith(
                'auth.error.twoFactorAttemptTemporaryLock',
                {
                    customLanguage: EnumMessageLanguage.en,
                    properties: { retryAfterSeconds: 30 },
                }
            );
        });

        it('spreads exception metadata under the response metadata and keeps data', async () => {
            const exception = new ResponseSerializationException({
                metadata: {
                    source: 'serialization',
                    language: 'id',
                },
                data: { issues: 2 },
            });

            await filter.catch(exception, argumentsHost);

            expect(response.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { issues: 2 },
                    metadata: {
                        ...metadata,
                        source: 'serialization',
                    },
                })
            );
        });

        it('mirrors the metadata onto the response headers', async () => {
            const exception = new AppUnknownException(new Error('boom'));

            await filter.catch(exception, argumentsHost);

            expect(responseMetadataService.setHeaders).toHaveBeenCalledWith(
                response,
                metadata
            );
        });

        it('resolves to undefined', async () => {
            await expect(
                filter.catch(new RequestValidationException([]), argumentsHost)
            ).resolves.toBeUndefined();
        });
    });

    describe('sendToSentry', () => {
        it('reports the rawError when the exception is 500 or above', () => {
            const rawError = new Error('boom');
            const exception = new AppUnknownException(rawError);

            filter['sendToSentry'](exception);

            expect(sentryService.captureException).toHaveBeenCalledWith(
                rawError
            );
        });

        it('reports the exception itself when a 500 exception carries no rawError', () => {
            const exception = new AppUnknownException(undefined);

            filter['sendToSentry'](exception);

            expect(sentryService.captureException).toHaveBeenCalledWith(
                exception
            );
        });

        it('reports nothing when the exception is below 500', () => {
            const exception = new RequestValidationException([]);

            filter['sendToSentry'](exception);

            expect(sentryService.captureException).not.toHaveBeenCalled();
        });
    });
});
