import { Injectable, mixin } from '@nestjs/common';
import type { PipeTransform, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { IMessageValidationImportErrorParam } from '@common/message/interfaces/message.interface';
import { FileImportException } from '@common/file/exceptions/file.import.exception';
import { FileRequiredExtractFirstException } from '@common/file/exceptions/file.required-extract-first.exception';
import { FileExceedMaxDataImportException } from '@common/file/exceptions/file.exceed-max-data-import.exception';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import type { IFileCsvValidationOptions } from '@common/file/interfaces/file.interface';

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
        private readonly validationConcurrency: number;

        constructor(
            private readonly configService: ConfigService,
            private readonly helperArrayService: HelperArrayService
        ) {
            // Takes the config KEY, not the value: a pipe factory runs at
            // decoration time, before config is resolved.
            this.maxDataImport = this.configService.get<number>(
                options?.maxDataImportConfigKey ?? 'file.maxDataImport'
            )!;
            this.validationConcurrency = this.configService.get<number>(
                'file.importValidationConcurrency'
            )!;
        }

        /**
         * Validates rows in bounded chunks, concurrent within a chunk, keeping input order;
         * throws `FileImportException` with row indexes on any failure.
         */
        private async validateRows(
            data: unknown[]
        ): Promise<StandardSchemaV1.InferOutput<TSchema>[]> {
            const rows: StandardSchemaV1.InferOutput<TSchema>[] = [];
            const errors: IMessageValidationImportErrorParam[] = [];

            const batches = this.helperArrayService.chunk(
                data,
                this.validationConcurrency
            );

            let offset = 0;
            // Sequential by design: bounded chunks, concurrent within a chunk
            for (const batch of batches) {
                const resultPromises = batch.map(row =>
                    schema['~standard'].validate(row)
                );
                const results = await Promise.all(resultPromises);

                results.forEach((result, index) => {
                    if (result.issues) {
                        errors.push({
                            row: offset + index,
                            errors: result.issues,
                        });

                        return;
                    }

                    rows.push(result.value);
                });
                offset += batch.length;
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
        ): Promise<StandardSchemaV1.InferOutput<TSchema>[] | null> {
            if (!value) {
                return null;
            }

            return this.parse(value);
        }
    }

    return mixin(MixinFileCsvValidationPipe);
}
