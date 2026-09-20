import { createMock } from '@golevelup/ts-vitest';
import {
    HttpException,
    type CallHandler,
    type ExecutionContext,
} from '@nestjs/common';
import {
    busboyExceptions,
    multerExceptions,
} from '@nestjs/platform-express/multer/multer/multer.constants';
import { lastValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { FileExceedMaxFilesException } from '@common/file/exceptions/file.exceed-max-files.exception';
import { FileExceedMaxSizeUploadException } from '@common/file/exceptions/file.exceed-max-size-upload.exception';
import { FileFieldUnexpectedException } from '@common/file/exceptions/file.field-unexpected.exception';
import { FileMultipartInvalidException } from '@common/file/exceptions/file.multipart-invalid.exception';
import { FileUploadErrorInterceptor } from '@common/file/interceptors/file.upload-error.interceptor';

describe('FileUploadErrorInterceptor', () => {
    const interceptor = new FileUploadErrorInterceptor();
    const context = createMock<ExecutionContext>();

    it('passes successful values through unchanged', async () => {
        const next = createMock<CallHandler>({ handle: () => of('value') });
        await expect(
            lastValueFrom(interceptor.intercept(context, next))
        ).resolves.toBe('value');
    });

    it.each([
        [multerExceptions.LIMIT_FILE_SIZE, FileExceedMaxSizeUploadException],
        [multerExceptions.LIMIT_FILE_COUNT, FileExceedMaxFilesException],
        [multerExceptions.LIMIT_UNEXPECTED_FILE, FileFieldUnexpectedException],
        [multerExceptions.LIMIT_PART_COUNT, FileMultipartInvalidException],
        [multerExceptions.LIMIT_FIELD_KEY, FileMultipartInvalidException],
        [multerExceptions.LIMIT_FIELD_VALUE, FileMultipartInvalidException],
        [multerExceptions.LIMIT_FIELD_COUNT, FileMultipartInvalidException],
        [multerExceptions.LIMIT_FIELD_NESTING, FileMultipartInvalidException],
        [multerExceptions.MISSING_FIELD_NAME, FileMultipartInvalidException],
        [
            busboyExceptions.MULTIPART_BOUNDARY_NOT_FOUND,
            FileMultipartInvalidException,
        ],
        [
            busboyExceptions.MULTIPART_MALFORMED_PART_HEADER,
            FileMultipartInvalidException,
        ],
        [
            busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FORM,
            FileMultipartInvalidException,
        ],
        [
            busboyExceptions.MULTIPART_UNEXPECTED_END_OF_FILE,
            FileMultipartInvalidException,
        ],
    ])('maps framework message %s', async (message, ExceptionClass) => {
        const next = createMock<CallHandler>({
            handle: () => throwError(() => new HttpException(message, 400)),
        });
        await expect(
            lastValueFrom(interceptor.intercept(context, next))
        ).rejects.toBeInstanceOf(ExceptionClass);
    });

    it('maps a framework message carrying field detail', async () => {
        const next = createMock<CallHandler>({
            handle: () =>
                throwError(
                    () =>
                        new HttpException(
                            `${multerExceptions.LIMIT_FILE_SIZE} - avatar`,
                            400
                        )
                ),
        });
        await expect(
            lastValueFrom(interceptor.intercept(context, next))
        ).rejects.toBeInstanceOf(FileExceedMaxSizeUploadException);
    });

    it.each([new Error('ordinary'), new HttpException('unknown', 400)])(
        'preserves an unmapped error',
        async error => {
            const next = createMock<CallHandler>({
                handle: () => throwError(() => error),
            });
            await expect(
                lastValueFrom(interceptor.intercept(context, next))
            ).rejects.toBe(error);
        }
    );
});
