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
import { IResponseFileReturn } from '@common/response/interfaces/response.interface';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ConfigService } from '@nestjs/config';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumFileExtensionExcel } from '@common/file/enums/file.enum';

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
export class ResponseFileInterceptor<T> implements NestInterceptor {
    constructor(
        private readonly fileService: FileService,
        private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {}

    /**
     * Intercepts HTTP requests and transforms file responses into streamable files.
     *
     * This method only processes HTTP contexts, ignoring other types like WebSocket
     * or RPC contexts. It validates file response data, generates either CSV or Excel files,
     * sets appropriate download headers, and returns a StreamableFile for download.
     *
     * @param context - The execution context containing request/response information
     * @param next - The next handler in the chain
     * @returns Observable of the StreamableFile promise for file download
     * @throws Error when response data is not properly formatted for file generation
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
                        (await res) as unknown as IResponseFileReturn<T>;
                    this.validateFileResponse(responseData);

                    const file: Buffer =
                        responseData.extension === EnumFileExtensionExcel.csv
                            ? this.fileService.writeCsv(responseData.data[0])
                            : this.fileService.writeExcel(responseData.data);
                    const timestamp = this.createTimestamp();

                    this.setFileHeaders(
                        response,
                        responseData.extension,
                        file,
                        timestamp
                    );
                    this.setStandardHeaders(response, request);

                    return new StreamableFile(file);
                })
            );
        }

        return next.handle();
    }

    /**
     * Validates the file response data structure.
     *
     * @param responseData - The response data to validate
     * @throws Error when response data is not properly formatted for file generation
     */
    private validateFileResponse(responseData: IResponseFileReturn<T>): void {
        if (!responseData) {
            throw new Error(
                'ResponseFileExcel must instanceof IResponseFileExcel'
            );
        }

        if (!responseData.data || !Array.isArray(responseData.data)) {
            throw new Error('Field data must in array');
        }
    }

    /**
     * Creates a timestamp for file naming.
     *
     * @returns Timestamp number for unique file naming
     */
    private createTimestamp(): number {
        const today = this.helperService.dateCreate();
        return this.helperService.dateGetTimestamp(today);
    }

    /**
     * Sets file download headers on the HTTP response.
     *
     * @param response - The HTTP response object
     * @param file - The file buffer
     * @param timestamp - Timestamp for file naming
     */
    private setFileHeaders(
        response: Response,
        extension: EnumFileExtensionExcel,
        file: Buffer,
        timestamp: number
    ): void {
        const filename = `export-${timestamp}.${extension}`;
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
     * @param response - The HTTP response object
     * @param request - The HTTP request object
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
