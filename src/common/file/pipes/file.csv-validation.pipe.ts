import { Injectable } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { IMessageValidationImportErrorParam } from '@common/message/interfaces/message.interface';
import { FileImportException } from '@common/file/exceptions/file.import.exception';
import { validate } from 'class-validator';
import { FileMaxDataImport } from '@common/file/constants/file.constant';
import { FileRequiredExtractFirstException } from '@common/file/exceptions/file.required-extract-first.exception';
import { FileExceedMaxDataImportException } from '@common/file/exceptions/file.exceed-max-data-import.exception';

/**
 * Transforms parsed CSV rows into the given DTO and validates each via class-validator,
 * collecting per-row failures into a `FileImportException`.
 */
@Injectable()
export class FileCsvValidationPipe<
    TDto extends ClassConstructor<unknown>,
    TRaw,
> implements PipeTransform {
    constructor(private readonly dto: TDto) {}

    async transform(value: TRaw[]): Promise<TDto[] | undefined> {
        if (!value || !this.dto) {
            return undefined;
        }

        const data = await this.parse(value);
        return data;
    }

    /**
     * Throws when rows are empty or exceed `FileMaxDataImport`, then forwards to DTO validation.
     */
    private async parse(value: TRaw[]): Promise<TDto[]> {
        if (!value || value.length === 0) {
            throw new FileRequiredExtractFirstException();
        } else if (value.length > FileMaxDataImport) {
            throw new FileExceedMaxDataImportException();
        }

        return this.validateDto(value);
    }

    /**
     * Validates each row against the DTO; throws `FileImportException` with row indexes on any failure.
     */
    private async validateDto(data: TRaw[]): Promise<TDto[]> {
        const dtos: TDto[] = [];
        const errors: IMessageValidationImportErrorParam[] = [];
        for (let i = 0; i < data.length; i++) {
            const item = data[i] as TRaw;

            const validator: TDto = plainToInstance(
                this.dto as ClassConstructor<TDto>,
                item
            );
            const validationErrors = await validate(validator, {
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
