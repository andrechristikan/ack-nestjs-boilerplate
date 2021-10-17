import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import { ENUM_HELPER_IMAGE } from '../helper.constant';
import { ErrorHttpException } from 'src/error/filter/error.http.filter';
import { ENUM_ERROR_STATUS_CODE } from 'src/error/error.constant';

@Injectable()
export class HelperImageInterceptor implements NestInterceptor {
    constructor(private readonly configService: ConfigService) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        const ctx: HttpArgumentsHost = context.switchToHttp();
        const { file } = ctx.getRequest();

        if (!file) {
            throw new ErrorHttpException(
                ENUM_ERROR_STATUS_CODE.HELPER_IMAGE_NEEDED_ERROR
            );
        }

        const { size, mimetype } = file;
        const mime = (mimetype as string)
            .replace('image/', '')
            .toLocaleUpperCase();

        const maxSize = this.configService.get<number>('helper.image.maxSize');
        if (size > maxSize) {
            throw new ErrorHttpException(
                ENUM_ERROR_STATUS_CODE.HELPER_IMAGE_MAX_SIZE_ERROR
            );
        } else if (!ENUM_HELPER_IMAGE[mime.toUpperCase()]) {
            throw new ErrorHttpException(
                ENUM_ERROR_STATUS_CODE.HELPER_IMAGE_EXTENSION_ERROR
            );
        }

        return next.handle();
    }
}
