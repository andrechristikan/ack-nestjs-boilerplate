import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import { EnumHelperStatusCodeError } from '@common/helper/enums/helper.status-code.enum';
import { EnumRedisStatusCodeError } from '@common/redis/enums/redis.status-code.enum';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

/** @public */
export const DocResponseEntryMetaKey = 'DocResponseEntryMetaKey';

/** @public */
export const DocGlobalErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        statusCode: EnumAppStatusCodeError.unknown,
        messagePath: 'http.serverError.internalServerError',
    },
    {
        httpStatus: HttpStatus.REQUEST_TIMEOUT,
        statusCode: EnumRequestStatusCodeError.timeout,
        messagePath: 'http.clientError.requestTimeOut',
    },
    {
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumRequestStatusCodeError.validation,
        messagePath: 'request.error.validation',
    },
    {
        httpStatus: HttpStatus.TOO_MANY_REQUESTS,
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        messagePath: 'http.429',
    },
    {
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        statusCode: EnumHelperStatusCodeError.decryptFailed,
        messagePath: 'helper.error.decryptFailed',
    },
    {
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        statusCode: EnumHelperStatusCodeError.encryptionSecretInvalid,
        messagePath: 'helper.error.encryptionSecretInvalid',
    },
    {
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        statusCode: EnumHelperStatusCodeError.patternTokenMissing,
        messagePath: 'helper.error.patternTokenMissing',
    },
    {
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        statusCode: EnumRequestStatusCodeError.schemaMissing,
        messagePath: 'request.error.schemaMissing',
    },
    {
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        statusCode: EnumRequestStatusCodeError.contextMissing,
        messagePath: 'request.error.contextMissing',
    },
    {
        httpStatus: HttpStatus.CONFLICT,
        statusCode: EnumDatabaseStatusCodeError.uniqueValueGenerationFailed,
        messagePath: 'database.error.uniqueValueGenerationFailed',
    },
    {
        httpStatus: HttpStatus.CONFLICT,
        statusCode: EnumDatabaseStatusCodeError.writeConflict,
        messagePath: 'database.error.writeConflict',
    },
    {
        httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
        statusCode: EnumDatabaseStatusCodeError.unavailable,
        messagePath: 'database.error.unavailable',
    },
    {
        httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
        statusCode: EnumRedisStatusCodeError.unavailable,
        messagePath: 'redis.error.unavailable',
    },
    {
        httpStatus: HttpStatus.NOT_FOUND,
        statusCode: EnumAwsStatusCodeError.s3NotConfigured,
        messagePath: 'aws.error.s3NotConfigured',
    },
];
