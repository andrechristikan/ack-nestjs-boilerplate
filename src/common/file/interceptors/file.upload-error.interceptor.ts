import { HttpException, Injectable } from '@nestjs/common';
import type {
    CallHandler,
    ExecutionContext,
    NestInterceptor,
} from '@nestjs/common';
import {
    busboyExceptions,
    multerExceptions,
} from '@nestjs/platform-express/multer/multer/multer.constants';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { FileExceedMaxFilesException } from '@common/file/exceptions/file.exceed-max-files.exception';
import { FileExceedMaxSizeUploadException } from '@common/file/exceptions/file.exceed-max-size-upload.exception';
import { FileFieldUnexpectedException } from '@common/file/exceptions/file.field-unexpected.exception';
import { FileMultipartInvalidException } from '@common/file/exceptions/file.multipart-invalid.exception';

/**
 * Maps the framework exceptions multer and busboy limit failures produce onto typed file exceptions.
 */
@Injectable()
export class FileUploadErrorInterceptor implements NestInterceptor {
    private readonly byFrameworkMessage: ReadonlyMap<
        string,
        () => AppBaseException
    > = new Map<string, () => AppBaseException>([
        [
            multerExceptions.LIMIT_FILE_SIZE,
            () => new FileExceedMaxSizeUploadException(),
        ],
        [
            multerExceptions.LIMIT_FILE_COUNT,
            () => new FileExceedMaxFilesException(),
        ],
        [
            multerExceptions.LIMIT_UNEXPECTED_FILE,
            () => new FileFieldUnexpectedException(),
        ],
        [
            multerExceptions.LIMIT_PART_COUNT,
            () => new FileMultipartInvalidException(),
        ],
        [
            multerExceptions.LIMIT_FIELD_KEY,
            () => new FileMultipartInvalidException(),
        ],
        [
            multerExceptions.LIMIT_FIELD_VALUE,
            () => new FileMultipartInvalidException(),
        ],
        [
            multerExceptions.LIMIT_FIELD_COUNT,
            () => new FileMultipartInvalidException(),
        ],
        [
            multerExceptions.LIMIT_FIELD_NESTING,
            () => new FileMultipartInvalidException(),
        ],
        [
            multerExceptions.MISSING_FIELD_NAME,
            () => new FileMultipartInvalidException(),
        ],
        [
            busboyExceptions.MULTIPART_BOUNDARY_NOT_FOUND,
            () => new FileMultipartInvalidException(),
        ],
        [
            busboyExceptions.MULTIPART_MALFORMED_PART_HEADER,
            () => new FileMultipartInvalidException(),
        ],
        [
            busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FORM,
            () => new FileMultipartInvalidException(),
        ],
        [
            busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FILE,
            () => new FileMultipartInvalidException(),
        ],
    ]);

    private extractBaseMessage(message: string): string {
        return message.split(' - ')[0];
    }

    private mapError(err: unknown): unknown {
        if (!(err instanceof HttpException)) {
            return err;
        }

        const baseMessage = this.extractBaseMessage(err.message);
        const factory = this.byFrameworkMessage.get(baseMessage);

        return factory ? factory() : err;
    }

    intercept(
        _context: ExecutionContext,
        next: CallHandler
    ): Observable<unknown> {
        return next
            .handle()
            .pipe(catchError(err => throwError(() => this.mapError(err))));
    }
}
