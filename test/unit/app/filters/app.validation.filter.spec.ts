import type { ArgumentsHost } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppValidationFilter } from '@app/filters/app.validation.filter';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import type { IMessageValidationError } from '@common/message/interfaces/message.interface';
import { MessageService } from '@common/message/services/message.service';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestValidationException } from '@common/request/exceptions/request.validation.exception';
import type { ResponseMetadataDto } from '@common/response/dtos/response.metadata.dto';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';

describe('AppValidationFilter', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const responseMetadataService: MockProxy<ResponseMetadataService> =
        mock<ResponseMetadataService>();
    const response: MockProxy<Response> = mock<Response>();
    const httpArgumentsHost: MockProxy<
        ReturnType<ArgumentsHost['switchToHttp']>
    > = mock<ReturnType<ArgumentsHost['switchToHttp']>>();
    const argumentsHost: MockProxy<ArgumentsHost> = mock<ArgumentsHost>();

    let metadata: ResponseMetadataDto;
    let issues: readonly StandardSchemaV1.Issue[];
    let errors: IMessageValidationError[];
    let filter: AppValidationFilter;

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
        issues = [{ message: 'Invalid input', path: ['email'] }];
        errors = [
            {
                key: 'invalidType',
                property: 'email',
                message: 'email must be an email',
            },
        ];
    });

    beforeEach(async () => {
        vi.resetAllMocks();

        argumentsHost.switchToHttp.mockReturnValue(httpArgumentsHost);
        httpArgumentsHost.getResponse.mockReturnValue(response);
        response.status.mockReturnValue(response);
        responseMetadataService.create.mockReturnValue(metadata);
        messageService.setMessage.mockReturnValue('Validation Error');
        messageService.setValidationMessage.mockReturnValue(errors);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppValidationFilter,
                { provide: MessageService, useValue: messageService },
                {
                    provide: ResponseMetadataService,
                    useValue: responseMetadataService,
                },
            ],
        }).compile();

        filter = module.get(AppValidationFilter);
    });

    describe('catch', () => {
        it('responds 422 with the validation error envelope', async () => {
            const exception = new RequestValidationException(issues);

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
                module: 'request',
                message: 'Validation Error',
                metadata,
                errors,
            });
        });

        it('translates the exception messagePath with the metadata language', async () => {
            const exception = new RequestValidationException(issues);

            await filter.catch(exception, argumentsHost);

            expect(messageService.setMessage).toHaveBeenCalledWith(
                'request.error.validation',
                { customLanguage: EnumMessageLanguage.en }
            );
        });

        it('localizes the exception issues with the metadata language', async () => {
            const exception = new RequestValidationException(issues);

            await filter.catch(exception, argumentsHost);

            expect(messageService.setValidationMessage).toHaveBeenCalledWith(
                issues,
                { customLanguage: EnumMessageLanguage.en }
            );
        });

        it('mirrors the metadata onto the response headers', async () => {
            const exception = new RequestValidationException(issues);

            await filter.catch(exception, argumentsHost);

            expect(responseMetadataService.setHeaders).toHaveBeenCalledWith(
                response,
                metadata
            );
        });

        it('resolves to undefined', async () => {
            await expect(
                filter.catch(
                    new RequestValidationException(issues),
                    argumentsHost
                )
            ).resolves.toBeUndefined();
        });
    });
});
