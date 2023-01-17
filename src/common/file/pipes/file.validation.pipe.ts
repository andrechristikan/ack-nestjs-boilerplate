import {
    Injectable,
    UnprocessableEntityException,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { validate, ValidationError } from 'class-validator';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { IValidationErrorImport } from 'src/common/error/interfaces/error.interface';
import { IFileExtract } from 'src/common/file/interfaces/file.interface';
import { ENUM_FILE_EXCEL_MIME } from 'src/common/file/constants/file.enum.constant';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/common/file/constants/file.status-code.constant';

// only for excel
// must use after FileExtractPipe
@Injectable()
export class FileValidationPipe<T> implements PipeTransform {
    constructor(private readonly dto: ClassConstructor<T>) {}

    async transform(
        value: IFileExtract<T> | IFileExtract<T>[]
    ): Promise<IFileExtract<T> | IFileExtract<T>[]> {
        if (!value) {
            return;
        }

        if (Array.isArray(value)) {
            const classTransforms: IFileExtract<T>[] = [];
            for (const val of value) {
                await this.validate(val);

                const classTransform: T[] = await this.transformExtract(
                    this.dto,
                    val.extract
                );

                await this.validateExtract(classTransform, val.filename);

                const classTransformMerge: IFileExtract<T> =
                    await this.transformMerge(val, classTransform);
                classTransforms.push(classTransformMerge);
            }

            return classTransforms;
        }

        const file: IFileExtract<T> = value as IFileExtract<T>;
        await this.validate(file);

        const classTransform: T[] = await this.transformExtract(
            this.dto,
            file.extract
        );

        await this.validateExtract(classTransform, file.filename);

        return this.transformMerge(value, classTransform);
    }

    async transformMerge(
        value: IFileExtract,
        classTransform: T[]
    ): Promise<IFileExtract<T>> {
        return {
            ...value,
            dto: classTransform,
        };
    }

    async transformExtract(
        classDtos: ClassConstructor<T>,
        extract: Record<string, any>[]
    ): Promise<T[]> {
        return plainToInstance(classDtos, extract);
    }

    async validate(value: IFileExtract): Promise<void> {
        if (
            !Object.values(ENUM_FILE_EXCEL_MIME).find(
                (val) => val === value.mimetype.toLowerCase()
            )
        ) {
            throw new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_EXTENSION_ERROR,
                message: 'file.error.mimeInvalid',
            });
        } else if (!value.extract) {
            throw new UnprocessableEntityException({
                statusCode:
                    ENUM_FILE_STATUS_CODE_ERROR.FILE_NEED_EXTRACT_FIRST_ERROR,
                message: 'file.error.needExtractFirst',
            });
        }

        return;
    }

    async validateExtract(
        classTransform: T[],
        filename: string
    ): Promise<void> {
        const errors: IValidationErrorImport[] = [];
        for (const [index, clsTransform] of classTransform.entries()) {
            const validator: ValidationError[] = await validate(
                clsTransform as Record<string, any>
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
            throw new UnprocessableEntityException({
                statusCode:
                    ENUM_FILE_STATUS_CODE_ERROR.FILE_VALIDATION_DTO_ERROR,
                message: 'file.error.validationDto',
                errors,
                _errorType: 'import',
            });
        }

        return;
    }
}
