import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { MockProxy } from 'vitest-mock-extended';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestValidationException } from '@common/request/exceptions/request.validation.exception';
import { RequestCorsMiddleware } from '@common/request/middlewares/request.cors.middleware';
import { RequestUrlVersionMiddleware } from '@common/request/middlewares/request.url-version.middleware';
import { RequestSchemaValidationPipe } from '@common/request/pipes/request.schema-validation.pipe';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

export interface ICorsConfig {
    allowedOrigin: string | boolean | string[];
    allowedMethod: string[];
    allowedHeader: string[];
    exposedHeader: string[];
}

export function expectRequestContextMissing(thrown: unknown): void {
    expect(thrown).toMatchObject({
        module: 'request',
        statusCode: EnumRequestStatusCodeError.contextMissing,
        statusCodeKey:
            EnumRequestStatusCodeError[
                EnumRequestStatusCodeError.contextMissing
            ],
        messagePath: 'request.error.contextMissing',
    });
}

export function expectRequestContextMissingWithKey(
    thrown: unknown,
    contextKey: string
): void {
    expect(thrown).toMatchObject({
        module: 'request',
        statusCode: EnumRequestStatusCodeError.contextMissing,
        statusCodeKey:
            EnumRequestStatusCodeError[
                EnumRequestStatusCodeError.contextMissing
            ],
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        messagePath: 'request.error.contextMissing',
        rawError: expect.objectContaining({
            message: expect.stringContaining(contextKey),
        }),
    });
}

export function buildRequestSchemaValidationPipe(
    transform: boolean
): RequestSchemaValidationPipe {
    return new RequestSchemaValidationPipe({
        transform,
        exceptionFactory: (issues: readonly StandardSchemaV1.Issue[]) =>
            new RequestValidationException(issues),
    });
}

export async function createRequestCorsMiddleware(
    config: ICorsConfig
): Promise<RequestCorsMiddleware> {
    const configService = buildConfigService({
        'request.cors.allowedOrigin': config.allowedOrigin,
        'request.cors.allowedMethod': config.allowedMethod,
        'request.cors.allowedHeader': config.allowedHeader,
        'request.cors.exposedHeader': config.exposedHeader,
    });

    const module = await Test.createTestingModule({
        providers: [
            RequestCorsMiddleware,
            { provide: ConfigService, useValue: configService },
        ],
    }).compile();

    return module.get(RequestCorsMiddleware);
}

export async function createRequestUrlVersionMiddleware(
    urlVersionEnable: boolean,
    requestStoreService: MockProxy<RequestStoreService>
): Promise<RequestUrlVersionMiddleware> {
    const configService = buildConfigService({
        'app.globalPrefix': '/api',
        'app.urlVersion.enable': urlVersionEnable,
        'app.urlVersion.prefix': 'v',
        'app.urlVersion.version': '1',
    });

    const module = await Test.createTestingModule({
        providers: [
            RequestUrlVersionMiddleware,
            { provide: ConfigService, useValue: configService },
            { provide: RequestStoreService, useValue: requestStoreService },
        ],
    }).compile();

    return module.get(RequestUrlVersionMiddleware);
}
