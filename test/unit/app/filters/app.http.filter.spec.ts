import type { ArgumentsHost } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppHttpFilter } from '@app/filters/app.http.filter';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { MessageService } from '@common/message/services/message.service';
import type { ResponseMetadataDto } from '@common/response/dtos/response.metadata.dto';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import { SentryService } from '@common/sentry/services/sentry.service';

describe('AppHttpFilter', () => {
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
    let filter: AppHttpFilter;

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
        messageService.setMessage.mockReturnValue('Not Found');

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppHttpFilter,
                { provide: MessageService, useValue: messageService },
                {
                    provide: ResponseMetadataService,
                    useValue: responseMetadataService,
                },
                { provide: SentryService, useValue: sentryService },
            ],
        }).compile();

        filter = module.get(AppHttpFilter);
    });

    describe('catch', () => {
        it('derives statusCodeKey from the camelCased HttpStatus name and defaults the module to http', async () => {
            const exception = new HttpException(
                'Not Found',
                HttpStatus.NOT_FOUND
            );

            await filter.catch(exception, argumentsHost);

            expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
            expect(response.json).toHaveBeenCalledWith({
                statusCode: HttpStatus.NOT_FOUND,
                statusCodeKey: 'notFound',
                module: 'http',
                message: 'Not Found',
                metadata,
                data: undefined,
            });
        });

        it('takes statusCodeKey, module and data from an object response body', async () => {
            const exception = new HttpException(
                {
                    statusCodeKey: 'throttleStrict',
                    module: 'request',
                    data: { retryAfter: 60 },
                },
                HttpStatus.TOO_MANY_REQUESTS
            );

            await filter.catch(exception, argumentsHost);

            expect(response.status).toHaveBeenCalledWith(
                HttpStatus.TOO_MANY_REQUESTS
            );
            expect(response.json).toHaveBeenCalledWith({
                statusCode: HttpStatus.TOO_MANY_REQUESTS,
                statusCodeKey: 'throttleStrict',
                module: 'request',
                message: 'Not Found',
                metadata,
                data: { retryAfter: 60 },
            });
        });

        it('falls back to the status name and http module when the object response body carries neither', async () => {
            const exception = new HttpException(
                { message: 'Bad Request' },
                HttpStatus.BAD_REQUEST
            );

            await filter.catch(exception, argumentsHost);

            expect(response.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCodeKey: 'badRequest',
                    module: 'http',
                    data: undefined,
                })
            );
        });

        it('falls back to the status name and http module when the response body is not an object', async () => {
            const exception = new HttpException(
                null as unknown as string,
                HttpStatus.BAD_REQUEST
            );

            await filter.catch(exception, argumentsHost);

            expect(response.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: HttpStatus.BAD_REQUEST,
                    statusCodeKey: 'badRequest',
                    module: 'http',
                    data: undefined,
                })
            );
        });

        it('uses the numeric status as statusCodeKey when HttpStatus has no name for it', async () => {
            const exception = new HttpException('Unknown', 599);

            await filter.catch(exception, argumentsHost);

            expect(response.status).toHaveBeenCalledWith(599);
            expect(response.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 599,
                    statusCodeKey: '599',
                })
            );
        });

        it('translates the http status message path with the metadata language', async () => {
            const exception = new HttpException(
                'Not Found',
                HttpStatus.NOT_FOUND
            );

            await filter.catch(exception, argumentsHost);

            expect(messageService.setMessage).toHaveBeenCalledWith('http.404', {
                customLanguage: EnumMessageLanguage.en,
            });
        });

        it('mirrors the metadata onto the response headers', async () => {
            const exception = new HttpException(
                'Not Found',
                HttpStatus.NOT_FOUND
            );

            await filter.catch(exception, argumentsHost);

            expect(responseMetadataService.setHeaders).toHaveBeenCalledWith(
                response,
                metadata
            );
        });

        it('resolves to undefined', async () => {
            await expect(
                filter.catch(
                    new HttpException('Not Found', HttpStatus.NOT_FOUND),
                    argumentsHost
                )
            ).resolves.toBeUndefined();
        });
    });

    describe('sendToSentry', () => {
        it('reports the exception when the status is 500 or above', () => {
            const exception = new HttpException(
                'Internal Server Error',
                HttpStatus.INTERNAL_SERVER_ERROR
            );

            filter['sendToSentry'](exception);

            expect(sentryService.captureException).toHaveBeenCalledWith(
                exception
            );
        });

        it('reports nothing when the status is below 500', () => {
            const exception = new HttpException(
                'Not Found',
                HttpStatus.NOT_FOUND
            );

            filter['sendToSentry'](exception);

            expect(sentryService.captureException).not.toHaveBeenCalled();
        });
    });
});
