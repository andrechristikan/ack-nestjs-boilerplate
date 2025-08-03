import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
import { Reflector } from '@nestjs/core';
import { RESPONSE_FILE_EXCEL_TYPE_META_KEY } from '@common/response/constants/response.constant';
import { HelperService } from '@common/helper/services/helper.service';
import { IResponseFileExcel } from '@common/response/interfaces/response.interface';
import { FileService } from '@common/file/services/file.service';
import { ENUM_HELPER_FILE_EXCEL_TYPE } from '@common/helper/enums/helper.enum';
import { ENUM_FILE_MIME } from '@common/file/enums/file.enum';

@Injectable()
export class ResponseFileExcelInterceptor<T> implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly fileService: FileService,
        private readonly helperService: HelperService
    ) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<Promise<StreamableFile>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (res: Promise<Response & IResponseFileExcel<T>>) => {
                    const ctx: HttpArgumentsHost = context.switchToHttp();
                    const response: Response = ctx.getResponse();

                    const type: ENUM_HELPER_FILE_EXCEL_TYPE =
                        this.reflector.get<ENUM_HELPER_FILE_EXCEL_TYPE>(
                            RESPONSE_FILE_EXCEL_TYPE_META_KEY,
                            context.getHandler()
                        );

                    // set default response
                    const responseData = (await res) as Response &
                        IResponseFileExcel<T>;

                    if (!responseData) {
                        throw new Error(
                            'ResponseFileExcel must instanceof IResponseFileExcel'
                        );
                    } else if (
                        !responseData.data ||
                        !Array.isArray(responseData.data)
                    ) {
                        throw new Error('Field data must in array');
                    }

                    const today = this.helperService.dateCreate();
                    const timestamp =
                        this.helperService.dateGetTimestamp(today);

                    if (type === ENUM_HELPER_FILE_EXCEL_TYPE.XLSX) {
                        // create file
                        const file: Buffer = this.fileService.writeExcel(
                            responseData.data
                        );

                        // set headers
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
                    const file: Buffer = this.fileService.writeCsv(
                        responseData.data[0]
                    );

                    // set headers
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
