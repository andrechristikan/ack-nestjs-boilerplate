import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { EnumResponseStatusCodeError } from '@common/response/enums/response.status-code.enum';
import type { IResponseFileMediaTypes } from '@common/response/interfaces/response.interface';

/** @public */
export const ResponseMessagePathMetaKey = 'ResponseMessagePathMetaKey';

/** @public */
export const ResponseSchemaMetaKey = 'ResponseSchemaMetaKey';

/** @public */
export const ResponseFileMediaTypes: IResponseFileMediaTypes = {
    [EnumFileExtensionDocument.csv]: 'text/csv',
    [EnumFileExtensionDocument.pdf]: 'application/pdf',
};

/** @public */
export const ResponseTimestampHeaderName = 'x-timestamp';

/** @public */
export const ResponseTimezoneHeaderName = 'x-timezone';

/** @public */
export const ResponseVersionHeaderName = 'x-version';

/** @public */
export const ResponseRepoVersionHeaderName = 'x-repo-version';

/** @public */
export const ResponseDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        statusCode: EnumResponseStatusCodeError.serialization,
        messagePath: 'response.error.serialization',
    },
];

/** @public */
export const ResponsePaginationDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumPaginationStatusCodeError.filterInvalidValue,
        messagePath: 'pagination.error.filterInvalidValue',
    },
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumPaginationStatusCodeError.invalidPerPage,
        messagePath: 'pagination.error.invalidPerPage',
    },
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumPaginationStatusCodeError.perPageExceedsMaximum,
        messagePath: 'pagination.error.perPageExceedsMaximum',
    },
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumPaginationStatusCodeError.perPageCannotBeLessThanOne,
        messagePath: 'pagination.error.perPageCannotBeLessThanOne',
    },
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumPaginationStatusCodeError.invalidPage,
        messagePath: 'pagination.error.invalidPage',
    },
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumPaginationStatusCodeError.pageExceedsMaximum,
        messagePath: 'pagination.error.pageExceedsMaximum',
    },
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumPaginationStatusCodeError.pageCannotBeLessThanOne,
        messagePath: 'pagination.error.pageCannotBeLessThanOne',
    },
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumPaginationStatusCodeError.invalidCursorPaginationParams,
        messagePath: 'pagination.error.invalidCursorPaginationParams',
    },
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumPaginationStatusCodeError.cursorTooLong,
        messagePath: 'pagination.error.cursorTooLong',
    },
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumPaginationStatusCodeError.invalidCursorFormat,
        messagePath: 'pagination.error.invalidCursorFormat',
    },
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumPaginationStatusCodeError.invalidCursorData,
        messagePath: 'pagination.error.invalidCursorData',
    },
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumPaginationStatusCodeError.failedToDecodeCursor,
        messagePath: 'pagination.error.failedToDecodeCursor',
    },
    {
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        statusCode: EnumResponseStatusCodeError.serialization,
        messagePath: 'response.error.serialization',
    },
    {
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        statusCode: EnumResponseStatusCodeError.paginationShapeInvalid,
        messagePath: 'response.error.paginationShapeInvalid',
    },
    {
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        statusCode: EnumResponseStatusCodeError.paginationTypeInvalid,
        messagePath: 'response.error.paginationTypeInvalid',
    },
];

/** @public */
export const ResponseFileDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumFileStatusCodeError.exceedMaxDataExport,
        messagePath: 'file.error.exceedMaxDataExport',
    },
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumFileStatusCodeError.exceedMaxSizeExport,
        messagePath: 'file.error.exceedMaxSizeExport',
    },
];
