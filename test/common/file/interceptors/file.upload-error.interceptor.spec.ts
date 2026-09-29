import { HttpException, HttpStatus } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import {
    busboyExceptions,
    multerExceptions,
} from '@nestjs/platform-express/multer/multer/multer.constants';
import { FileUploadErrorInterceptor } from '@common/file/interceptors/file.upload-error.interceptor';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { FileExceedMaxFilesException } from '@common/file/exceptions/file.exceed-max-files.exception';
import { FileExceedMaxSizeUploadException } from '@common/file/exceptions/file.exceed-max-size-upload.exception';
import { FileFieldUnexpectedException } from '@common/file/exceptions/file.field-unexpected.exception';
import { FileMultipartInvalidException } from '@common/file/exceptions/file.multipart-invalid.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';

describe('FileUploadErrorInterceptor', () => {
    let interceptor: FileUploadErrorInterceptor;

    const context = {} as ExecutionContext;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [FileUploadErrorInterceptor],
        }).compile();
        interceptor = module.get(FileUploadErrorInterceptor);
    });

    describe('intercept', () => {
        it('passes through a value the handler emits with no error', async () => {
            const callHandler = mock<CallHandler>({
                handle: () => of('ok'),
            });

            const result = await firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            expect(result).toBe('ok');
        });

        it('forwards an error that is not an HttpException unchanged', async () => {
            const err = new Error('boom');
            const callHandler = mock<CallHandler>({
                handle: () => throwError(() => err),
            });

            await expect(
                firstValueFrom(interceptor.intercept(context, callHandler))
            ).rejects.toBe(err);
        });

        it('forwards an HttpException whose message matches no known limit unchanged', async () => {
            const err = new HttpException(
                'Something else entirely',
                HttpStatus.BAD_REQUEST
            );
            const callHandler = mock<CallHandler>({
                handle: () => throwError(() => err),
            });

            await expect(
                firstValueFrom(interceptor.intercept(context, callHandler))
            ).rejects.toBe(err);
        });

        it.each([
            [
                multerExceptions.LIMIT_FILE_SIZE,
                FileExceedMaxSizeUploadException,
            ],
            [multerExceptions.LIMIT_FILE_COUNT, FileExceedMaxFilesException],
            [
                multerExceptions.LIMIT_UNEXPECTED_FILE,
                FileFieldUnexpectedException,
            ],
            [multerExceptions.LIMIT_PART_COUNT, FileMultipartInvalidException],
            [multerExceptions.LIMIT_FIELD_KEY, FileMultipartInvalidException],
            [multerExceptions.LIMIT_FIELD_VALUE, FileMultipartInvalidException],
            [multerExceptions.LIMIT_FIELD_COUNT, FileMultipartInvalidException],
            [
                multerExceptions.LIMIT_FIELD_NESTING,
                FileMultipartInvalidException,
            ],
            [
                multerExceptions.MISSING_FIELD_NAME,
                FileMultipartInvalidException,
            ],
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
        ])(
            'maps the HttpException "%s" onto %s',
            async (message, expectedException) => {
                const err = new HttpException(message, HttpStatus.BAD_REQUEST);
                const callHandler = mock<CallHandler>({
                    handle: () => throwError(() => err),
                });
                const expected: AppBaseException = new expectedException();

                const promise = firstValueFrom(
                    interceptor.intercept(context, callHandler)
                );

                await expect(promise).rejects.toBeInstanceOf(expectedException);
                await expect(promise).rejects.toMatchObject({
                    module: expected.module,
                    statusCode: expected.statusCode,
                    statusCodeKey: expected.statusCodeKey,
                    messagePath: expected.messagePath,
                });
            }
        );

        it('matches only the segment before the first " - " in the message', async () => {
            const err = new HttpException(
                `${multerExceptions.LIMIT_FILE_SIZE} - field "file"`,
                HttpStatus.BAD_REQUEST
            );
            const callHandler = mock<CallHandler>({
                handle: () => throwError(() => err),
            });

            const promise = firstValueFrom(
                interceptor.intercept(context, callHandler)
            );

            await expect(promise).rejects.toBeInstanceOf(
                FileExceedMaxSizeUploadException
            );
            await expect(promise).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.exceedMaxSizeUpload,
                statusCodeKey:
                    EnumFileStatusCodeError[
                        EnumFileStatusCodeError.exceedMaxSizeUpload
                    ],
                messagePath: 'file.error.exceedMaxSizeUpload',
            });
        });
    });

    describe('extractBaseMessage', () => {
        it('returns the message unchanged when it carries no " - " separator', () => {
            const mixin = interceptor as unknown as {
                extractBaseMessage(message: string): string;
            };

            expect(mixin['extractBaseMessage']('plain message')).toBe(
                'plain message'
            );
        });

        it('returns only the segment before the first " - "', () => {
            const mixin = interceptor as unknown as {
                extractBaseMessage(message: string): string;
            };

            expect(
                mixin['extractBaseMessage'](
                    `${multerExceptions.LIMIT_FILE_SIZE} - field "file"`
                )
            ).toBe(multerExceptions.LIMIT_FILE_SIZE);
        });
    });

    describe('mapError', () => {
        it('returns the error unchanged when it is not an HttpException', () => {
            const mixin = interceptor as unknown as {
                mapError(err: unknown): unknown;
            };
            const err = new Error('boom');

            expect(mixin['mapError'](err)).toBe(err);
        });

        it('returns the HttpException unchanged when its message maps to no known limit', () => {
            const mixin = interceptor as unknown as {
                mapError(err: unknown): unknown;
            };
            const err = new HttpException(
                'Something else entirely',
                HttpStatus.BAD_REQUEST
            );

            expect(mixin['mapError'](err)).toBe(err);
        });

        it('maps a known limit message onto its typed exception', () => {
            const mixin = interceptor as unknown as {
                mapError(err: unknown): unknown;
            };
            const err = new HttpException(
                multerExceptions.LIMIT_FILE_SIZE,
                HttpStatus.BAD_REQUEST
            );

            const mapped = mixin['mapError'](err);

            expect(mapped).toBeInstanceOf(FileExceedMaxSizeUploadException);
            expect(mapped).toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.exceedMaxSizeUpload,
                statusCodeKey:
                    EnumFileStatusCodeError[
                        EnumFileStatusCodeError.exceedMaxSizeUpload
                    ],
                messagePath: 'file.error.exceedMaxSizeUpload',
            });
        });
    });
});
