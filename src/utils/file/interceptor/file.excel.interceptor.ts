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
import { IFile } from '../file.interface';

export function FileExcelInterceptor(
    required?: boolean
): Type<NestInterceptor> {
    @Injectable()
    class MixinFileExcelInterceptor implements NestInterceptor<Promise<any>> {
        constructor(private readonly configService: ConfigService) {}

        async intercept(
            context: ExecutionContext,
            next: CallHandler
        ): Promise<Observable<Promise<any> | string>> {
            if (context.getType() === 'http') {
                const ctx: HttpArgumentsHost = context.switchToHttp();
                const { file, files } = ctx.getRequest();

                const finalFiles = files || file;

                if (Array.isArray(finalFiles)) {
                    const maxFiles = this.configService.get<number>(
                        'file.excel.maxFiles'
                    );

                    if (required && finalFiles.length === 0) {
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
                } else {
                    await this.validate(finalFiles);
                }
            }

            return next.handle();
        }

        async validate(file: IFile): Promise<void> {
            if (required && !file) {
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
    }

    return mixin(MixinFileExcelInterceptor);
}
