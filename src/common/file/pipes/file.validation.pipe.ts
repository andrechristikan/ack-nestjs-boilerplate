import {
    Injectable,
    UnprocessableEntityException,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { IFileExtract } from '../file.interface';
import { validate, ValidationError } from 'class-validator';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { IValidationErrorImport } from 'src/common/error/error.interface';
import { ENUM_FILE_STATUS_CODE_ERROR } from '../constants/file.status-code.constant';
import { ENUM_FILE_EXCEL_MIME } from '../constants/file.constant';

@Injectable()
export class FileValidationPipe<T> implements PipeTransform {
    constructor(private readonly dto: ClassConstructor<T>) {}

    async transform(value: IFileExtract<T>): Promise<IFileExtract<T>> {
        if (
            !Object.values(ENUM_FILE_EXCEL_MIME).find(
                (val) => val === value.mimetype.toLowerCase()
            )
        ) {
            throw new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_EXTENSION_ERROR,
                message: 'file.error.mimeInvalid',
            });
        }

        const classDtos: T[] = plainToInstance(this.dto, value.extract);

        try {
            await this.isValid(classDtos, value.filename);
        } catch (err: any) {
            throw new UnprocessableEntityException({
                statusCode:
                    ENUM_FILE_STATUS_CODE_ERROR.FILE_VALIDATION_DTO_ERROR,
                message: 'file.error.validationDto',
                errors: err,
                errorFromImport: true,
            });
        }

        return {
            ...value,
            dto: classDtos,
        };
    }

    async isValid(classDtos: T[], filename: string): Promise<boolean> {
        const errors: IValidationErrorImport[] = [];
        for (const [index, clsDto] of classDtos.entries()) {
            const validator: ValidationError[] = await validate(
                clsDto as Record<string, any>
            );
            if (validator.length > 0) {
                errors.push({
                    row: index,
                    file: filename,
                    errors: validator,
                });
            }
        }

        if (errors.length > 0) {
            throw errors;
        }

        return true;
    }
}
