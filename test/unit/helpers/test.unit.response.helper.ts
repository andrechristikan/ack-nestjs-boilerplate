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
import { of } from 'rxjs';
import type { Observable } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { FileService } from '@common/file/services/file.service';
import type { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { ResponseFileInterceptor } from '@common/response/interceptors/response.file.interceptor';
import type {
    IResponseFileInterceptorOptions,
    IResponseFileReturn,
    IResponsePaginationReturn,
} from '@common/response/interfaces/response.interface';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

export interface IResponseFileInterceptorDoubles {
    fileService: MockProxy<FileService>;
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
    createDefaultFilename(extension: EnumFileExtensionDocument): string;
    createDisposition(filename: string, fallback: string): string;
}

export function buildResponseFileInterceptorDoubles(): IResponseFileInterceptorDoubles {
    return {
        fileService: mock<FileService>(),
        responseMetadataService: mock<ResponseMetadataService>(),
        configService: buildConfigService(TestUnitKitConfigValues),
    };
}

export async function createResponseFileInterceptorFromClass(
    interceptorClass: Type<NestInterceptor>,
    doubles: IResponseFileInterceptorDoubles
): Promise<IResponseFileInterceptorUnderTest> {
    const module = await Test.createTestingModule({
        providers: [
            ...TestUnitKitProviders,
            interceptorClass,
            { provide: FileService, useValue: doubles.fileService },
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
    options: IResponseFileInterceptorOptions | null,
    doubles: IResponseFileInterceptorDoubles
): Promise<IResponseFileInterceptorUnderTest> {
    return createResponseFileInterceptorFromClass(
        options === null
            ? ResponseFileInterceptor()
            : ResponseFileInterceptor(options),
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

export function buildPaginationEmission<T>(
    responseData: IResponsePaginationReturn<T>
): Observable<Promise<IResponsePaginationReturn<T>>> {
    return of(Promise.resolve(responseData));
}
