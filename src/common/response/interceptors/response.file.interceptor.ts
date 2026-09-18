import { Injectable, StreamableFile } from '@nestjs/common';
import type {
    CallHandler,
    ExecutionContext,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { FileService } from '@common/file/services/file.service';
import type { IResponseFileReturn } from '@common/response/interfaces/response.interface';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { FileExceedMaxSizeExportException } from '@common/file/exceptions/file.exceed-max-size-export.exception';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';

/**
 * Streams CSV/PDF return values as a `StreamableFile`, setting download and standard headers.
 */
@Injectable()
export class ResponseFileInterceptor implements NestInterceptor {
    private readonly filenameExportPattern: string;
    private readonly maxSizeExportInBytes: number;

    constructor(
        private readonly fileService: FileService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly responseMetadataService: ResponseMetadataService,
        private readonly configService: ConfigService
    ) {
        this.filenameExportPattern = this.configService.get<string>(
            'response.filenameExportPattern'
        )!;
        this.maxSizeExportInBytes = this.configService.get<number>(
            'file.maxSizeExportInBytes'
        )!;
    }

    private handleFileResponse(responseData: IResponseFileReturn): Buffer {
        if (responseData.extension === EnumFileExtensionDocument.csv) {
            return Buffer.from(responseData.data, 'utf-8');
        } else if (responseData.extension === EnumFileExtensionDocument.pdf) {
            return responseData.data;
        }

        return Buffer.from([]);
    }

    private validateDataResponse(responseData: IResponseFileReturn): void {
        if (responseData.extension === EnumFileExtensionDocument.csv) {
            this.validateCsvResponse(responseData);
        } else if (responseData.extension === EnumFileExtensionDocument.pdf) {
            this.validatePdfResponse(responseData);
        }
    }

    private validateCsvResponse(responseData: IResponseFileReturn): void {
        if (!responseData) {
            throw new Error('Response data is null or undefined');
        }

        if (!responseData.data || typeof responseData.data !== 'string') {
            throw new Error('Field data must be a string');
        }
    }

    private validatePdfResponse(responseData: IResponseFileReturn): void {
        if (!responseData) {
            throw new Error('Response data is null or undefined');
        }

        if (!responseData.data || !(responseData.data instanceof Buffer)) {
            throw new Error('Field data must be a Buffer');
        }
    }

    private createTimestamp(): number {
        const today = this.helperDateService.create();
        return this.helperDateService.getTimestamp(today);
    }

    private createDefaultFilename(timestamp: number): string {
        return this.helperStringService.fillPattern(
            this.filenameExportPattern,
            {
                timestamp: String(timestamp),
                extension: EnumFileExtensionDocument.csv,
            }
        );
    }

    private createDisposition(filename: string, fallback: string): string {
        const sanitizedFilename = this.fileService.sanitizeFilename(filename);
        const ascii = sanitizedFilename || fallback;

        return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
    }

    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<Promise<StreamableFile>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (res: Promise<Response>) => {
                    const ctx = context.switchToHttp();
                    const response: Response = ctx.getResponse();

                    const responseData =
                        (await res) as unknown as IResponseFileReturn;
                    this.validateDataResponse(responseData);

                    const fileBuffer: Buffer =
                        this.handleFileResponse(responseData);

                    if (fileBuffer.length > this.maxSizeExportInBytes) {
                        throw new FileExceedMaxSizeExportException();
                    }

                    const timestamp = this.createTimestamp();
                    const defaultFilename =
                        this.createDefaultFilename(timestamp);
                    const filename = responseData.filename ?? defaultFilename;
                    const mimeFromFilename =
                        this.fileService.extractMimeFromFilename(filename);
                    const mime = mimeFromFilename ?? 'application/octet-stream';

                    const metadata = this.responseMetadataService.create();
                    this.responseMetadataService.setHeaders(response, metadata);

                    const disposition = this.createDisposition(
                        filename,
                        defaultFilename
                    );

                    return new StreamableFile(fileBuffer, {
                        type: mime,
                        disposition,
                        length: fileBuffer.length,
                    });
                })
            );
        }

        return next.handle();
    }
}
