import { HttpStatus } from '@nestjs/common';
import bytes from 'bytes';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';

/** @public */
export const FileSizeInBytes: number = bytes('10mb') ?? 0;

/** @public */
export const FileMaxMultiple: number = 3;

/** @public */
export const FileUploadDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        statusCode: EnumFileStatusCodeError.extensionInvalid,
        messagePath: 'file.error.extensionInvalid',
    },
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumFileStatusCodeError.required,
        messagePath: 'file.error.required',
    },
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumFileStatusCodeError.requiredExtractFirst,
        messagePath: 'file.error.requiredExtractFirst',
    },
    {
        httpStatus: HttpStatus.PAYLOAD_TOO_LARGE,
        statusCode: EnumFileStatusCodeError.exceedMaxSizeUpload,
        messagePath: 'file.error.exceedMaxSizeUpload',
    },
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumFileStatusCodeError.exceedMaxFiles,
        messagePath: 'file.error.exceedMaxFiles',
    },
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumFileStatusCodeError.fieldUnexpected,
        messagePath: 'file.error.fieldUnexpected',
    },
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumFileStatusCodeError.multipartInvalid,
        messagePath: 'file.error.multipartInvalid',
    },
];
