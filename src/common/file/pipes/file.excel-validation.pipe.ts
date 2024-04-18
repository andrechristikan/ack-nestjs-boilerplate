import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { IFileExtract } from 'src/common/file/interfaces/file.interface';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/common/file/constants/file.status-code.constant';
import { IHelperFileRows } from 'src/common/helper/interfaces/helper.interface';
import { IMessageValidationImportErrorParam } from 'src/common/message/interfaces/message.interface';
import { FileImportException } from 'src/common/file/exceptions/file.import.exception';
import { plainToInstance } from 'class-transformer';
import { ValidationError, validate } from 'class-validator';

//! only for excel and use after FileExtractPipe
@Injectable()
export class FileExcelValidationPipe<T> implements PipeTransform {
    constructor(private readonly dto: any) {}

    async transform(value: IFileExtract<T>): Promise<IFileExtract<T>> {
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

    async validate(value: IFileExtract<T>): Promise<void> {
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
        value: IFileExtract<T>,
        classDtos: any
    ): Promise<IHelperFileRows<T>[]> {
        const errors: IMessageValidationImportErrorParam[] = [];
        const dtos: IHelperFileRows<T>[] = [];

        for (const [index, extract] of value.extracts.entries()) {
            const dto: T[] = plainToInstance(classDtos, extract.data);
            const validator: ValidationError[] = await validate(dto);

            if (validator.length > 0) {
                errors.push({
                    row: index,
                    sheetName: extract.sheetName,
                    error: validator,
                });
            } else {
                dtos.push({
                    sheetName: extract.sheetName,
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
