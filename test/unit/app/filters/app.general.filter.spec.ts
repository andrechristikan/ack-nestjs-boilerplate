import type { ArgumentsHost } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RedisErrorMessages } from '@keyv/redis';
import { Prisma } from '@generated/prisma-client/client';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AppGeneralFilter } from '@app/filters/app.general.filter';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import { EnumRedisStatusCodeError } from '@common/redis/enums/redis.status-code.enum';
import { RedisUtil } from '@common/redis/utils/redis.util';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { MessageService } from '@common/message/services/message.service';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestValidationException } from '@common/request/exceptions/request.validation.exception';
import type { ResponseMetadataDto } from '@common/response/dtos/response.metadata.dto';
import { ResponseSerializationException } from '@common/response/exceptions/response.serialization.exception';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { AuthTwoFactorAttemptTemporaryLockException } from '@modules/auth/exceptions/auth.two-factor-attempt-temporary-lock.exception';

describe('AppGeneralFilter', () => {
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
    let filter: AppGeneralFilter;

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
                AppGeneralFilter,
                { provide: MessageService, useValue: messageService },
                {
                    provide: ResponseMetadataService,
                    useValue: responseMetadataService,
                },
                { provide: SentryService, useValue: sentryService },
                DatabaseUtil,
                RedisUtil,
            ],
        }).compile();

        filter = module.get(AppGeneralFilter);
    });

    describe('catch', () => {
        it('responds 500 with the app unknown error envelope for an unmapped error', async () => {
            await filter.catch(new Error('boom'), argumentsHost);

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
            });
        });

        it('answers 409 with the database write-conflict code for a Prisma P2034 error', async () => {
            const error = new Prisma.PrismaClientKnownRequestError('conflict', {
                code: 'P2034',
                clientVersion: '6.19.0',
            });

            await filter.catch(error, argumentsHost);

            expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
            expect(response.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: EnumDatabaseStatusCodeError.writeConflict,
                    module: 'database',
                })
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'database.error.writeConflict',
                { customLanguage: EnumMessageLanguage.en }
            );
            expect(sentryService.captureException).not.toHaveBeenCalled();
        });

        it('answers 503 with the redis unavailable code for a keyv not-connected error and reports it', async () => {
            const error = new Error(
                RedisErrorMessages.RedisClientNotConnectedThrown
            );

            await filter.catch(error, argumentsHost);

            expect(response.status).toHaveBeenCalledWith(
                HttpStatus.SERVICE_UNAVAILABLE
            );
            expect(response.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: EnumRedisStatusCodeError.unavailable,
                    module: 'redis',
                })
            );
            expect(sentryService.captureException).toHaveBeenCalledWith(error);
        });

        it('answers 500 for a raw ECONNREFUSED error that names no subject', async () => {
            const error = Object.assign(new Error('connect refused'), {
                code: 'ECONNREFUSED',
            });

            await filter.catch(error, argumentsHost);

            expect(response.status).toHaveBeenCalledWith(
                HttpStatus.INTERNAL_SERVER_ERROR
            );
            expect(sentryService.captureException).toHaveBeenCalledWith(error);
        });

        it('reports the error itself to Sentry', async () => {
            const exception = new Error('boom');

            await filter.catch(exception, argumentsHost);

            expect(sentryService.captureException).toHaveBeenCalledWith(
                exception
            );
        });

        it('reports a thrown value that is not an Error to Sentry and still responds 500', async () => {
            await filter.catch('database is gone', argumentsHost);

            expect(sentryService.captureException).toHaveBeenCalledWith(
                'database is gone'
            );
            expect(response.status).toHaveBeenCalledWith(
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        });

        it('translates the http.serverError.internalServerError message path with the metadata language', async () => {
            await filter.catch(new Error('boom'), argumentsHost);

            expect(messageService.setMessage).toHaveBeenCalledWith(
                'http.serverError.internalServerError',
                {
                    customLanguage: EnumMessageLanguage.en,
                }
            );
        });

        it('renders an AppUnknownException into the standard error envelope', async () => {
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
            expect(sentryService.captureException).not.toHaveBeenCalled();
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

        it('translates the messagePath with the metadata language alone when the exception has no messageProperties', async () => {
            const exception = new RequestValidationException([]);

            await filter.catch(exception, argumentsHost);

            expect(messageService.setMessage).toHaveBeenCalledWith(
                'request.error.validation',
                { customLanguage: EnumMessageLanguage.en }
            );
        });

        it('spreads exception metadata under the response metadata and carries no data', async () => {
            const exception = new ResponseSerializationException({
                metadata: {
                    source: 'serialization',
                    language: 'id',
                },
            });

            let body: unknown = null;
            response.json.mockImplementationOnce(sent => {
                body = sent;

                return response;
            });

            await filter.catch(exception, argumentsHost);

            expect(body).not.toHaveProperty('data');
            expect(response.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: {
                        ...metadata,
                        source: 'serialization',
                    },
                })
            );
        });

        it('answers 409 with the database write-conflict code for an AppUnknownException wrapping a Prisma P2034 error', async () => {
            const rawError = new Prisma.PrismaClientKnownRequestError(
                'conflict',
                { code: 'P2034', clientVersion: '6.19.0' }
            );

            await filter.catch(
                new AppUnknownException(rawError),
                argumentsHost
            );

            expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
            expect(response.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: EnumDatabaseStatusCodeError.writeConflict,
                    module: 'database',
                })
            );
            expect(sentryService.captureException).not.toHaveBeenCalled();
        });

        it('answers 503 with the redis unavailable code for an AppUnknownException wrapping a keyv not-connected error and reports the raw error', async () => {
            const rawError = new Error(
                RedisErrorMessages.RedisClientNotConnectedThrown
            );

            await filter.catch(
                new AppUnknownException(rawError),
                argumentsHost
            );

            expect(response.status).toHaveBeenCalledWith(
                HttpStatus.SERVICE_UNAVAILABLE
            );
            expect(response.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: EnumRedisStatusCodeError.unavailable,
                    module: 'redis',
                })
            );
            expect(sentryService.captureException).toHaveBeenCalledWith(
                rawError
            );
        });

        it('keeps 500 for an AppUnknownException wrapping an unrelated error', async () => {
            await filter.catch(
                new AppUnknownException(new Error('boom')),
                argumentsHost
            );

            expect(response.status).toHaveBeenCalledWith(
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        });

        it('does not map the rawError of an exception other than AppUnknownException', async () => {
            const rawError = new Prisma.PrismaClientKnownRequestError(
                'conflict',
                { code: 'P2034', clientVersion: '6.19.0' }
            );
            const exception = new ResponseSerializationException({
                rawError,
            });

            await filter.catch(exception, argumentsHost);

            expect(response.status).toHaveBeenCalledWith(
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        });

        it('reports an AppUnknownException subclass that carries a description and no cause as itself', async () => {
            const exception = new AppUnknownException(
                null,
                'Firebase private key could not be normalized'
            );

            await filter.catch(exception, argumentsHost);

            expect(response.status).toHaveBeenCalledWith(
                HttpStatus.INTERNAL_SERVER_ERROR
            );
            expect(sentryService.captureException).toHaveBeenCalledWith(
                exception
            );
        });

        it('reports a described AppUnknownException itself with the cause chained, not the rawError', async () => {
            const rawError = new Error('boom');
            const exception = new AppUnknownException(
                rawError,
                'Seeding policies failed'
            );

            await filter.catch(exception, argumentsHost);

            expect(sentryService.captureException).toHaveBeenCalledWith(
                exception
            );
            expect(sentryService.captureException).not.toHaveBeenCalledWith(
                rawError
            );
        });

        it('mirrors the metadata onto the response headers', async () => {
            await filter.catch(new Error('boom'), argumentsHost);

            expect(responseMetadataService.setHeaders).toHaveBeenCalledWith(
                response,
                metadata
            );
        });

        it('resolves to undefined', async () => {
            await expect(
                filter.catch(new Error('boom'), argumentsHost)
            ).resolves.toBeUndefined();
        });
    });

    describe('sendToSentry', () => {
        it('reports the error itself when it is not an AppBaseException', () => {
            const error = new Error('boom');

            filter['sendToSentry'](error, new AppUnknownException(error));

            expect(sentryService.captureException).toHaveBeenCalledWith(error);
        });

        it('reports the rawError when the exception is 500 or above', () => {
            const rawError = new Error('boom');
            const exception = new AppUnknownException(rawError);

            filter['sendToSentry'](exception, exception);

            expect(sentryService.captureException).toHaveBeenCalledWith(
                rawError
            );
        });

        it('reports the exception itself when it carries a description', () => {
            const exception = new AppUnknownException(
                new Error('boom'),
                'Seeding policies failed'
            );

            filter['sendToSentry'](exception, exception);

            expect(sentryService.captureException).toHaveBeenCalledWith(
                exception
            );
        });

        it('reports the exception itself when a 500 exception carries no rawError', () => {
            const exception = new AppUnknownException(undefined);

            filter['sendToSentry'](exception, exception);

            expect(sentryService.captureException).toHaveBeenCalledWith(
                exception
            );
        });

        it('reports nothing when the resolved exception is below 500', () => {
            const exception = new RequestValidationException([]);

            filter['sendToSentry'](exception, exception);

            expect(sentryService.captureException).not.toHaveBeenCalled();
        });
    });
});
