import { createMock } from '@golevelup/ts-vitest';
import * as Sentry from '@sentry/nestjs';
import { HttpException, HttpStatus, type ArgumentsHost } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AppBaseExceptionFilter } from '@app/filters/app.base-exception.filter';
import { AppGeneralFilter } from '@app/filters/app.general.filter';
import { AppHttpFilter } from '@app/filters/app.http.filter';
import { AppValidationImportFilter } from '@app/filters/app.validation-import.filter';
import { AppValidationFilter } from '@app/filters/app.validation.filter';
import { FileImportException } from '@common/file/exceptions/file.import.exception';
import { MessageService } from '@common/message/services/message.service';
import { FileRequiredException } from '@common/file/exceptions/file.required.exception';
import { RequestValidationException } from '@common/request/exceptions/request.validation.exception';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import type { Response } from 'express';

vi.mock(import('@sentry/nestjs'), async importOriginal => ({
    ...(await importOriginal()),
    captureException: vi.fn(),
}));

describe('Application error filters', () => {
    const metadata = {
        language: 'en',
        timestamp: 1,
        timezone: 'UTC',
        version: '1',
        repoVersion: '9.0.0',
        requestId: 'request-id',
        correlationId: 'correlation-id',
    } as const;
    const messageService =
        createMock<
            Pick<
                MessageService,
                | 'setMessage'
                | 'setValidationMessage'
                | 'setValidationImportMessage'
            >
        >();
    const responseMetadataService =
        createMock<Pick<ResponseMetadataService, 'create' | 'setHeaders'>>();
    const json = vi.fn<(body: unknown) => Response>();
    const status = vi.fn<(statusCode: number) => Response>();
    const response = createMock<Response>({ json, status });
    const host = createMock<ArgumentsHost>({
        switchToHttp: () =>
            createMock<ReturnType<ArgumentsHost['switchToHttp']>>({
                getResponse: () => response,
            }),
    });

    beforeEach(() => {
        vi.resetAllMocks();
        messageService.setMessage.mockReturnValue('localized message');
        responseMetadataService.create.mockReturnValue(metadata);
        status.mockReturnValue(response);
        json.mockReturnValue(response);
    });

    async function resolveFilter<T>(
        subject: new (...args: never[]) => T
    ): Promise<T> {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                subject,
                { provide: MessageService, useValue: messageService },
                {
                    provide: ResponseMetadataService,
                    useValue: responseMetadataService,
                },
            ],
        }).compile();

        return moduleRef.get(subject);
    }

    it('renders an application exception without reporting a 4xx error', async () => {
        const filter = await resolveFilter(AppBaseExceptionFilter);
        const exception = new FileRequiredException();

        await filter.catch(exception, host);

        expect(Sentry.captureException).not.toHaveBeenCalled();
        expect(messageService.setMessage).toHaveBeenCalledWith(
            exception.messagePath,
            { customLanguage: 'en' }
        );
        expect(responseMetadataService.setHeaders).toHaveBeenCalledWith(
            response,
            metadata
        );
        expect(status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(json).toHaveBeenCalledWith({
            statusCode: exception.statusCode,
            statusCodeKey: exception.statusCodeKey,
            module: 'file',
            message: 'localized message',
            metadata,
            data: undefined,
        });
    });

    it('reports the raw cause for a 5xx application exception', async () => {
        const filter = await resolveFilter(AppBaseExceptionFilter);
        const cause = new Error('database unavailable');

        await filter.catch(new AppUnknownException(cause), host);

        expect(Sentry.captureException).toHaveBeenCalledWith(cause);
        expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('renders and reports unknown errors through the general fallback', async () => {
        const filter = await resolveFilter(AppGeneralFilter);
        const exception = new Error('unexpected');

        await filter.catch(exception, host);

        expect(Sentry.captureException).toHaveBeenCalledWith(exception);
        expect(messageService.setMessage).toHaveBeenCalledWith('http.500', {
            customLanguage: 'en',
        });
        expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(json).toHaveBeenCalledWith({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            statusCodeKey: 'unknown',
            module: 'app',
            message: 'localized message',
            metadata,
        });
    });

    it('maps a framework 404 without reporting it', async () => {
        const filter = await resolveFilter(AppHttpFilter);

        await filter.catch(
            new HttpException('missing', HttpStatus.NOT_FOUND),
            host
        );

        expect(Sentry.captureException).not.toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
        expect(json).toHaveBeenCalledWith({
            statusCode: HttpStatus.NOT_FOUND,
            statusCodeKey: 'notFound',
            module: 'http',
            message: 'localized message',
            metadata,
            data: undefined,
        });
    });

    it('preserves project fields from an extended HTTP exception', async () => {
        const filter = await resolveFilter(AppHttpFilter);
        const exception = new HttpException(
            {
                statusCodeKey: 'customFailure',
                module: 'gateway',
                data: { retryable: true },
            },
            HttpStatus.BAD_GATEWAY
        );

        await filter.catch(exception, host);

        expect(Sentry.captureException).toHaveBeenCalledWith(exception);
        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCodeKey: 'customFailure',
                module: 'gateway',
                data: { retryable: true },
            })
        );
    });

    it('renders localized request validation issues without Sentry', async () => {
        const filter = await resolveFilter(AppValidationFilter);
        const issues = [{ message: 'Invalid email', path: ['email'] }];
        const localizedErrors = [
            {
                key: 'invalidFormat',
                property: 'email',
                message: 'Invalid email',
            },
        ];
        messageService.setValidationMessage.mockReturnValue(localizedErrors);

        await filter.catch(new RequestValidationException(issues), host);

        expect(messageService.setValidationMessage).toHaveBeenCalledWith(
            issues,
            { customLanguage: 'en' }
        );
        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({ errors: localizedErrors })
        );
        expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('renders localized per-row import errors without Sentry', async () => {
        const filter = await resolveFilter(AppValidationImportFilter);
        const importErrors = [
            { row: 2, errors: [{ message: 'Required', path: ['email'] }] },
        ];
        const localizedErrors = [
            {
                row: 2,
                errors: [
                    {
                        key: 'required',
                        property: 'email',
                        message: 'Required',
                    },
                ],
            },
        ];
        messageService.setValidationImportMessage.mockReturnValue(
            localizedErrors
        );

        await filter.catch(new FileImportException(importErrors), host);

        expect(messageService.setValidationImportMessage).toHaveBeenCalledWith(
            importErrors,
            { customLanguage: 'en' }
        );
        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({ errors: localizedErrors })
        );
        expect(Sentry.captureException).not.toHaveBeenCalled();
    });
});
