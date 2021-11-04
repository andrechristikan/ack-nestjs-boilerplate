import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    UnprocessableEntityException,
    PayloadTooLargeException,
    UnsupportedMediaTypeException
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import {
    ENUM_HELPER_IMAGE,
    ENUM_HELPER_STATUS_CODE_ERROR
} from '../helper.constant';

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
            throw new UnprocessableEntityException({
                statusCode:
                    ENUM_HELPER_STATUS_CODE_ERROR.HELPER_IMAGE_NEEDED_ERROR,
                message: 'helper.error.imageNotFound'
            });
        }

        const { size, mimetype } = file;
        const mime = (mimetype as string)
            .replace('image/', '')
            .toLocaleUpperCase();

        const maxSize = this.configService.get<number>('helper.image.maxSize');
        if (size > maxSize) {
            throw new PayloadTooLargeException({
                statusCode:
                    ENUM_HELPER_STATUS_CODE_ERROR.HELPER_IMAGE_MAX_SIZE_ERROR,
                message: 'helper.error.imageMaxSize'
            });
        } else if (!ENUM_HELPER_IMAGE[mime.toUpperCase()]) {
            throw new UnsupportedMediaTypeException({
                statusCode:
                    ENUM_HELPER_STATUS_CODE_ERROR.HELPER_IMAGE_EXTENSION_ERROR,
                message: 'helper.error.imageMimeInvalid'
            });
        }

        return next.handle();
    }
}
