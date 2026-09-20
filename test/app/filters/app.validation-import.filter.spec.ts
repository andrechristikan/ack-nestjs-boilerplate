import type { ArgumentsHost } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppValidationImportFilter } from '@app/filters/app.validation-import.filter';
import { FileImportException } from '@common/file/exceptions/file.import.exception';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import type {
    IMessageValidationImportError,
    IMessageValidationImportErrorParam,
} from '@common/message/interfaces/message.interface';
import { MessageService } from '@common/message/services/message.service';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import type { ResponseMetadataDto } from '@common/response/dtos/response.metadata.dto';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';

describe('AppValidationImportFilter', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const responseMetadataService: MockProxy<ResponseMetadataService> =
        mock<ResponseMetadataService>();
    const response: MockProxy<Response> = mock<Response>();
    const httpArgumentsHost: MockProxy<
        ReturnType<ArgumentsHost['switchToHttp']>
    > = mock<ReturnType<ArgumentsHost['switchToHttp']>>();
    const argumentsHost: MockProxy<ArgumentsHost> = mock<ArgumentsHost>();

    let metadata: ResponseMetadataDto;
    let importErrors: IMessageValidationImportErrorParam[];
    let errors: IMessageValidationImportError[];
    let filter: AppValidationImportFilter;

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
        importErrors = [
            {
                row: 2,
                errors: [{ message: 'Invalid input', path: ['email'] }],
            },
        ];
        errors = [
            {
                row: 2,
                errors: [
                    {
                        key: 'invalidType',
                        property: 'email',
                        message: 'email must be an email',
                    },
                ],
            },
        ];
    });

    beforeEach(async () => {
        vi.resetAllMocks();

        argumentsHost.switchToHttp.mockReturnValue(httpArgumentsHost);
        httpArgumentsHost.getResponse.mockReturnValue(response);
        response.status.mockReturnValue(response);
        responseMetadataService.create.mockReturnValue(metadata);
        messageService.setMessage.mockReturnValue('Import Validation Error');
        messageService.setValidationImportMessage.mockReturnValue(errors);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppValidationImportFilter,
                { provide: MessageService, useValue: messageService },
                {
                    provide: ResponseMetadataService,
                    useValue: responseMetadataService,
                },
            ],
        }).compile();

        filter = module.get(AppValidationImportFilter);
    });

    describe('catch', () => {
        it('responds 422 with the import error envelope carrying the row errors', async () => {
            const exception = new FileImportException(importErrors);

            await filter.catch(exception, argumentsHost);

            expect(response.status).toHaveBeenCalledWith(
                HttpStatus.UNPROCESSABLE_ENTITY
            );
            expect(response.json).toHaveBeenCalledWith({
                statusCode: EnumRequestStatusCodeError.validation,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.validation
                    ],
                module: 'file',
                message: 'Import Validation Error',
                metadata,
                errors,
            });
        });

        it('translates the exception messagePath with the metadata language', async () => {
            const exception = new FileImportException(importErrors);

            await filter.catch(exception, argumentsHost);

            expect(messageService.setMessage).toHaveBeenCalledWith(
                'file.error.validationDto',
                { customLanguage: EnumMessageLanguage.en }
            );
        });

        it('localizes the per-row errors with the metadata language', async () => {
            const exception = new FileImportException(importErrors);

            await filter.catch(exception, argumentsHost);

            expect(
                messageService.setValidationImportMessage
            ).toHaveBeenCalledWith(importErrors, {
                customLanguage: EnumMessageLanguage.en,
            });
        });

        it('mirrors the metadata onto the response headers', async () => {
            const exception = new FileImportException(importErrors);

            await filter.catch(exception, argumentsHost);

            expect(responseMetadataService.setHeaders).toHaveBeenCalledWith(
                response,
                metadata
            );
        });

        it('resolves to undefined', async () => {
            await expect(
                filter.catch(
                    new FileImportException(importErrors),
                    argumentsHost
                )
            ).resolves.toBeUndefined();
        });
    });
});
