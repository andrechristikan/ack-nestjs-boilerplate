import { StreamableFile } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { FileService } from '@common/file/services/file.service';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import { EnumResponseStatusCodeError } from '@common/response/enums/response.status-code.enum';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';
import { createResponseFileInterceptor } from '@test/unit/helpers/test.unit.response.helper';
import type {
    IResponseFileInterceptorDoubles,
    IResponseFileInterceptorUnderTest,
} from '@test/unit/helpers/test.unit.response.helper';
import type {
    IResponseFileReturn,
    IResponseCsvReturn,
    IResponsePdfReturn,
} from '@common/response/interfaces/response.interface';

describe('ResponseFileInterceptor', () => {
    const fileService: MockProxy<FileService> = mock<FileService>();
    const responseMetadataService: MockProxy<ResponseMetadataService> =
        mock<ResponseMetadataService>();
    let configService: MockProxy<ConfigService>;
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    const httpArgumentsHost: MockProxy<
        ReturnType<ExecutionContext['switchToHttp']>
    > = mock<ReturnType<ExecutionContext['switchToHttp']>>();
    const response: MockProxy<Response> = mock<Response>();
    const callHandler: MockProxy<CallHandler> = mock<CallHandler>();

    let doubles: IResponseFileInterceptorDoubles;

    const today = new Date('2026-01-01T00:00:00.000Z');
    let interceptor: IResponseFileInterceptorUnderTest;

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        vi.setSystemTime(today);

        configService = buildConfigService({
            ...TestUnitKitConfigValues,
            'response.filenameExportPattern': 'export-{timestamp}.{extension}',
            'file.maxSizeExportInBytes': 1000,
            'file.maxDataExport': 2,
            'user.maxDataExport': 1,
        });
        doubles = { fileService, responseMetadataService, configService };
        context.getType.mockReturnValue('http');
        context.switchToHttp.mockReturnValue(httpArgumentsHost);
        httpArgumentsHost.getResponse.mockReturnValue(response);
        fileService.sanitizeFilename.mockImplementation(
            (filename: string) => filename
        );
        fileService.extractMimeFromFilename.mockReturnValue('text/csv');
        fileService.readCsv.mockReturnValue([]);

        interceptor = await createResponseFileInterceptor(null, doubles);
    });

    describe('constructor', () => {
        it('reads the row cap from the default config key with no options', () => {
            expect(configService.get).toHaveBeenCalledWith(
                'file.maxDataExport'
            );
            expect(configService.get).not.toHaveBeenCalledWith(
                'user.maxDataExport'
            );
        });

        it('reads the row cap from the given config key', async () => {
            vi.mocked(configService.get).mockClear();

            await createResponseFileInterceptor(
                { maxDataExportConfigKey: 'user.maxDataExport' },
                doubles
            );

            expect(configService.get).toHaveBeenCalledWith(
                'user.maxDataExport'
            );
            expect(configService.get).not.toHaveBeenCalledWith(
                'file.maxDataExport'
            );
        });
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
                of(Promise.resolve(responseData))
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

        it('states the utf-8 charset on a text/csv type', async () => {
            const responseData: IResponseCsvReturn = {
                data: 'a,b,c',
                extension: EnumFileExtensionDocument.csv,
            };
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData))
            );

            const result = await firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            expect(result.options.type).toBe('text/csv; charset=utf-8');
        });

        it('keeps application/pdf without a charset', async () => {
            fileService.extractMimeFromFilename.mockReturnValue(
                'application/pdf'
            );
            const responseData: IResponsePdfReturn = {
                data: Buffer.from('%PDF-1.4'),
                extension: EnumFileExtensionDocument.pdf,
            };
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData))
            );

            const result = await firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            expect(result.options.type).toBe('application/pdf');
        });

        it('streams a PDF payload as-is', async () => {
            const responseData: IResponsePdfReturn = {
                data: Buffer.from('%PDF-1.4'),
                extension: EnumFileExtensionDocument.pdf,
            };
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData))
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
                of(Promise.resolve(responseData))
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
                of(Promise.resolve(responseData))
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
                of(Promise.resolve(responseData))
            );

            const result = await firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            expect(result.options.disposition).toContain(
                `filename="export-${today.getTime()}.csv"`
            );
        });

        it('rejects with FileExceedMaxDataExportException when the csv rows exceed the default cap', async () => {
            fileService.readCsv.mockReturnValue([{}, {}, {}]);
            const responseData: IResponseCsvReturn = {
                data: 'h\n1\n2\n3',
                extension: EnumFileExtensionDocument.csv,
            };
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData))
            );

            const promise = firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            await expect(promise).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.exceedMaxDataExport,
            });
            expect(fileService.readCsv).toHaveBeenCalledWith(responseData.data);
            expect(responseMetadataService.setHeaders).not.toHaveBeenCalled();
        });

        it('streams a csv payload whose rows equal the cap', async () => {
            fileService.readCsv.mockReturnValue([{}, {}]);
            const responseData: IResponseCsvReturn = {
                data: 'h\n1\n2',
                extension: EnumFileExtensionDocument.csv,
            };
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData))
            );

            const result = await firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            expect(result).toBeInstanceOf(StreamableFile);
        });

        it('caps the csv rows at the overridden config key', async () => {
            const capped = await createResponseFileInterceptor(
                { maxDataExportConfigKey: 'user.maxDataExport' },
                doubles
            );
            fileService.readCsv.mockReturnValue([{}, {}]);
            const responseData: IResponseCsvReturn = {
                data: 'h\n1\n2',
                extension: EnumFileExtensionDocument.csv,
            };
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData))
            );

            const promise = firstValueFrom(
                capped.intercept(context, callHandler)
            );

            await expect(promise).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.exceedMaxDataExport,
            });
        });

        it('does not count rows of a pdf payload', async () => {
            const responseData: IResponsePdfReturn = {
                data: Buffer.from('%PDF-1.4'),
                extension: EnumFileExtensionDocument.pdf,
            };
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData))
            );

            await firstValueFrom(interceptor.intercept(context, callHandler));

            expect(fileService.readCsv).not.toHaveBeenCalled();
        });

        it('rejects with FileExceedMaxSizeExportException when the buffer exceeds the configured limit', async () => {
            const responseData: IResponseCsvReturn = {
                data: 'x'.repeat(1001),
                extension: EnumFileExtensionDocument.csv,
            };
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData))
            );

            const promise = firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            await expect(promise).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.exceedMaxSizeExport,
            });
        });

        it('rejects when a CSV payload carries no string data', async () => {
            const responseData = {
                data: undefined,
                extension: EnumFileExtensionDocument.csv,
            } as unknown as IResponseFileReturn;
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData))
            );

            const promise = firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            await expect(promise).rejects.toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.fileDataInvalid,
            });
        });

        it('rejects when a PDF payload carries no Buffer data', async () => {
            const responseData = {
                data: 'not-a-buffer',
                extension: EnumFileExtensionDocument.pdf,
            } as unknown as IResponseFileReturn;
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData))
            );

            const promise = firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            await expect(promise).rejects.toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.fileDataInvalid,
            });
        });

        it('streams an empty buffer and skips validation for an extension outside csv/pdf', async () => {
            const responseData = {
                data: 'irrelevant',
                extension: 'txt',
            } as unknown as IResponseFileReturn;
            callHandler.handle.mockReturnValue(
                of(Promise.resolve(responseData))
            );

            const result = await firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            expect(result.getStream().read()).toBeNull();
        });
    });

    describe('validateCsvResponse', () => {
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

            expect(thrown).toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.fileDataInvalid,
            });
        });
    });

    describe('validatePdfResponse', () => {
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

            expect(thrown).toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.fileDataInvalid,
            });
        });
    });

    describe('handleFileResponse', () => {
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

    describe('validateDataResponse', () => {
        it('throws when the response data is null or undefined', () => {
            let thrown: unknown;
            try {
                interceptor['validateDataResponse'](null);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.fileDataInvalid,
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

            expect(thrown).toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.fileDataInvalid,
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

            expect(thrown).toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.fileDataInvalid,
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

    describe('countDataRows', () => {
        it('returns the parsed row count for a csv payload', () => {
            fileService.readCsv.mockReturnValue([{}, {}]);

            const rows = interceptor['countDataRows']({
                data: 'h\n1\n2',
                extension: EnumFileExtensionDocument.csv,
            });

            expect(rows).toBe(2);
        });

        it('returns zero for a pdf payload', () => {
            const rows = interceptor['countDataRows']({
                data: Buffer.from('%PDF-1.4'),
                extension: EnumFileExtensionDocument.pdf,
            });

            expect(rows).toBe(0);
        });
    });

    describe('createTimestamp', () => {
        it('returns the current timestamp', () => {
            expect(interceptor['createTimestamp']()).toBe(today.getTime());
        });
    });

    describe('createDefaultFilename', () => {
        it('fills the configured pattern with the current timestamp and the csv extension', () => {
            const filename = interceptor['createDefaultFilename'](
                EnumFileExtensionDocument.csv
            );

            expect(filename).toBe(`export-${today.getTime()}.csv`);
        });

        it('fills the extension of the given document type', () => {
            const filename = interceptor['createDefaultFilename'](
                EnumFileExtensionDocument.pdf
            );

            expect(filename).toBe(`export-${today.getTime()}.pdf`);
        });
    });

    describe('createDisposition', () => {
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
