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
 * Streams CSV/PDF return values as a `StreamableFile`, setting download and standard headers.
 */
@Injectable()
export class ResponseFileInterceptor implements NestInterceptor {
    constructor(
        private readonly fileService: FileService,
        private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {}

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
        const today = this.helperService.dateCreate();
        return this.helperService.dateGetTimestamp(today);
    }

    /**
     * Sets Content-Type/Disposition/Length; defaults the filename to `export-<ts>.csv`.
     */
    private setFileHeaders(
        response: Response,
        file: Buffer,
        timestamp: number,
        filename?: string
    ): void {
        filename =
            filename ?? `export-${timestamp}.${EnumFileExtensionDocument.csv}`;
        const mime =
            this.fileService.extractMimeFromFilename(filename) ??
            'application/octet-stream';
        response
            .setHeader('Content-Type', mime)
            .setHeader(
                'Content-Disposition',
                `attachment; filename=${filename}`
            )
            .setHeader('Content-Length', file.length);
    }

    private setStandardHeaders(response: Response, request: IRequestApp): void {
        const today = this.helperService.dateCreate();
        const xLanguage: string =
            request.language ??
            this.configService.get<EnumMessageLanguage>('message.language')!;
        const xTimestamp = this.helperService.dateGetTimestamp(today);
        const xTimezone = this.helperService.dateGetZone(today);
        const xVersion =
            request.version ??
            this.configService.get<string>('app.urlVersion.version')!;
        const xRepoVersion = this.configService.get<string>('app.version')!;

        response.setHeader('x-custom-lang', xLanguage);
        response.setHeader('x-timestamp', xTimestamp);
        response.setHeader('x-timezone', xTimezone);
        response.setHeader('x-version', xVersion);
        response.setHeader('x-repo-version', xRepoVersion);
        response.setHeader('x-request-id', String(request.id));
        response.setHeader('x-correlation-id', String(request.correlationId));
    }
}
