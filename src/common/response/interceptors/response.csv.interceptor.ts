import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
import { HelperService } from '@common/helper/services/helper.service';
import { FileService } from '@common/file/services/file.service';
import { IResponseCsvReturn } from '@common/response/interfaces/response.interface';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ConfigService } from '@nestjs/config';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';

/**
 * Global file response interceptor that handles file download responses
 * across the entire application.
 *
 * This interceptor transforms file response data into streamable files
 * with proper headers for file downloads. It handles CSV file generation,
 * sets appropriate content headers, and adds request correlation headers
 * for tracking file download requests.
 *
 * @template T - The type of the file response data
 */
@Injectable()
export class ResponseCsvInterceptor<T> implements NestInterceptor {
    constructor(
        private readonly fileService: FileService,
        private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {}

    /**
     * Intercepts HTTP requests and transforms file responses into streamable files.
     *
     * This method only processes HTTP contexts, ignoring other types like WebSocket
     * or RPC contexts. It validates file response data, generates CSV files,
     * sets appropriate download headers, and returns a StreamableFile for download.
     *
     * @param {ExecutionContext} context - The execution context containing request/response information
     * @param {CallHandler} next - The next handler in the chain
     * @returns {Observable<Promise<StreamableFile>>} Observable that emits a Promise resolving to a StreamableFile for download
     * @throws {Error} When response data is not properly formatted for file generation
     */
    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<Promise<StreamableFile>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (res: Promise<Response>) => {
                    const ctx: HttpArgumentsHost = context.switchToHttp();
                    const response: Response = ctx.getResponse();
                    const request: IRequestApp = ctx.getRequest<IRequestApp>();

                    const responseData =
                        (await res) as unknown as IResponseCsvReturn<T>;
                    this.validateFileResponse(responseData);

                    const file: string = this.fileService.writeCsv<T>(
                        responseData.data
                    );
                    const fileBuffer: Buffer = Buffer.from(file, 'utf-8');
                    const timestamp = this.createTimestamp();

                    this.setFileHeaders(
                        response,
                        fileBuffer,
                        timestamp,
                        responseData.filename
                    );
                    this.setStandardHeaders(response, request);

                    return new StreamableFile(fileBuffer);
                })
            );
        }

        return next.handle();
    }

    /**
     * Validates the file response data structure.
     * Ensures the response data exists and contains a valid array in the data property.
     *
     * @param {IResponseCsvReturn<T>} responseData - The response data to validate
     * @throws {Error} When response data is null/undefined or data property is not an array
     */
    private validateFileResponse(responseData: IResponseCsvReturn<T>): void {
        if (!responseData) {
            throw new Error('Response data is null or undefined');
        }

        if (!responseData.data || !Array.isArray(responseData.data)) {
            throw new Error('Field data must in array');
        }
    }

    /**
     * Creates a timestamp for file naming.
     * Generates a Unix timestamp from the current date to ensure unique file names.
     *
     * @returns {number} Unix timestamp in milliseconds for unique file naming
     */
    private createTimestamp(): number {
        const today = this.helperService.dateCreate();
        return this.helperService.dateGetTimestamp(today);
    }

    /**
     * Sets file download headers on the HTTP response.
     * Configures Content-Type, Content-Disposition for download, and Content-Length headers.
     *
     * @param {Response} response - The HTTP response object to set headers on
     * @param {Buffer} file - The file buffer containing the CSV data
     * @param {number} timestamp - Unix timestamp for generating unique file name
     */
    private setFileHeaders(
        response: Response,
        file: Buffer,
        timestamp: number,
        filename?: string
    ): void {
        filename =
            filename ?? `export-${timestamp}.${EnumFileExtensionDocument.csv}`;
        const mime = this.fileService.extractMimeFromFilename(filename);
        response
            .setHeader('Content-Type', mime)
            .setHeader(
                'Content-Disposition',
                `attachment; filename=${filename}`
            )
            .setHeader('Content-Length', file.length);
    }

    /**
     * Sets standard headers for request correlation and client information.
     *
     * Adds standardized headers including language, timestamp, timezone,
     * version information, and request ID for client-side processing
     * and request correlation.
     *
     * @param {Response} response - The HTTP response object to set headers on
     * @param {IRequestApp} request - The HTTP request object containing client information
     */
    private setStandardHeaders(response: Response, request: IRequestApp): void {
        const today = this.helperService.dateCreate();
        const xLanguage: string =
            request.__language ??
            this.configService.get<EnumMessageLanguage>('message.language');
        const xTimestamp = this.helperService.dateGetTimestamp(today);
        const xTimezone = this.helperService.dateGetZone(today);
        const xVersion =
            request.__version ??
            this.configService.get<string>('app.urlVersion.version');
        const xRepoVersion = this.configService.get<string>('app.version');

        response.setHeader('x-custom-lang', xLanguage);
        response.setHeader('x-timestamp', xTimestamp);
        response.setHeader('x-timezone', xTimezone);
        response.setHeader('x-version', xVersion);
        response.setHeader('x-repo-version', xRepoVersion);
        response.setHeader('x-request-id', String(request.id));
        response.setHeader('x-correlation-id', String(request.correlationId));
    }
}
