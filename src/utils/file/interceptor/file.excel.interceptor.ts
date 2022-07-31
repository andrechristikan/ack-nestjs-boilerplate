import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    UnprocessableEntityException,
    PayloadTooLargeException,
    UnsupportedMediaTypeException,
    Type,
    mixin,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import {
    ENUM_FILE_EXCEL_MIME,
    ENUM_FILE_STATUS_CODE_ERROR,
} from '../file.constant';
import { IFile, IFileExcelOptions } from '../file.interface';
import { HelperFileService } from 'src/utils/helper/service/helper.file.service';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IValidationErrorImport } from 'src/utils/error/error.interface';

export function FileExcelInterceptor(
    options?: IFileExcelOptions
): Type<NestInterceptor> {
    @Injectable()
    class MixinFileExcelInterceptor implements NestInterceptor<Promise<any>> {
        constructor(
            private readonly configService: ConfigService,
            private readonly helperFileService: HelperFileService
        ) {}

        async intercept(
            context: ExecutionContext,
            next: CallHandler
        ): Promise<Observable<Promise<any> | string>> {
            if (context.getType() === 'http') {
                const ctx: HttpArgumentsHost = context.switchToHttp();
                const request = ctx.getRequest();
                const { file, files } = request;

                const finalFiles = files || file;

                if (Array.isArray(finalFiles)) {
                    const maxFiles = this.configService.get<number>(
                        'file.excel.maxFiles'
                    );

                    if (
                        options &&
                        options.required &&
                        finalFiles.length === 0
                    ) {
                        throw new UnprocessableEntityException({
                            statusCode:
                                ENUM_FILE_STATUS_CODE_ERROR.FILE_NEEDED_ERROR,
                            message: 'file.error.notFound',
                        });
                    } else if (finalFiles.length > maxFiles) {
                        throw new UnprocessableEntityException({
                            statusCode:
                                ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_ERROR,
                            message: 'file.error.maxFiles',
                        });
                    }

                    for (const file of finalFiles) {
                        await this.validate(file);
                    }

                    if (options && options.extract) {
                        let extractFiles = [];
                        let rawExtractFiles = [];
                        let errors: IValidationErrorImport[] = [];

                        for (const file of finalFiles) {
                            const extract =
                                await this.helperFileService.readExcel(
                                    file.buffer
                                );
                            rawExtractFiles = [...rawExtractFiles, ...extract];

                            try {
                                const serialization = await this.excelValidate(
                                    extract,
                                    file.originalname
                                );
                                extractFiles = [
                                    ...extractFiles,
                                    ...serialization,
                                ];
                            } catch (err: any) {
                                errors = [...errors, ...err];
                            }
                        }

                        if (errors.length > 0) {
                            throw new UnprocessableEntityException({
                                statusCode:
                                    ENUM_FILE_STATUS_CODE_ERROR.FILE_VALIDATION_DTO_ERROR,
                                message: 'file.error.validationDto',
                                errors,
                                errorFromImport: true,
                            });
                        }

                        request.__extractFiles = extractFiles;
                        request.__rawExtractFiles = rawExtractFiles;
                    }
                } else {
                    await this.validate(finalFiles);

                    if (options && options.extract) {
                        const extract = await this.helperFileService.readExcel(
                            file.buffer
                        );

                        try {
                            const serialization: Record<string, any>[] =
                                await this.excelValidate(
                                    extract,
                                    file.originalname
                                );
                            request.__extractFile = serialization;
                            request.__rawExtractFile = extract;
                        } catch (err: any) {
                            throw new UnprocessableEntityException({
                                statusCode:
                                    ENUM_FILE_STATUS_CODE_ERROR.FILE_VALIDATION_DTO_ERROR,
                                message: 'file.error.validationDto',
                                errors: err,
                                errorFromImport: true,
                            });
                        }
                    }
                }
            }

            return next.handle();
        }

        async validate(file: IFile): Promise<void> {
            if (options && options.required && !file) {
                throw new UnprocessableEntityException({
                    statusCode: ENUM_FILE_STATUS_CODE_ERROR.FILE_NEEDED_ERROR,
                    message: 'file.error.notFound',
                });
            } else if (file) {
                const { size, mimetype } = file;

                const maxSize = this.configService.get<number>(
                    'file.excel.maxFileSize'
                );
                if (
                    !Object.values(ENUM_FILE_EXCEL_MIME).find(
                        (val) => val === mimetype.toLowerCase()
                    )
                ) {
                    throw new UnsupportedMediaTypeException({
                        statusCode:
                            ENUM_FILE_STATUS_CODE_ERROR.FILE_EXTENSION_ERROR,
                        message: 'file.error.mimeInvalid',
                    });
                } else if (size > maxSize) {
                    throw new PayloadTooLargeException({
                        statusCode:
                            ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_SIZE_ERROR,
                        message: 'file.error.maxSize',
                    });
                }
            }
        }

        async excelValidate(
            extract: Record<string, any>[],
            fileName: string
        ): Promise<Record<string, any>[]> {
            if (options && options.dto) {
                const data: Record<string, any>[] = [];
                const errors: IValidationErrorImport[] = [];

                for (const [index, ext] of extract.entries()) {
                    const classDto = plainToInstance<any, any>(
                        options.dto,
                        ext
                    );

                    const validator: ValidationError[] = await validate(
                        classDto
                    );
                    if (validator.length > 0) {
                        errors.push({
                            row: index,
                            file: fileName,
                            errors: validator,
                        });
                    } else if (errors.length > 0) {
                        continue;
                    } else {
                        data.push(classDto);
                    }
                }

                if (errors.length > 0) {
                    throw errors;
                }

                return data;
            }
        }
    }

    return mixin(MixinFileExcelInterceptor);
}
