import { Injectable, PipeTransform, Type, mixin } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { IMessageValidationImportErrorParam } from '@common/message/interfaces/message.interface';
import { FileImportException } from '@common/file/exceptions/file.import.exception';
import { FileRequiredExtractFirstException } from '@common/file/exceptions/file.required-extract-first.exception';
import { FileExceedMaxDataImportException } from '@common/file/exceptions/file.exceed-max-data-import.exception';
import { IFileCsvValidationOptions } from '@common/file/interfaces/file.interface';

/**
 * Builds a pipe that validates every parsed CSV row against `schema`,
 * collecting per-row failures into a `FileImportException`.
 */
export function FileCsvValidationPipe<TSchema extends StandardSchemaV1>(
    schema: TSchema,
    options?: IFileCsvValidationOptions
): Type<PipeTransform> {
    @Injectable()
    class MixinFileCsvValidationPipe implements PipeTransform {
        private readonly maxDataImport: number;

        constructor(private readonly configService: ConfigService) {
            // Takes the config KEY, not the value: a pipe factory runs at
            // decoration time, before config is resolved.
            this.maxDataImport = this.configService.get<number>(
                options?.maxDataImportConfigKey ?? 'file.maxDataImport'
            )!;
        }

        /**
         * Validates each row against `schema`; throws `FileImportException` with row indexes on any failure.
         */
        private async validateRows(
            data: unknown[]
        ): Promise<StandardSchemaV1.InferOutput<TSchema>[]> {
            const rows: StandardSchemaV1.InferOutput<TSchema>[] = [];
            const errors: IMessageValidationImportErrorParam[] = [];

            for (let i = 0; i < data.length; i++) {
                const result = await schema['~standard'].validate(data[i]);

                if (result.issues) {
                    errors.push({
                        row: i,
                        errors: result.issues,
                    });

                    continue;
                }

                rows.push(result.value);
            }

            if (errors.length > 0) {
                throw new FileImportException(errors);
            }

            return rows;
        }

        /**
         * Throws when rows are empty or exceed the configured row cap,
         * then forwards to row validation.
         */
        private async parse(
            value: unknown[]
        ): Promise<StandardSchemaV1.InferOutput<TSchema>[]> {
            if (!value || value.length === 0) {
                throw new FileRequiredExtractFirstException();
            } else if (value.length > this.maxDataImport) {
                throw new FileExceedMaxDataImportException();
            }

            return this.validateRows(value);
        }

        async transform(
            value: unknown[]
        ): Promise<StandardSchemaV1.InferOutput<TSchema>[] | undefined> {
            if (!value) {
                return undefined;
            }

            return this.parse(value);
        }
    }

    return mixin(MixinFileCsvValidationPipe);
}
