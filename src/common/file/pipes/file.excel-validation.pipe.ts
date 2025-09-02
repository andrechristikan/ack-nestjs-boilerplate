import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { IMessageValidationImportErrorParam } from '@common/message/interfaces/message.interface';
import { FileImportException } from '@common/file/exceptions/file.import.exception';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { ValidationError, validate } from 'class-validator';
import { IFileSheet } from '@common/file/interfaces/file.interface';
import { ENUM_FILE_STATUS_CODE_ERROR } from '@common/file/enums/file.status-code.enum';

/**
 * A NestJS pipe that validates Excel file data by transforming raw sheet data into DTOs
 * and performing class-validator validation on each sheet's data.
 * This pipe is designed to work with Excel files that have been parsed into sheet structures,
 * where each sheet contains an array of raw data objects that need to be validated against
 * corresponding DTO classes.
 * @template TDto - The DTO class type that extends ClassConstructor, used for validation
 * @template TRaw - The raw data type from the Excel sheet before transformation
 */
@Injectable()
export class FileExcelValidationPipe<
    TDto extends ClassConstructor<unknown>,
    TRaw,
> implements PipeTransform
{
    constructor(private readonly dtos: TDto[]) {}

    /**
     * Transforms and validates raw Excel sheet data into validated DTO objects.
     * This method orchestrates the validation process by first checking if the input
     * is valid, then transforming each sheet's raw data into corresponding DTOs,
     * and finally validating each DTO using class-validator decorators.
     * @param {IFileSheet<TRaw>[]} value - Array of file sheets containing raw data to be validated
     * @returns {Promise<IFileSheet<TDto>[] | undefined>} Promise that resolves to an array of validated file sheets with DTO data, or undefined if no input is provided
     * @throws {UnprocessableEntityException} When the input data is invalid or missing
     * @throws {FileImportException} When validation errors occur during DTO validation
     */
    async transform(
        value: IFileSheet<TRaw>[]
    ): Promise<IFileSheet<TDto>[] | undefined> {
        if (!value) {
            return undefined;
        }

        this.validate(value);
        const dtos = await this.validateParse(value, this.dtos);

        return dtos;
    }

    /**
     * Validates the basic structure and presence of the input data.
     *
     * Performs preliminary validation to ensure that the input data exists
     * and contains at least one sheet. This prevents downstream processing
     * errors and provides clear error messages for missing data.
     *
     * @param value - Array of file sheets to validate
     * @throws {UnprocessableEntityException} When the input is null, undefined, or empty
     * @private
     */
    private validate(value: IFileSheet<TRaw>[]): void {
        if (!value || value.length === 0) {
            throw new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.REQUIRED_EXTRACT_FIRST,
                message: 'file.error.requiredParseFirst',
            });
        }
    }

    /**
     * Transforms raw sheet data into DTOs and validates each DTO using class-validator.
     *
     * This method processes each sheet in the input array by:
     * 1. Transforming raw data objects into instances of the corresponding DTO class
     * 2. Running class-validator validation on each DTO instance
     * 3. Collecting validation errors with sheet and row context
     * 4. Throwing a FileImportException if any validation errors are found
     *
     * The method ensures that all data conforms to the business rules defined
     * in the DTO classes through their validation decorators.
     *
     * @param value - Array of file sheets containing raw data to be transformed and validated
     * @param classDtos - Array of DTO class constructors for transformation and validation
     * @returns Promise that resolves to an array of validated file sheets with DTO data
     * @throws {FileImportException} When validation errors occur, containing detailed error information
     * @private
     */
    private async validateParse(
        value: IFileSheet<TRaw>[],
        classDtos: TDto[]
    ): Promise<IFileSheet<TDto>[]> {
        const errors: IMessageValidationImportErrorParam[] = [];
        const dtos: IFileSheet<TDto>[] = [];

        for (const [index, parse] of value.entries()) {
            const classDto = classDtos[index];
            if (!classDto) {
                continue;
            }

            const dto: TDto[] = plainToInstance(
                classDtos[index] as ClassConstructor<TDto>,
                parse.data
            );
            const validator: ValidationError[] = await validate(dto);

            if (validator.length > 0) {
                errors.push({
                    row: index,
                    sheetName: parse.sheetName,
                    errors: validator,
                });
            } else {
                dtos.push({
                    sheetName: parse.sheetName,
                    data: dto,
                });
            }
        }

        if (errors.length > 0) {
            throw new FileImportException(errors);
        }

        return dtos;
    }
}
