import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PipeTransform } from '@nestjs/common/interfaces';
import { IMessageValidationImportErrorParam } from 'src/common/message/interfaces/message.interface';
import { FileImportException } from 'src/common/file/exceptions/file.import.exception';
import { plainToInstance } from 'class-transformer';
import { ValidationError, validate } from 'class-validator';
import { IFileRows } from 'src/common/file/interfaces/file.interface';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/common/file/enums/file.status-code.enum';

//! only for excel and use after FileParsePipe
@Injectable()
export class FileExcelValidationPipe<T, N = Record<string, any>>
    implements PipeTransform
{
    constructor(private readonly dto: any) {}

    async transform(value: IFileRows<N>[]): Promise<IFileRows<T>[]> {
        if (!value) {
            return;
        }

        await this.validate(value);
        const dtos = await this.validateParse(value, this.dto);

        return dtos;
    }

    async validate(value: IFileRows<N>[]): Promise<void> {
        if (!value || value.length === 0) {
            throw new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.REQUIRED_EXTRACT_FIRST,
                message: 'file.error.requiredParseFirst',
            });
        }

        return;
    }

    async validateParse(
        value: IFileRows<N>[],
        classDtos: any
    ): Promise<IFileRows<T>[]> {
        const errors: IMessageValidationImportErrorParam[] = [];
        const dtos: IFileRows<T>[] = [];

        for (const [index, parse] of value.entries()) {
            const dto: T[] = plainToInstance(classDtos, parse.data);
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
