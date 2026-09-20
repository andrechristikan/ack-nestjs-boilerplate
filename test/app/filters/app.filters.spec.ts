import { createMock } from '@golevelup/ts-vitest';
import * as Sentry from '@sentry/nestjs';
import { HttpException, HttpStatus, type ArgumentsHost } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppBaseExceptionFilter } from '@app/filters/app.base-exception.filter';
import { AppGeneralFilter } from '@app/filters/app.general.filter';
import { AppHttpFilter } from '@app/filters/app.http.filter';
import { AppValidationImportFilter } from '@app/filters/app.validation-import.filter';
import { AppValidationFilter } from '@app/filters/app.validation.filter';
import { AuthTwoFactorAttemptTemporaryLockException } from '@modules/auth/exceptions/auth.two-factor-attempt-temporary-lock.exception';
import { FileImportException } from '@common/file/exceptions/file.import.exception';
import { MessageService } from '@common/message/services/message.service';
import { FileRequiredException } from '@common/file/exceptions/file.required.exception';
import { RequestValidationException } from '@common/request/exceptions/request.validation.exception';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import type { Response } from 'express';

vi.mock(import('@sentry/nestjs'), async importOriginal => ({
    ...(await importOriginal()),
    captureException: vi.fn(),
}));

describe('Application error filters', () => {
    const metadata = {
        language: EnumMessageLanguage.en,
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
    const sentryService = new SentryService();
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
                { provide: SentryService, useValue: sentryService },
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
        expect(messageService.setMessage).toHaveBeenCalledWith(
            'http.serverError.internalServerError',
            { customLanguage: 'en' }
        );
        expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(json).toHaveBeenCalledWith({
            statusCode: EnumAppStatusCodeError.unknown,
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

    it('forwards message properties and data and lets request metadata win over exception metadata', async () => {
        const filter = await resolveFilter(AppBaseExceptionFilter);
        const exception = Object.assign(
            new AuthTwoFactorAttemptTemporaryLockException(30),
            {
                metadata: { language: 'xx', extra: 'kept' },
                data: { attempts: 5 },
            }
        );

        await filter.catch(exception, host);

        expect(messageService.setMessage).toHaveBeenCalledWith(
            'auth.error.twoFactorAttemptTemporaryLock',
            {
                customLanguage: 'en',
                properties: { retryAfterSeconds: 30 },
            }
        );
        expect(status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({
                module: 'auth',
                data: { attempts: 5 },
                metadata: { ...metadata, extra: 'kept' },
            })
        );
        expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('reports the exception itself for a 5xx without a raw cause', async () => {
        const filter = await resolveFilter(AppBaseExceptionFilter);
        const exception = Object.assign(new FileRequiredException(), {
            httpStatus: HttpStatus.BAD_GATEWAY,
        });

        await filter.catch(exception, host);

        expect(Sentry.captureException).toHaveBeenCalledWith(exception);
    });

    it('still responds when Sentry throws while reporting', async () => {
        vi.mocked(Sentry.captureException).mockImplementation(() => {
            throw new Error('sentry down');
        });
        const baseFilter = await resolveFilter(AppBaseExceptionFilter);
        const httpFilter = await resolveFilter(AppHttpFilter);
        const generalFilter = await resolveFilter(AppGeneralFilter);

        await baseFilter.catch(new AppUnknownException(new Error('x')), host);
        await httpFilter.catch(
            new HttpException('bad', HttpStatus.BAD_GATEWAY),
            host
        );
        await generalFilter.catch(new Error('y'), host);

        expect(status).toHaveBeenCalledTimes(3);
        expect(json).toHaveBeenCalledTimes(3);
    });

    it('falls back to the numeric status when the HTTP status has no name', async () => {
        const filter = await resolveFilter(AppHttpFilter);

        await filter.catch(new HttpException('odd', 599), host);

        expect(messageService.setMessage).toHaveBeenCalledWith('http.599', {
            customLanguage: 'en',
        });
        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 599, statusCodeKey: '599' })
        );
    });

    it('camel-cases the status name for a framework 5xx and reports it', async () => {
        const filter = await resolveFilter(AppHttpFilter);
        const exception = new HttpException('x', HttpStatus.BAD_GATEWAY);

        await filter.catch(exception, host);

        expect(Sentry.captureException).toHaveBeenCalledWith(exception);
        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCodeKey: 'badGateway',
                module: 'http',
            })
        );
    });

    it('renders the exception status, key, module and metadata on validation failures', async () => {
        const validationFilter = await resolveFilter(AppValidationFilter);
        const importFilter = await resolveFilter(AppValidationImportFilter);
        messageService.setValidationMessage.mockReturnValue([]);
        messageService.setValidationImportMessage.mockReturnValue([]);
        const validation = new RequestValidationException([]);
        const fileImport = new FileImportException([]);

        await validationFilter.catch(validation, host);
        await importFilter.catch(fileImport, host);

        expect(status).toHaveBeenNthCalledWith(1, validation.httpStatus);
        expect(json).toHaveBeenNthCalledWith(1, {
            statusCode: validation.statusCode,
            statusCodeKey: validation.statusCodeKey,
            module: validation.module,
            message: 'localized message',
            metadata,
            errors: [],
        });
        expect(status).toHaveBeenNthCalledWith(2, fileImport.httpStatus);
        expect(json).toHaveBeenNthCalledWith(2, {
            statusCode: fileImport.statusCode,
            statusCodeKey: fileImport.statusCodeKey,
            module: fileImport.module,
            message: 'localized message',
            metadata,
            errors: [],
        });
        expect(responseMetadataService.setHeaders).toHaveBeenCalledTimes(2);
        expect(messageService.setMessage).toHaveBeenNthCalledWith(
            1,
            validation.messagePath,
            { customLanguage: 'en' }
        );
        expect(messageService.setMessage).toHaveBeenNthCalledWith(
            2,
            fileImport.messagePath,
            { customLanguage: 'en' }
        );
    });
});
