import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { validate, ValidationError } from 'class-validator';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { IFileExtract } from 'src/common/file/interfaces/file.interface';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/common/file/constants/file.status-code.constant';
import { ERROR_TYPE } from 'src/common/error/constants/error.enum.constant';
import { IHelperFileRows } from 'src/common/helper/interfaces/helper.interface';
import { IErrorValidationImport } from 'src/common/error/interfaces/error.interface';

// only for excel
// must use after FileExtractPipe
@Injectable()
export class FileExcelValidationPipe<T = any, R = any>
    implements PipeTransform
{
    constructor(private readonly dto: ClassConstructor<T>) {}

    async transform(value: IFileExtract<R>): Promise<IFileExtract<T>> {
        if (!value) {
            return;
        }

        await this.validate(value);
        const dtos = await this.validateExtract(value, this.dto);

        return {
            ...value,
            extracts: dtos,
        };
    }

    async validate(value: IFileExtract<R>): Promise<void> {
        if (!value.extracts || value.extracts.length === 0) {
            throw new UnprocessableEntityException({
                statusCode:
                    ENUM_FILE_STATUS_CODE_ERROR.FILE_NEED_EXTRACT_FIRST_ERROR,
                message: 'file.error.needExtractFirst',
            });
        }

        return;
    }

    async validateExtract(
        value: IFileExtract<R>,
        classDtos: ClassConstructor<T>
    ): Promise<IHelperFileRows<T>[]> {
        const errors: IErrorValidationImport[] = [];
        const dtos: IHelperFileRows<T>[] = [];

        for (const [index, extract] of value.extracts.entries()) {
            const dto: T[] = plainToInstance(classDtos, extract.data);
            const validator: ValidationError[] = await validate(
                dto as Record<string, any>
            );

            if (validator.length > 0) {
                errors.push({
                    row: index,
                    sheetName: extract.sheetName,
                    errors: validator,
                });
            }

            dtos.push({
                sheetName: extract.sheetName,
                data: dto,
            });
        }

        if (errors.length > 0) {
            throw new UnprocessableEntityException({
                statusCode:
                    ENUM_FILE_STATUS_CODE_ERROR.FILE_VALIDATION_DTO_ERROR,
                message: 'file.error.validationDto',
                errors,
                _errorType: ERROR_TYPE.IMPORT,
            });
        }

        return dtos;
    }
}
