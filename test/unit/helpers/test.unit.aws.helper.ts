import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { AwsSesService } from '@common/aws/services/aws.ses.service';
import { FileService } from '@common/file/services/file.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

export interface IAwsS3ServiceDoubles {
    fileService: MockProxy<FileService>;
}

export async function createAwsS3Service(
    configValues: Record<string, unknown>,
    overrides: Record<string, unknown>,
    doubles: IAwsS3ServiceDoubles
): Promise<AwsS3Service> {
    const configService = buildConfigService({
        ...configValues,
        ...overrides,
    });

    const module = await Test.createTestingModule({
        providers: [
            AwsS3Service,
            { provide: ConfigService, useValue: configService },
            { provide: FileService, useValue: doubles.fileService },
            HelperStringService,
        ],
    }).compile();

    return module.get(AwsS3Service);
}

export async function createInitializedAwsS3Service(
    configValues: Record<string, unknown>,
    overrides: Record<string, unknown>,
    doubles: IAwsS3ServiceDoubles
): Promise<AwsS3Service> {
    const service = await createAwsS3Service(configValues, overrides, doubles);
    service.onModuleInit();

    return service;
}

export async function createAwsSesService(
    configValues: Record<string, unknown>,
    overrides: Record<string, unknown>
): Promise<AwsSesService> {
    const configService = buildConfigService({
        ...configValues,
        ...overrides,
    });

    const module = await Test.createTestingModule({
        providers: [
            AwsSesService,
            { provide: ConfigService, useValue: configService },
        ],
    }).compile();

    return module.get(AwsSesService);
}

export async function createInitializedAwsSesService(
    configValues: Record<string, unknown>,
    overrides: Record<string, unknown>
): Promise<AwsSesService> {
    const service = await createAwsSesService(configValues, overrides);
    service.onModuleInit();

    return service;
}

export async function expectAwsS3KeyInvalid(
    promise: Promise<unknown>
): Promise<void> {
    await expect(promise).rejects.toMatchObject({
        module: 'aws',
        statusCode: EnumAwsStatusCodeError.s3KeyInvalid,
        statusCodeKey:
            EnumAwsStatusCodeError[EnumAwsStatusCodeError.s3KeyInvalid],
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        messagePath: 'aws.error.s3KeyInvalid',
    });
}

export async function expectAwsS3FileRequired(
    promise: Promise<unknown>
): Promise<void> {
    await expect(promise).rejects.toMatchObject({
        module: 'aws',
        statusCode: EnumAwsStatusCodeError.s3FileRequired,
        statusCodeKey:
            EnumAwsStatusCodeError[EnumAwsStatusCodeError.s3FileRequired],
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        messagePath: 'aws.error.s3FileRequired',
    });
}

export async function expectAwsS3ObjectExist(
    promise: Promise<unknown>
): Promise<void> {
    await expect(promise).rejects.toMatchObject({
        module: 'aws',
        statusCode: EnumAwsStatusCodeError.s3ObjectExist,
        statusCodeKey:
            EnumAwsStatusCodeError[EnumAwsStatusCodeError.s3ObjectExist],
        httpStatus: HttpStatus.CONFLICT,
        messagePath: 'aws.error.s3ObjectExist',
    });
}

export async function expectAwsS3MaxPartNumberExceeded(
    promise: Promise<unknown>
): Promise<void> {
    await expect(promise).rejects.toMatchObject({
        module: 'aws',
        statusCode: EnumAwsStatusCodeError.s3MaxPartNumberExceeded,
        statusCodeKey:
            EnumAwsStatusCodeError[
                EnumAwsStatusCodeError.s3MaxPartNumberExceeded
            ],
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        messagePath: 'aws.error.s3MaxPartNumberExceeded',
    });
}

export async function expectAwsS3IterationLimitExceeded(
    promise: Promise<unknown>
): Promise<void> {
    await expect(promise).rejects.toMatchObject({
        module: 'aws',
        statusCode: EnumAwsStatusCodeError.s3IterationLimitExceeded,
        statusCodeKey:
            EnumAwsStatusCodeError[
                EnumAwsStatusCodeError.s3IterationLimitExceeded
            ],
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        messagePath: 'aws.error.s3IterationLimitExceeded',
    });
}
