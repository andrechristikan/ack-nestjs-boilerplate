import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
import { HelperFileService } from 'src/common/helper/services/helper.file.service';
import {
    ClassConstructor,
    ClassTransformOptions,
    plainToInstance,
} from 'class-transformer';
import { Reflector } from '@nestjs/core';
import { IResponseExcel } from 'src/common/response/interfaces/response.interface';
import {
    RESPONSE_EXCEL_TYPE_META_KEY,
    RESPONSE_SERIALIZATION_META_KEY,
    RESPONSE_SERIALIZATION_OPTIONS_META_KEY,
} from 'src/common/response/constants/response.constant';
import { WorkBook } from 'xlsx';
import { ENUM_HELPER_FILE_TYPE } from 'src/common/helper/constants/helper.enum.constant';
import { ENUM_FILE_EXCEL_MIME } from 'src/common/file/constants/file.enum.constant';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';

@Injectable()
export class ResponseExcelInterceptor implements NestInterceptor<Promise<any>> {
    constructor(
        private readonly reflector: Reflector,
        private readonly helperFileService: HelperFileService,
        private readonly helperDateService: HelperDateService
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<Record<string, any>>>> {
        const excelType: ENUM_HELPER_FILE_TYPE =
            this.reflector.get<ENUM_HELPER_FILE_TYPE>(
                RESPONSE_EXCEL_TYPE_META_KEY,
                context.getHandler()
            );

        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (res: Promise<IResponseExcel>) => {
                    const ctx: HttpArgumentsHost = context.switchToHttp();
                    const response: Response = ctx.getResponse();

                    const classSerialization: ClassConstructor<any> =
                        this.reflector.get<ClassConstructor<any>>(
                            RESPONSE_SERIALIZATION_META_KEY,
                            context.getHandler()
                        );
                    const classSerializationOptions: ClassTransformOptions =
                        this.reflector.get<ClassTransformOptions>(
                            RESPONSE_SERIALIZATION_OPTIONS_META_KEY,
                            context.getHandler()
                        );

                    // set default response
                    const responseData = (await res) as IResponseExcel;
                    let data: Record<string, any>[] = responseData.data;
                    if (classSerialization) {
                        data = plainToInstance(
                            classSerialization,
                            data,
                            classSerializationOptions
                        );
                    }

                    // create excel
                    const workbook: WorkBook =
                        this.helperFileService.createExcelWorkbook(data);
                    const excel: Buffer =
                        this.helperFileService.writeExcelToBuffer(workbook, {
                            type: excelType,
                        });

                    // set headers
                    const timestamp = this.helperDateService.timestamp();
                    response
                        .setHeader(
                            'Content-Type',
                            ENUM_FILE_EXCEL_MIME[excelType.toUpperCase()]
                        )
                        .setHeader(
                            'Content-Disposition',
                            `attachment; filename=export-${timestamp}.${excelType}`
                        )
                        .setHeader('Content-Length', excel.length);

                    return new StreamableFile(excel);
                })
            );
        }

        return next.handle();
    }
}
