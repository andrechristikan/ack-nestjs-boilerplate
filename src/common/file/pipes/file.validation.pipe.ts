import {
    BadRequestException,
    Injectable,
    UnprocessableEntityException,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { validate, ValidationError } from 'class-validator';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { IValidationErrorImport } from 'src/common/error/interfaces/error.interface';
import {
    IFileExtract,
    IFileExtractAllSheets,
} from 'src/common/file/interfaces/file.interface';
import { ENUM_FILE_EXCEL_MIME } from 'src/common/file/constants/file.enum.constant';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/common/file/constants/file.status-code.constant';
import { ERROR_TYPE } from 'src/common/error/constants/error.enum.constant';

// only for excel
// must use after FileExtractPipe
@Injectable()
export class FileValidationPipe<T = any> implements PipeTransform {
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

                await this.validateExtract(classTransform, val.originalname, 0);

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

        await this.validateExtract(classTransform, file.originalname, 0);

        return this.transformMerge(value, classTransform);
    }

    async transformMerge(
        value: IFileExtract<T>,
        classTransform: T[]
    ): Promise<IFileExtract<T>> {
        value.dto = classTransform;

        return value;
    }

    async transformExtract(
        classDtos: ClassConstructor<T>,
        extract: Record<string, any>[]
    ): Promise<T[]> {
        return plainToInstance(classDtos, extract);
    }

    async validate(value: IFileExtract<T>): Promise<void> {
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
        filename: string,
        sheet: number
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
                    sheet,
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
                _errorType: ERROR_TYPE.IMPORT,
            });
        }

        return;
    }
}

@Injectable()
export class FileValidationAllSheetPipe<T = any[]> implements PipeTransform {
    constructor(private readonly dto: T) {}

    async transform(
        value: IFileExtractAllSheets<T> | IFileExtractAllSheets<T>[]
    ): Promise<IFileExtractAllSheets<T> | IFileExtractAllSheets<T>[]> {
        if (!value) {
            return;
        }

        if (Array.isArray(value)) {
            for (let val of value) {
                val.dto = Array(val.extracts.length).fill([]);

                const file: IFileExtractAllSheets<T> =
                    val as IFileExtractAllSheets<T>;

                await this.validate(file);

                for (let i = 0; i < (this.dto as Array<T>).length; i++) {
                    const classTransform: T[] = await this.transformExtract(
                        this.dto[i] as ClassConstructor<any>,
                        val.extracts[i]
                    );

                    await this.validateExtract(
                        classTransform,
                        file.originalname,
                        i
                    );

                    val = await this.transformMerge(val, classTransform, i);
                }
            }

            return value;
        }

        value.dto = Array(value.extracts.length).fill([]);

        const file: IFileExtractAllSheets<T> =
            value as IFileExtractAllSheets<T>;

        await this.validate(file);

        for (let i = 0; i < (this.dto as Array<T>).length; i++) {
            const classTransform: T[] = await this.transformExtract(
                this.dto[i] as ClassConstructor<any>,
                value.extracts[i]
            );

            await this.validateExtract(classTransform, file.originalname, i);

            value = await this.transformMerge(value, classTransform, i);
        }

        return value;
    }

    async transformMerge(
        value: IFileExtractAllSheets<T>,
        classTransform: T[],
        sheet: number
    ): Promise<IFileExtractAllSheets<T>> {
        value.dto[sheet] = classTransform;

        return value;
    }

    async transformExtract(
        classDtos: ClassConstructor<T>,
        extract: Record<string, any>[]
    ): Promise<T[]> {
        return plainToInstance(classDtos, extract);
    }

    async validate(value: IFileExtractAllSheets<T>): Promise<void> {
        if (
            !Object.values(ENUM_FILE_EXCEL_MIME).find(
                (val) => val === value.mimetype.toLowerCase()
            )
        ) {
            throw new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_EXTENSION_ERROR,
                message: 'file.error.mimeInvalid',
            });
        } else if (!value.extracts) {
            throw new UnprocessableEntityException({
                statusCode:
                    ENUM_FILE_STATUS_CODE_ERROR.FILE_NEED_EXTRACT_FIRST_ERROR,
                message: 'file.error.needExtractFirst',
            });
        } else if (value.extracts.length !== (this.dto as Array<T>).length) {
            throw new BadRequestException({
                statusCode:
                    ENUM_FILE_STATUS_CODE_ERROR.FILE_VALIDATION_ALL_SHEET_DTO_ERROR,
                message: 'file.error.allSheetDto',
            });
        }

        return;
    }

    async validateExtract(
        classTransform: T[],
        filename: string,
        sheet: number
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
                    sheet,
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
                _errorType: ERROR_TYPE.IMPORT,
            });
        }

        return;
    }
}
