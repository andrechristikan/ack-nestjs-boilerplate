import type { ArgumentsHost } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppGeneralFilter } from '@app/filters/app.general.filter';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { MessageService } from '@common/message/services/message.service';
import type { ResponseMetadataDto } from '@common/response/dtos/response.metadata.dto';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import { SentryService } from '@common/sentry/services/sentry.service';

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
            ],
        }).compile();

        filter = module.get(AppGeneralFilter);
    });

    describe('catch', () => {
        it('responds 500 with the app unknown error envelope', async () => {
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

        it('reports the exception to Sentry', async () => {
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
        it('reports the exception', () => {
            const exception = new Error('boom');

            filter['sendToSentry'](exception);

            expect(sentryService.captureException).toHaveBeenCalledWith(
                exception
            );
        });
    });
});
