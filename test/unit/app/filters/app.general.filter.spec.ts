import type { ArgumentsHost } from '@nestjs/common';
import { HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { Prisma } from '@generated/prisma-client/client';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AppGeneralFilter } from '@app/filters/app.general.filter';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import { CacheService } from '@common/cache/services/cache.service';
import { EnumRedisStatusCodeError } from '@common/redis/enums/redis.status-code.enum';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { MessageService } from '@common/message/services/message.service';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestValidationException } from '@common/request/exceptions/request.validation.exception';
import type { ResponseMetadataDto } from '@common/response/dtos/response.metadata.dto';
import { ResponseSerializationException } from '@common/response/exceptions/response.serialization.exception';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { UserImportEmailExistException } from '@modules/user/exceptions/user.import-email-exist.exception';
import { buildStatusException } from '@test/unit/helpers/test.unit.app-exception.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('AppGeneralFilter', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const responseMetadataService: MockProxy<ResponseMetadataService> =
        mock<ResponseMetadataService>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const response: MockProxy<Response> = mock<Response>();
    const httpArgumentsHost: MockProxy<
        ReturnType<ArgumentsHost['switchToHttp']>
    > = mock<ReturnType<ArgumentsHost['switchToHttp']>>();
    const argumentsHost: MockProxy<ArgumentsHost> = mock<ArgumentsHost>();

    let filter: AppGeneralFilter;

    const metadata: ResponseMetadataDto = {
        language: EnumMessageLanguage.en,
        timestamp: 1758153600000,
        timezone: 'Asia/Jakarta',
        version: '1',
        repoVersion: '1.0.0',
        requestId: '01966c9a-2b8d-7000-a957-4e1c1de0c8f7',
        correlationId: '01966c9a-2b8d-7000-a957-4e1c1de0c8f8',
    };

    beforeEach(async () => {
        argumentsHost.switchToHttp.mockReturnValue(httpArgumentsHost);
        httpArgumentsHost.getResponse.mockReturnValue(response);
        response.status.mockReturnValue(response);
        responseMetadataService.create.mockReturnValue(metadata);
        messageService.setMessage.mockReturnValue('Internal Server Error');
        cacheService.isConnectionError.mockReturnValue(false);

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
                { provide: ConfigService, useValue: buildConfigService({}) },
                { provide: CacheService, useValue: cacheService },
                { provide: DatabaseService, useValue: databaseService },
            ],
        }).compile();

        filter = module.get(AppGeneralFilter);
    });

    describe('catch', () => {
        it.each([
            HttpStatus.UNAUTHORIZED,
            HttpStatus.FORBIDDEN,
            HttpStatus.PAYLOAD_TOO_LARGE,
            HttpStatus.UNSUPPORTED_MEDIA_TYPE,
            HttpStatus.UNPROCESSABLE_ENTITY,
            HttpStatus.TOO_MANY_REQUESTS,
        ])('warns once with the refusal fields for %s', async httpStatus => {
            const warn = vi.spyOn(Logger.prototype, 'warn');

            await filter.catch(buildStatusException(httpStatus), argumentsHost);

            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn).toHaveBeenCalledWith(
                { statusCode: 12345, statusCodeKey: 'statusKey', httpStatus },
                'A request was refused'
            );
            expect(sentryService.captureException).not.toHaveBeenCalled();
        });

        it.each([
            HttpStatus.BAD_REQUEST,
            HttpStatus.NOT_FOUND,
            HttpStatus.CONFLICT,
        ])('writes no warn for %s', async httpStatus => {
            const warn = vi.spyOn(Logger.prototype, 'warn');

            await filter.catch(buildStatusException(httpStatus), argumentsHost);

            expect(warn).not.toHaveBeenCalled();
        });

        it('keeps the error line and the Sentry report for a 500 and writes no warn', async () => {
            const warn = vi.spyOn(Logger.prototype, 'warn');
            const error = vi.spyOn(Logger.prototype, 'error');
            const exception = buildStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR
            );

            await filter.catch(exception, argumentsHost);

            expect(error).toHaveBeenCalledTimes(1);
            expect(sentryService.captureException).toHaveBeenCalledWith(
                exception
            );
            expect(warn).not.toHaveBeenCalled();
        });

        const serverSelectionTimeout = new Prisma.PrismaClientKnownRequestError(
            'Raw query failed. Code: `unknown`. Message: `Kind: Server selection timeout: No available servers.`',
            { code: 'P2010', clientVersion: '6.19.0' }
        );
        const initializationError = new Prisma.PrismaClientInitializationError(
            'cannot reach database',
            '6.19.0'
        );
        const databaseUnavailableBody = {
            statusCode: EnumDatabaseStatusCodeError.unavailable,
            statusCodeKey:
                EnumDatabaseStatusCodeError[
                    EnumDatabaseStatusCodeError.unavailable
                ],
            module: 'database',
            message: 'Internal Server Error',
        };

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

        it('renders RedisUnavailableException (503, 52400) carrying the raw error as rawError when the raw error is a connection error', async () => {
            const error = new Error('connection lost');
            cacheService.isConnectionError.mockReturnValue(true);
            cacheService.isFirstInWindow.mockReturnValue(true);

            await filter.catch(error, argumentsHost);

            expect(cacheService.isConnectionError).toHaveBeenCalledWith(error);
            expect(response.status).toHaveBeenCalledWith(
                HttpStatus.SERVICE_UNAVAILABLE
            );
            expect(response.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: EnumRedisStatusCodeError.unavailable,
                    statusCodeKey:
                        EnumRedisStatusCodeError[
                            EnumRedisStatusCodeError.unavailable
                        ],
                    module: 'redis',
                })
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'redis.error.unavailable',
                { customLanguage: EnumMessageLanguage.en }
            );
            expect(sentryService.captureException).toHaveBeenCalledWith(error);
        });

        it('logs and reports the first RedisUnavailableException in a window', async () => {
            const rawError = new Error('connection lost');
            cacheService.isFirstInWindow.mockReturnValue(true);

            await filter.catch(
                new RedisUnavailableException(rawError),
                argumentsHost
            );

            expect(cacheService.isFirstInWindow).toHaveBeenCalledWith(
                RedisUnavailableException.name
            );
            expect(sentryService.captureException).toHaveBeenCalledTimes(1);
            expect(sentryService.captureException).toHaveBeenCalledWith(
                rawError
            );
        });

        it('answers 503 without a report for a RedisUnavailableException inside the window', async () => {
            cacheService.isFirstInWindow.mockReturnValue(false);

            await filter.catch(
                new RedisUnavailableException(new Error('connection lost')),
                argumentsHost
            );

            expect(cacheService.isFirstInWindow).toHaveBeenCalledWith(
                RedisUnavailableException.name
            );
            expect(response.status).toHaveBeenCalledWith(
                HttpStatus.SERVICE_UNAVAILABLE
            );
            expect(response.json).toHaveBeenCalledWith({
                statusCode: EnumRedisStatusCodeError.unavailable,
                statusCodeKey:
                    EnumRedisStatusCodeError[
                        EnumRedisStatusCodeError.unavailable
                    ],
                module: 'redis',
                message: 'Internal Server Error',
                metadata,
            });
            expect(sentryService.captureException).not.toHaveBeenCalled();
        });

        it('logs and reports a P2010 server selection timeout first in the database window', async () => {
            databaseService.isFirstUnavailableInWindow.mockReturnValue(true);

            await filter.catch(serverSelectionTimeout, argumentsHost);

            expect(response.status).toHaveBeenCalledWith(
                HttpStatus.SERVICE_UNAVAILABLE
            );
            expect(response.json).toHaveBeenCalledWith({
                ...databaseUnavailableBody,
                metadata,
            });
            expect(sentryService.captureException).toHaveBeenCalledTimes(1);
            expect(cacheService.isFirstInWindow).not.toHaveBeenCalled();
        });

        it('answers 503 without a report for a P2010 server selection timeout inside the database window', async () => {
            databaseService.isFirstUnavailableInWindow.mockReturnValue(false);

            await filter.catch(serverSelectionTimeout, argumentsHost);

            expect(response.status).toHaveBeenCalledWith(
                HttpStatus.SERVICE_UNAVAILABLE
            );
            expect(response.json).toHaveBeenCalledWith({
                ...databaseUnavailableBody,
                metadata,
            });
            expect(sentryService.captureException).not.toHaveBeenCalled();
            expect(cacheService.isFirstInWindow).not.toHaveBeenCalled();
        });

        it('logs and reports a PrismaClientInitializationError first in the database window', async () => {
            databaseService.isFirstUnavailableInWindow.mockReturnValue(true);

            await filter.catch(initializationError, argumentsHost);

            expect(response.status).toHaveBeenCalledWith(
                HttpStatus.SERVICE_UNAVAILABLE
            );
            expect(response.json).toHaveBeenCalledWith({
                ...databaseUnavailableBody,
                metadata,
            });
            expect(sentryService.captureException).toHaveBeenCalledTimes(1);
            expect(cacheService.isFirstInWindow).not.toHaveBeenCalled();
        });

        it('answers 503 without a report for a PrismaClientInitializationError inside the database window', async () => {
            databaseService.isFirstUnavailableInWindow.mockReturnValue(false);

            await filter.catch(initializationError, argumentsHost);

            expect(response.status).toHaveBeenCalledWith(
                HttpStatus.SERVICE_UNAVAILABLE
            );
            expect(response.json).toHaveBeenCalledWith({
                ...databaseUnavailableBody,
                metadata,
            });
            expect(sentryService.captureException).not.toHaveBeenCalled();
            expect(cacheService.isFirstInWindow).not.toHaveBeenCalled();
        });

        it('reports every other 5xx without consulting the window', async () => {
            const error = new Error('boom');

            await filter.catch(error, argumentsHost);

            expect(cacheService.isFirstInWindow).not.toHaveBeenCalled();
            expect(
                databaseService.isFirstUnavailableInWindow
            ).not.toHaveBeenCalled();
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
            const exception = new UserImportEmailExistException(
                'a@example.com'
            );

            await filter.catch(exception, argumentsHost);

            expect(messageService.setMessage).toHaveBeenCalledWith(
                'user.error.importEmailExist',
                {
                    customLanguage: EnumMessageLanguage.en,
                    properties: { emails: 'a@example.com' },
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

        it('answers metadata holding exactly the schema keys and carries no data', async () => {
            const exception = new ResponseSerializationException();

            let body: unknown = null;
            response.json.mockImplementationOnce(sent => {
                body = sent;

                return response;
            });

            await filter.catch(exception, argumentsHost);

            expect(body).not.toHaveProperty('data');
            expect(response.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata,
                })
            );
        });

        it('spreads exception metadata under the response metadata, a schema key winning', async () => {
            const exception = new ResponseSerializationException({
                metadata: { extra: 1, language: 'id' },
            });

            await filter.catch(exception, argumentsHost);

            expect(response.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: { ...metadata, extra: 1 },
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

        it('renders the mapped RedisUnavailableException for an AppUnknownException whose rawError is a connection error', async () => {
            const rawError = new Error('connection lost');
            cacheService.isConnectionError.mockReturnValue(true);
            cacheService.isFirstInWindow.mockReturnValue(true);

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
