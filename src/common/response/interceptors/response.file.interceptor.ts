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
import {
    RESPONSE_FILE_EXCEL_PASSWORD_META_KEY,
    RESPONSE_FILE_EXCEL_SERIALIZATION_META_KEY,
    RESPONSE_FILE_EXCEL_TYPE_META_KEY,
    RESPONSE_SERIALIZATION_OPTIONS_META_KEY,
} from 'src/common/response/constants/response.constant';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ENUM_HELPER_FILE_EXCEL_TYPE } from 'src/common/helper/constants/helper.enum.constant';
import { ENUM_FILE_MIME } from 'src/common/file/constants/file.enum.constant';
import { IHelperFileRows } from 'src/common/helper/interfaces/helper.interface';
import { IResponseFileExcel } from 'src/common/response/interfaces/response.interface';

@Injectable()
export class ResponseFileExcelInterceptor
    implements NestInterceptor<Promise<any>>
{
    constructor(
        private readonly reflector: Reflector,
        private readonly helperFileService: HelperFileService,
        private readonly helperDateService: HelperDateService
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<Record<string, any>>>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (res: Promise<IResponseFileExcel>) => {
                    const ctx: HttpArgumentsHost = context.switchToHttp();
                    const response: Response = ctx.getResponse();

                    const type: ENUM_HELPER_FILE_EXCEL_TYPE =
                        this.reflector.get<ENUM_HELPER_FILE_EXCEL_TYPE>(
                            RESPONSE_FILE_EXCEL_TYPE_META_KEY,
                            context.getHandler()
                        );

                    const password: string = this.reflector.get<string>(
                        RESPONSE_FILE_EXCEL_PASSWORD_META_KEY,
                        context.getHandler()
                    );

                    const classSerialization: ClassConstructor<any>[] =
                        this.reflector.get<ClassConstructor<any>[]>(
                            RESPONSE_FILE_EXCEL_SERIALIZATION_META_KEY,
                            context.getHandler()
                        );
                    const classSerializationOptions: ClassTransformOptions =
                        this.reflector.get<ClassTransformOptions>(
                            RESPONSE_SERIALIZATION_OPTIONS_META_KEY,
                            context.getHandler()
                        );

                    // set default response
                    const responseData = (await res) as IResponseFileExcel;

                    if (!responseData) {
                        throw new Error(
                            'ResponseFileExcel must instanceof IResponseFileExcel'
                        );
                    } else if (
                        !responseData.data ||
                        !Array.isArray(responseData.data) ||
                        responseData.data.length === 0
                    ) {
                        throw new Error(
                            'Field data must in array and can not be empty'
                        );
                    }

                    if (type === ENUM_HELPER_FILE_EXCEL_TYPE.XLSX) {
                        const datas: IHelperFileRows[] = responseData.data;

                        if (
                            classSerialization &&
                            Array.isArray(classSerialization) &&
                            classSerialization.length > 0
                        ) {
                            for (const [index, data] of datas.entries()) {
                                if (classSerialization[index]) {
                                    const dataSerialization = plainToInstance(
                                        classSerialization[index],
                                        data,
                                        classSerializationOptions
                                    );

                                    datas[index].data = dataSerialization;
                                }
                            }
                        }

                        // create file
                        const file: Buffer = this.helperFileService.writeExcel(
                            datas,
                            { password }
                        );

                        // set headers
                        const timestamp =
                            this.helperDateService.createTimestamp();
                        response
                            .setHeader('Content-Type', ENUM_FILE_MIME.XLSX)
                            .setHeader(
                                'Content-Disposition',
                                `attachment; filename=export-${timestamp}.${type.toLowerCase()}`
                            )
                            .setHeader('Content-Length', file.length);

                        return new StreamableFile(file);
                    }

                    // create file
                    const data: IHelperFileRows = responseData.data[0];

                    if (
                        classSerialization &&
                        Array.isArray(classSerialization) &&
                        classSerialization.length > 0
                    ) {
                        if (classSerialization[0]) {
                            const dataSerialization = plainToInstance(
                                classSerialization[0],
                                data.data,
                                classSerializationOptions
                            );

                            data.data = dataSerialization;
                        }
                    }

                    // create file
                    const file: Buffer = this.helperFileService.writeCsv(data);

                    // set headers
                    const timestamp = this.helperDateService.createTimestamp();
                    response
                        .setHeader('Content-Type', ENUM_FILE_MIME.CSV)
                        .setHeader(
                            'Content-Disposition',
                            `attachment; filename=export-${timestamp}.${type.toLowerCase()}`
                        )
                        .setHeader('Content-Length', file.length);

                    return new StreamableFile(file);
                })
            );
        }

        return next.handle();
    }
}
