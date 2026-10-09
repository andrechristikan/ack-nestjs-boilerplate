import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import type { AwsS3Service } from '@common/aws/services/aws.s3.service';
import type { AwsSESService } from '@common/aws/services/aws.ses.service';
import type { FileService } from '@common/file/services/file.service';
import type { HelperStringService } from '@common/helper/services/helper.string.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

export interface IAwsS3ServiceDoubles {
    fileService: MockProxy<FileService>;
    helperStringService: MockProxy<HelperStringService>;
}

export async function createAwsS3Service(
    configValues: Record<string, unknown>,
    overrides: Record<string, unknown>,
    doubles: IAwsS3ServiceDoubles
): Promise<AwsS3Service> {
    const [
        { AwsS3Service: AwsS3ServiceClass },
        { FileService: FileServiceClass },
        { HelperStringService: HelperStringServiceClass },
    ] = await Promise.all([
        import('@common/aws/services/aws.s3.service'),
        import('@common/file/services/file.service'),
        import('@common/helper/services/helper.string.service'),
    ]);
    const configService = buildConfigService({
        ...configValues,
        ...overrides,
    });

    const module = await Test.createTestingModule({
        providers: [
            AwsS3ServiceClass,
            { provide: ConfigService, useValue: configService },
            { provide: FileServiceClass, useValue: doubles.fileService },
            {
                provide: HelperStringServiceClass,
                useValue: doubles.helperStringService,
            },
        ],
    }).compile();

    return module.get(AwsS3ServiceClass);
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
): Promise<AwsSESService> {
    const { AwsSESService: AwsSESServiceClass } =
        await import('@common/aws/services/aws.ses.service');
    const configService = buildConfigService({
        ...configValues,
        ...overrides,
    });

    const module = await Test.createTestingModule({
        providers: [
            AwsSESServiceClass,
            { provide: ConfigService, useValue: configService },
        ],
    }).compile();

    return module.get(AwsSESServiceClass);
}

export async function createInitializedAwsSesService(
    configValues: Record<string, unknown>,
    overrides: Record<string, unknown>
): Promise<AwsSESService> {
    const service = await createAwsSesService(configValues, overrides);
    service.onModuleInit();

    return service;
}

export function fillPatternStub(
    pattern: string,
    values: Record<string, string>
): string {
    return Object.entries(values).reduce(
        (acc, [token, value]) => acc.replace(`{${token}}`, () => value),
        pattern
    );
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
