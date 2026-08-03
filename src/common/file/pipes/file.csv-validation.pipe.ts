import { Injectable, PipeTransform, Type, mixin } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IMessageValidationImportErrorParam } from '@common/message/interfaces/message.interface';
import { FileImportException } from '@common/file/exceptions/file.import.exception';
import { FileRequiredExtractFirstException } from '@common/file/exceptions/file.required-extract-first.exception';
import { FileExceedMaxDataImportException } from '@common/file/exceptions/file.exceed-max-data-import.exception';

/**
 * Builds a pipe that transforms parsed CSV rows into `dto` and validates each via
 * class-validator, collecting per-row failures into a `FileImportException`.
 */
export function FileCsvValidationPipe<TDto extends ClassConstructor<unknown>>(
    dto: TDto
): Type<PipeTransform> {
    @Injectable()
    class MixinFileCsvValidationPipe implements PipeTransform {
        private readonly maxDataImport: number;

        constructor(private readonly configService: ConfigService) {
            this.maxDataImport = this.configService.get<number>(
                'file.maxDataImport'
            )!;
        }

        async transform(
            value: unknown[]
        ): Promise<InstanceType<TDto>[] | undefined> {
            if (!value) {
                return undefined;
            }

            return this.parse(value);
        }

        /**
         * Throws when rows are empty or exceed the configured `file.maxDataImport`,
         * then forwards to DTO validation.
         */
        private async parse(value: unknown[]): Promise<InstanceType<TDto>[]> {
            if (!value || value.length === 0) {
                throw new FileRequiredExtractFirstException();
            } else if (value.length > this.maxDataImport) {
                throw new FileExceedMaxDataImportException();
            }

            return this.validateDto(value);
        }

        /**
         * Validates each row against `dto`; throws `FileImportException` with row indexes on any failure.
         */
        private async validateDto(
            data: unknown[]
        ): Promise<InstanceType<TDto>[]> {
            const dtos: InstanceType<TDto>[] = [];
            const errors: IMessageValidationImportErrorParam[] = [];
            for (let i = 0; i < data.length; i++) {
                const item = data[i];

                const validator = plainToInstance(
                    dto,
                    item
                ) as InstanceType<TDto>;
                const validationErrors = await validate(validator as object, {
                    skipMissingProperties: false,
                    skipNullProperties: false,
                    skipUndefinedProperties: false,
                    forbidUnknownValues: false,
                    whitelist: true,
                    forbidNonWhitelisted: true,
                    validationError: {
                        target: false,
                        value: true,
                    },
                });

                if (validationErrors.length > 0) {
                    errors.push({
                        row: i,
                        errors: validationErrors,
                    });
                } else {
                    dtos.push(validator);
                }
            }

            if (errors.length > 0) {
                throw new FileImportException(errors);
            }

            return dtos;
        }
    }

    return mixin(MixinFileCsvValidationPipe);
}
