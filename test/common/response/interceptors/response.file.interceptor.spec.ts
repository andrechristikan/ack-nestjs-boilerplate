import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { StreamableFile } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { FileService } from '@common/file/services/file.service';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { FileExceedMaxSizeExportException } from '@common/file/exceptions/file.exceed-max-size-export.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { ResponseFileInterceptor } from '@common/response/interceptors/response.file.interceptor';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import { ResponseFileDataInvalidException } from '@common/response/exceptions/response.file-data-invalid.exception';
import { EnumResponseStatusCodeError } from '@common/response/enums/response.status-code.enum';
import type {
    IResponseFileReturn,
    IResponseCsvReturn,
    IResponsePdfReturn,
} from '@common/response/interfaces/response.interface';

describe('ResponseFileInterceptor', () => {
    const fileService: MockProxy<FileService> = mock<FileService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const responseMetadataService: MockProxy<ResponseMetadataService> =
        mock<ResponseMetadataService>();
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    const httpArgumentsHost: MockProxy<
        ReturnType<ExecutionContext['switchToHttp']>
    > = mock<ReturnType<ExecutionContext['switchToHttp']>>();
    const response: MockProxy<Response> = mock<Response>();
    const callHandler: MockProxy<CallHandler> = mock<CallHandler>();

    const configValues: Record<string, unknown> = {
        'response.filenameExportPattern': 'export-{timestamp}.{extension}',
        'file.maxSizeExportInBytes': 1000,
    };

    const today = new Date('2026-01-01T00:00:00.000Z');
    let interceptor: ResponseFileInterceptor;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => configValues[key]);
        context.getType.mockReturnValue('http');
        context.switchToHttp.mockReturnValue(httpArgumentsHost);
        httpArgumentsHost.getResponse.mockReturnValue(response);
        helperDateService.create.mockReturnValue(today);
        helperDateService.getTimestamp.mockReturnValue(today.getTime());
        helperStringService.fillPattern.mockReturnValue(
            `export-${today.getTime()}.csv`
        );
        fileService.sanitizeFilename.mockImplementation(
            (filename: string) => filename
        );
        fileService.extractMimeFromFilename.mockReturnValue('text/csv');

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResponseFileInterceptor,
                { provide: FileService, useValue: fileService },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                {
                    provide: ResponseMetadataService,
                    useValue: responseMetadataService,
                },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        interceptor = module.get(ResponseFileInterceptor);
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

        it('streams a CSV payload with a generated filename and extracted mime type', async () => {
            const responseData: IResponseCsvReturn = {
                data: 'a,b,c',
                extension: EnumFileExtensionDocument.csv,
            };
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData as unknown as Response))
            );

            const result = await firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            expect(result).toBeInstanceOf(StreamableFile);
            expect(result.getStream().read()).toEqual(Buffer.from('a,b,c'));
            expect(fileService.extractMimeFromFilename).toHaveBeenCalledWith(
                `export-${today.getTime()}.csv`
            );
            expect(responseMetadataService.setHeaders).toHaveBeenCalled();
        });

        it('streams a PDF payload as-is', async () => {
            const responseData: IResponsePdfReturn = {
                data: Buffer.from('%PDF-1.4'),
                extension: EnumFileExtensionDocument.pdf,
            };
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData as unknown as Response))
            );

            const result = await firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            expect(result.getStream().read()).toEqual(Buffer.from('%PDF-1.4'));
        });

        it('uses the given filename over the generated default', async () => {
            const responseData: IResponseCsvReturn = {
                data: 'a,b,c',
                extension: EnumFileExtensionDocument.csv,
                filename: 'custom.csv',
            };
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData as unknown as Response))
            );

            await firstValueFrom(interceptor.intercept(context, callHandler));

            expect(fileService.extractMimeFromFilename).toHaveBeenCalledWith(
                'custom.csv'
            );
            expect(fileService.sanitizeFilename).toHaveBeenCalledWith(
                'custom.csv'
            );
        });

        it('falls back to application/octet-stream when no mime type can be extracted', async () => {
            fileService.extractMimeFromFilename.mockReturnValue(null);
            const responseData: IResponseCsvReturn = {
                data: 'a,b,c',
                extension: EnumFileExtensionDocument.csv,
            };
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData as unknown as Response))
            );

            const result = await firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            expect(result.options.type).toBe('application/octet-stream');
        });

        it('falls back to the timestamped filename as the ascii disposition segment when sanitization strips it', async () => {
            fileService.sanitizeFilename.mockReturnValue('');
            const responseData: IResponseCsvReturn = {
                data: 'a,b,c',
                extension: EnumFileExtensionDocument.csv,
            };
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData as unknown as Response))
            );

            const result = await firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            expect(result.options.disposition).toContain(
                `filename="export-${today.getTime()}.csv"`
            );
        });

        it('rejects with FileExceedMaxSizeExportException when the buffer exceeds the configured limit', async () => {
            const responseData: IResponseCsvReturn = {
                data: 'x'.repeat(1001),
                extension: EnumFileExtensionDocument.csv,
            };
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData as unknown as Response))
            );

            const promise = firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            await expect(promise).rejects.toBeInstanceOf(
                FileExceedMaxSizeExportException
            );
            await expect(promise).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.exceedMaxSizeExport,
                statusCodeKey:
                    EnumFileStatusCodeError[
                        EnumFileStatusCodeError.exceedMaxSizeExport
                    ],
                messagePath: 'file.error.exceedMaxSizeExport',
            });
        });

        it('rejects when a CSV payload carries no string data', async () => {
            const responseData = {
                data: undefined,
                extension: EnumFileExtensionDocument.csv,
            } as unknown as IResponseFileReturn;
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData as unknown as Response))
            );

            const promise = firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            await expect(promise).rejects.toBeInstanceOf(
                ResponseFileDataInvalidException
            );
            await expect(promise).rejects.toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.fileDataInvalid,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.fileDataInvalid
                    ],
                messagePath: 'response.error.fileDataInvalid',
            });
        });

        it('rejects when a PDF payload carries no Buffer data', async () => {
            const responseData = {
                data: 'not-a-buffer',
                extension: EnumFileExtensionDocument.pdf,
            } as unknown as IResponseFileReturn;
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData as unknown as Response))
            );

            const promise = firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            await expect(promise).rejects.toBeInstanceOf(
                ResponseFileDataInvalidException
            );
            await expect(promise).rejects.toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.fileDataInvalid,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.fileDataInvalid
                    ],
                messagePath: 'response.error.fileDataInvalid',
            });
        });

        it('streams an empty buffer and skips validation for an extension outside csv/pdf', async () => {
            const responseData = {
                data: 'irrelevant',
                extension: 'txt',
            } as unknown as IResponseFileReturn;
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData as unknown as Response))
            );

            const result = await firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            expect(result.getStream().read()).toBeNull();
        });
    });

    describe('private: validateCsvResponse', () => {
        it('throws when the data field is not a string', () => {
            const responseData = {
                data: undefined,
                extension: EnumFileExtensionDocument.csv,
            } as unknown as IResponseFileReturn;

            let thrown: unknown;
            try {
                interceptor['validateCsvResponse'](responseData);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(ResponseFileDataInvalidException);
            expect(thrown).toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.fileDataInvalid,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.fileDataInvalid
                    ],
                messagePath: 'response.error.fileDataInvalid',
            });
        });
    });

    describe('private: validatePdfResponse', () => {
        it('throws when the data field is not a Buffer', () => {
            const responseData = {
                data: 'not-a-buffer',
                extension: EnumFileExtensionDocument.pdf,
            } as unknown as IResponseFileReturn;

            let thrown: unknown;
            try {
                interceptor['validatePdfResponse'](responseData);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(ResponseFileDataInvalidException);
            expect(thrown).toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.fileDataInvalid,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.fileDataInvalid
                    ],
                messagePath: 'response.error.fileDataInvalid',
            });
        });
    });

    describe('private: handleFileResponse', () => {
        it('encodes a csv payload as a utf-8 buffer', () => {
            const responseData: IResponseCsvReturn = {
                data: 'a,b,c',
                extension: EnumFileExtensionDocument.csv,
            };

            expect(interceptor['handleFileResponse'](responseData)).toEqual(
                Buffer.from('a,b,c', 'utf-8')
            );
        });

        it('returns a pdf payload unchanged', () => {
            const responseData: IResponsePdfReturn = {
                data: Buffer.from('%PDF-1.4'),
                extension: EnumFileExtensionDocument.pdf,
            };

            expect(interceptor['handleFileResponse'](responseData)).toEqual(
                Buffer.from('%PDF-1.4')
            );
        });

        it('returns an empty buffer for an extension outside csv/pdf', () => {
            const responseData = {
                data: 'irrelevant',
                extension: 'txt',
            } as unknown as IResponseFileReturn;

            expect(interceptor['handleFileResponse'](responseData)).toEqual(
                Buffer.from([])
            );
        });
    });

    describe('private: validateDataResponse', () => {
        it('throws when the response data is null or undefined', () => {
            let thrown: unknown;
            try {
                interceptor['validateDataResponse'](null);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(ResponseFileDataInvalidException);
            expect(thrown).toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.fileDataInvalid,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.fileDataInvalid
                    ],
                messagePath: 'response.error.fileDataInvalid',
            });
        });

        it('validates a csv payload and throws for non-string data', () => {
            const responseData = {
                data: undefined,
                extension: EnumFileExtensionDocument.csv,
            } as unknown as IResponseFileReturn;

            let thrown: unknown;
            try {
                interceptor['validateDataResponse'](responseData);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(ResponseFileDataInvalidException);
            expect(thrown).toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.fileDataInvalid,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.fileDataInvalid
                    ],
                messagePath: 'response.error.fileDataInvalid',
            });
        });

        it('validates a pdf payload and throws for non-Buffer data', () => {
            const responseData = {
                data: 'not-a-buffer',
                extension: EnumFileExtensionDocument.pdf,
            } as unknown as IResponseFileReturn;

            let thrown: unknown;
            try {
                interceptor['validateDataResponse'](responseData);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(ResponseFileDataInvalidException);
            expect(thrown).toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.fileDataInvalid,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.fileDataInvalid
                    ],
                messagePath: 'response.error.fileDataInvalid',
            });
        });

        it('skips validation for an extension outside csv/pdf', () => {
            const responseData = {
                data: undefined,
                extension: 'txt',
            } as unknown as IResponseFileReturn;

            expect(() =>
                interceptor['validateDataResponse'](responseData)
            ).not.toThrow();
        });
    });

    describe('private: createTimestamp', () => {
        it('creates the current date and converts it to a timestamp', () => {
            expect(interceptor['createTimestamp']()).toBe(today.getTime());
            expect(helperDateService.create).toHaveBeenCalled();
            expect(helperDateService.getTimestamp).toHaveBeenCalledWith(today);
        });
    });

    describe('private: createDefaultFilename', () => {
        it('fills the configured pattern with the timestamp and the csv extension', () => {
            const filename = interceptor['createDefaultFilename'](
                today.getTime()
            );

            expect(filename).toBe(`export-${today.getTime()}.csv`);
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'export-{timestamp}.{extension}',
                {
                    timestamp: String(today.getTime()),
                    extension: EnumFileExtensionDocument.csv,
                }
            );
        });
    });

    describe('private: createDisposition', () => {
        it('builds the disposition header from the sanitized filename', () => {
            fileService.sanitizeFilename.mockReturnValue('custom.csv');

            const disposition = interceptor['createDisposition'](
                'custom.csv',
                'fallback.csv'
            );

            expect(disposition).toBe(
                `attachment; filename="custom.csv"; filename*=UTF-8''custom.csv`
            );
        });

        it('falls back to the given fallback when sanitization strips the filename', () => {
            fileService.sanitizeFilename.mockReturnValue('');

            const disposition = interceptor['createDisposition'](
                'custom.csv',
                'fallback.csv'
            );

            expect(disposition).toBe(
                `attachment; filename="fallback.csv"; filename*=UTF-8''custom.csv`
            );
        });
    });
});
