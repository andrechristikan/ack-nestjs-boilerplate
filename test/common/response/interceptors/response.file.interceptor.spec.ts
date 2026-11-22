import type {
    CallHandler,
    ExecutionContext,
    StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { firstValueFrom, of } from 'rxjs';

import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { FileService } from '@common/file/services/file.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { ResponseFileInterceptor } from '@common/response/interceptors/response.file.interceptor';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import type { Response } from 'express';

describe('ResponseFileInterceptor', () => {
    const fileService: MockProxy<FileService> = mock<FileService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const responseMetadataService: MockProxy<ResponseMetadataService> =
        mock<ResponseMetadataService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const configGet = vi.mocked(configService.get);
    const response: MockProxy<Response> = mock<Response>();
    let context: MockProxy<ExecutionContext>;

    let interceptor: ResponseFileInterceptor;

    beforeEach(async () => {
        const httpContext =
            mock<ReturnType<ExecutionContext['switchToHttp']>>();
        httpContext.getResponse.mockReturnValue(response);
        context = mock<ExecutionContext>();
        context.getType.mockReturnValue('http');
        context.switchToHttp.mockReturnValue(httpContext);
        configGet.mockReturnValue('export-{timestamp}.{extension}');
        helperDateService.create.mockReturnValue(
            new Date('2026-09-09T12:00:00.000Z')
        );
        helperDateService.getTimestamp.mockReturnValue(123);
        helperStringService.fillPattern.mockReturnValue('export-123.csv');
        responseMetadataService.create.mockReturnValue({
            language: EnumMessageLanguage.en,
            timestamp: 123,
            timezone: 'UTC',
            version: '1',
            repoVersion: '9.0.0',
            requestId: 'request-id',
            correlationId: 'correlation-id',
        });

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ResponseFileInterceptor,
                { provide: FileService, useValue: fileService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: HelperStringService, useValue: helperStringService },
                {
                    provide: ResponseMetadataService,
                    useValue: responseMetadataService,
                },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        interceptor = moduleRef.get(ResponseFileInterceptor);
    });

    it('streams CSV data with a generated filename and file headers', async () => {
        fileService.extractMimeFromFilename.mockReturnValue('text/csv');
        const next = {
            handle: vi.fn(() =>
                of({
                    extension: EnumFileExtensionDocument.csv,
                    data: 'id,name\n1,Ada',
                })
            ),
        } satisfies CallHandler;

        const result = await firstValueFrom(
            interceptor.intercept(context, next)
        );

        await expect(readFile(result)).resolves.toEqual(
            Buffer.from('id,name\n1,Ada')
        );
        expect(result.options).toMatchObject({
            type: 'text/csv',
            disposition: expect.stringContaining('export-123.csv'),
            length: 13,
        });
        expect(responseMetadataService.setHeaders).toHaveBeenCalledWith(
            response,
            expect.objectContaining({ requestId: 'request-id' })
        );
    });

    it('streams a named PDF and falls back to the binary MIME type', async () => {
        fileService.extractMimeFromFilename.mockReturnValue(null);
        const data = Buffer.from('pdf');
        const next = {
            handle: vi.fn(() =>
                of({
                    extension: EnumFileExtensionDocument.pdf,
                    filename: 'report.pdf',
                    data,
                })
            ),
        } satisfies CallHandler;

        const result = await firstValueFrom(
            interceptor.intercept(context, next)
        );

        await expect(readFile(result)).resolves.toEqual(data);
        expect(result.options).toMatchObject({
            type: 'application/octet-stream',
            disposition: expect.stringContaining('report.pdf'),
            length: data.length,
        });
    });

    it.each([
        [EnumFileExtensionDocument.csv, Buffer.from('invalid')],
        [EnumFileExtensionDocument.pdf, 'invalid'],
    ])('rejects invalid %s response data', async (extension, data) => {
        const next = {
            handle: vi.fn(() => of({ extension, data })),
        } satisfies CallHandler;

        await expect(
            firstValueFrom(interceptor.intercept(context, next))
        ).rejects.toBeInstanceOf(Error);
        expect(response.setHeader).not.toHaveBeenCalled();
    });

    it('passes non-HTTP execution through unchanged', async () => {
        const payload = { data: 'queue-result' };
        const next = { handle: vi.fn(() => of(payload)) } satisfies CallHandler;
        const rpcContext = mock<ExecutionContext>();
        rpcContext.getType.mockReturnValue('rpc');

        await expect(
            firstValueFrom(interceptor.intercept(rpcContext, next))
        ).resolves.toBe(payload);
        expect(response.setHeader).not.toHaveBeenCalled();
    });

    async function readFile(file: StreamableFile): Promise<Buffer> {
        const chunks: Buffer[] = [];
        for await (const chunk of file.getStream()) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }
});
