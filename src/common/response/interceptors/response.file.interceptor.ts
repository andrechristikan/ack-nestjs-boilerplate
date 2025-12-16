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
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';

/**
 * Interceptor for handling file download responses
 *
 * This interceptor processes file responses (CSV and PDF) and sets appropriate
 * headers for file downloads. It transforms the response data into a StreamableFile
 * with proper content-type, content-disposition, and custom headers.
 *
 * @export
 * @class ResponseFileInterceptor
 * @implements {NestInterceptor}
 */
@Injectable()
export class ResponseFileInterceptor implements NestInterceptor {
    constructor(
        private readonly fileService: FileService,
        private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {}

    /**
     * Intercepts HTTP requests to handle file download responses
     *
     * Processes the response data, validates it, converts it to a buffer,
     * sets appropriate file headers, and returns a StreamableFile.
     *
     * @param {ExecutionContext} context - The execution context
     * @param {CallHandler} next - The call handler to proceed with the request
     * @returns {Observable<Promise<StreamableFile>>} Observable that resolves to a StreamableFile
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
                        (await res) as unknown as IResponseFileReturn;
                    this.validateDataResponse(responseData);

                    const fileBuffer: Buffer =
                        this.handleFileResponse(responseData);
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
     * Converts response data to a Buffer based on file extension
     *
     * For CSV files, converts string data to UTF-8 buffer.
     * For PDF files, returns the data as-is (already a Buffer).
     *
     * @private
     * @param {IResponseFileReturn} responseData - The response data containing file content
     * @returns {Buffer} The file content as a Buffer
     */
    private handleFileResponse(responseData: IResponseFileReturn): Buffer {
        if (responseData.extension === EnumFileExtensionDocument.csv) {
            return Buffer.from(responseData.data, 'utf-8');
        } else if (responseData.extension === EnumFileExtensionDocument.pdf) {
            return responseData.data;
        }

        return Buffer.from([]);
    }

    /**
     * Validates response data based on file extension type
     *
     * Delegates to specific validation methods based on the file extension.
     *
     * @private
     * @param {IResponseFileReturn} responseData - The response data to validate
     * @throws {Error} If validation fails
     */
    private validateDataResponse(responseData: IResponseFileReturn): void {
        if (responseData.extension === EnumFileExtensionDocument.csv) {
            this.validateCsvResponse(responseData);
        } else if (responseData.extension === EnumFileExtensionDocument.pdf) {
            this.validatePdfResponse(responseData);
        }
    }

    /**
     * Validates CSV file response data
     *
     * Ensures that response data exists and that the data field is a string.
     *
     * @private
     * @param {IResponseFileReturn} responseData - The response data to validate
     * @throws {Error} If response data is null/undefined or data field is not a string
     */
    private validateCsvResponse(responseData: IResponseFileReturn): void {
        if (!responseData) {
            throw new Error('Response data is null or undefined');
        }

        if (!responseData.data || typeof responseData.data !== 'string') {
            throw new Error('Field data must be a string');
        }
    }

    /**
     * Validates PDF file response data
     *
     * Ensures that response data exists and that the data field is a Buffer.
     *
     * @private
     * @param {IResponseFileReturn} responseData - The response data to validate
     * @throws {Error} If response data is null/undefined or data field is not a Buffer
     */
    private validatePdfResponse(responseData: IResponseFileReturn): void {
        if (!responseData) {
            throw new Error('Response data is null or undefined');
        }

        if (!responseData.data || !(responseData.data instanceof Buffer)) {
            throw new Error('Field data must be a Buffer');
        }
    }

    /**
     * Creates a timestamp for the current date
     *
     * @private
     * @returns {number} Unix timestamp in milliseconds
     */
    private createTimestamp(): number {
        const today = this.helperService.dateCreate();
        return this.helperService.dateGetTimestamp(today);
    }

    /**
     * Sets file-specific headers for the response
     *
     * Sets Content-Type, Content-Disposition, and Content-Length headers
     * for proper file download handling. If no filename is provided,
     * generates one using the timestamp.
     *
     * @private
     * @param {Response} response - The Express response object
     * @param {Buffer} file - The file buffer
     * @param {number} timestamp - Timestamp for default filename generation
     * @param {string} [filename] - Optional custom filename
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
     * Sets standard custom headers for the response
     *
     * Adds metadata headers including language, timestamp, timezone,
     * API version, repository version, request ID, and correlation ID.
     *
     * @private
     * @param {Response} response - The Express response object
     * @param {IRequestApp} request - The custom request object with additional properties
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
