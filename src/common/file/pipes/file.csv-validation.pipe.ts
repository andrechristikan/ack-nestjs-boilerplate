import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { IMessageValidationImportErrorParam } from '@common/message/interfaces/message.interface';
import { FileImportException } from '@common/file/exceptions/file.import.exception';
import { validate } from 'class-validator';
import { FileMaxDataImport } from '@common/file/constants/file.constant';

/**
 * A NestJS pipe that validates Csv file data by transforming raw sheet data into DTOs
 * and performing class-validator validation on each sheet's data.
 * This pipe is designed to work with Csv files that have been parsed into sheet structures,
 * where each sheet contains an array of raw data objects that need to be validated against
 * corresponding DTO classes.
 * @template TDto - The DTO class type that extends ClassConstructor, used for validation
 * @template TRaw - The raw data type from the Csv sheet before transformation
 */
@Injectable()
export class FileCsvValidationPipe<
    TDto extends ClassConstructor<unknown>,
    TRaw,
> implements PipeTransform {
    constructor(private readonly dto: TDto) {}

    /**
     * Entry point for the NestJS pipe. Returns undefined when the value or DTO class is absent,
     * otherwise delegates to the internal parse and validation flow.
     *
     * @param {TRaw[]} value - Raw CSV row objects to validate
     * @returns {Promise<TDto[] | undefined>} Validated DTO instances, or undefined if input is empty
     */
    async transform(value: TRaw[]): Promise<TDto[] | undefined> {
        if (!value || !this.dto) {
            return undefined;
        }

        const data = await this.parse(value);
        return data;
    }

    /**
     * Validates presence and size of the raw data array before dispatching to DTO validation.
     * Throws when the array is empty or exceeds the maximum allowed import row count.
     *
     * @param {TRaw[]} value - Raw CSV row objects to check and forward
     * @throws {UnprocessableEntityException} When value is empty or exceeds FileMaxDataImport
     * @returns {Promise<TDto[]>} Validated DTO instances
     */
    private async parse(value: TRaw[]): Promise<TDto[]> {
        if (!value || value.length === 0) {
            throw new UnprocessableEntityException({
                statusCode: EnumFileStatusCodeError.requiredExtractFirst,
                message: 'file.error.requiredParseFirst',
            });
        } else if (value.length > FileMaxDataImport) {
            throw new UnprocessableEntityException({
                statusCode: EnumFileStatusCodeError.exceedMaxDataImport,
                message: 'file.error.exceedMaxDataImport',
            });
        }

        return this.validateDto(value);
    }

    /**
     * Validates an array of raw data against the specified DTO class.
     * Transforms each raw item to a DTO instance and performs validation.
     * Tracks validation errors with their corresponding array index for error reporting.
     * @param {TRaw[]} data - Array of raw data objects to validate
     * @returns {Promise<TDto[]>} Array of validated DTO instances
     * @throws {FileImportException} If any validation errors occur, with row index information
     * @private
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
