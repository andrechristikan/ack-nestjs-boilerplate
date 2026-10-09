import { Test } from '@nestjs/testing';
import type {
    CallHandler,
    ExecutionContext,
    NestInterceptor,
    StreamableFile,
    Type,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { Response } from 'express';
import { of } from 'rxjs';
import type { Observable } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { FileService } from '@common/file/services/file.service';
import { ResponseFileInterceptor } from '@common/response/interceptors/response.file.interceptor';
import type {
    IResponseFileInterceptorOptions,
    IResponseFileReturn,
    IResponsePaginationReturn,
} from '@common/response/interfaces/response.interface';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';

export interface IResponseFileInterceptorDoubles {
    fileService: MockProxy<FileService>;
    helperDateService: MockProxy<HelperDateService>;
    helperStringService: MockProxy<HelperStringService>;
    responseMetadataService: MockProxy<ResponseMetadataService>;
    configService: MockProxy<ConfigService>;
}

export interface IResponseFileInterceptorUnderTest {
    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<Promise<StreamableFile>>;
    validateCsvResponse(responseData: IResponseFileReturn): void;
    validatePdfResponse(responseData: IResponseFileReturn): void;
    handleFileResponse(responseData: IResponseFileReturn): Buffer;
    validateDataResponse(responseData: IResponseFileReturn | null): void;
    countDataRows(responseData: IResponseFileReturn): number;
    createTimestamp(): number;
    createDefaultFilename(timestamp: number): string;
    createDisposition(filename: string, fallback: string): string;
}

export function buildResponseFileInterceptorDoubles(): IResponseFileInterceptorDoubles {
    return {
        fileService: mock<FileService>(),
        helperDateService: mock<HelperDateService>(),
        helperStringService: mock<HelperStringService>(),
        responseMetadataService: mock<ResponseMetadataService>(),
        configService: mock<ConfigService>(),
    };
}

export async function createResponseFileInterceptorFromClass(
    interceptorClass: Type<NestInterceptor>,
    doubles: IResponseFileInterceptorDoubles
): Promise<IResponseFileInterceptorUnderTest> {
    const module = await Test.createTestingModule({
        providers: [
            interceptorClass,
            { provide: FileService, useValue: doubles.fileService },
            {
                provide: HelperDateService,
                useValue: doubles.helperDateService,
            },
            {
                provide: HelperStringService,
                useValue: doubles.helperStringService,
            },
            {
                provide: ResponseMetadataService,
                useValue: doubles.responseMetadataService,
            },
            { provide: ConfigService, useValue: doubles.configService },
        ],
    }).compile();

    return module.get(
        interceptorClass
    ) as unknown as IResponseFileInterceptorUnderTest;
}

export async function createResponseFileInterceptor(
    options: IResponseFileInterceptorOptions | undefined,
    doubles: IResponseFileInterceptorDoubles
): Promise<IResponseFileInterceptorUnderTest> {
    return createResponseFileInterceptorFromClass(
        ResponseFileInterceptor(options),
        doubles
    );
}

export function buildResultSchema(
    result: StandardSchemaV1.Result<unknown>
): StandardSchemaV1 {
    return {
        '~standard': {
            version: 1,
            vendor: 'test',
            validate: () => result,
        },
    };
}

export function buildPassThroughSchema(): StandardSchemaV1 {
    return {
        '~standard': {
            version: 1,
            vendor: 'test',
            validate: (item: unknown) => ({ value: item }),
        },
    };
}

export function buildPaginationEmission(
    responseData: IResponsePaginationReturn<unknown>
): Observable<Promise<Response>> {
    return of(Promise.resolve(responseData as unknown as Response));
}
