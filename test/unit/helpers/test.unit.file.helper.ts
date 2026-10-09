import type { PipeTransform, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { MockProxy } from 'vitest-mock-extended';
import type { EnumFileExtension } from '@common/file/enums/file.enum';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import type {
    IFileCsvValidationOptions,
    IFileInput,
} from '@common/file/interfaces/file.interface';
import { FileCsvValidationPipe } from '@common/file/pipes/file.csv-validation.pipe';
import { FileExtensionPipe } from '@common/file/pipes/file.extension.pipe';
import { FileService } from '@common/file/services/file.service';
import { HelperArrayService } from '@common/helper/services/helper.array.service';

export async function createFileExtensionPipe(
    allowedExtensions: EnumFileExtension[],
    fileService: MockProxy<FileService>
): Promise<PipeTransform<IFileInput, Promise<IFileInput>>> {
    const PipeClass: Type<PipeTransform<IFileInput, Promise<IFileInput>>> =
        FileExtensionPipe(allowedExtensions);
    const module = await Test.createTestingModule({
        providers: [PipeClass, { provide: FileService, useValue: fileService }],
    }).compile();

    return module.get(PipeClass);
}

export async function createFileCsvValidationPipe<
    TSchema extends StandardSchemaV1,
>(
    schema: TSchema,
    options: IFileCsvValidationOptions,
    configService: MockProxy<ConfigService>,
    helperArrayService: MockProxy<HelperArrayService>
): Promise<
    PipeTransform<
        unknown[],
        Promise<StandardSchemaV1.InferOutput<TSchema>[] | undefined>
    >
> {
    const PipeClass: Type<
        PipeTransform<
            unknown[],
            Promise<StandardSchemaV1.InferOutput<TSchema>[] | undefined>
        >
    > = FileCsvValidationPipe(schema, options);

    const module = await Test.createTestingModule({
        providers: [
            PipeClass,
            { provide: ConfigService, useValue: configService },
            { provide: HelperArrayService, useValue: helperArrayService },
        ],
    }).compile();

    return module.get(PipeClass);
}

export async function expectFileExtensionInvalid(
    promise: Promise<unknown>
): Promise<void> {
    await expect(promise).rejects.toMatchObject({
        module: 'file',
        statusCode: EnumFileStatusCodeError.extensionInvalid,
        statusCodeKey:
            EnumFileStatusCodeError[EnumFileStatusCodeError.extensionInvalid],
        messagePath: 'file.error.extensionInvalid',
    });
}
