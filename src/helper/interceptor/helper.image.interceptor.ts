import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler
} from '@nestjs/common';
import { Debugger } from 'src/debugger/debugger.decorator';
import { Logger as DebuggerService } from 'winston';
import { Observable } from 'rxjs';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { ConfigService } from '@nestjs/config';
import { ENUM_HELPER_IMAGE } from '../helper.constant';
import { CustomHttpException } from 'src/response/response.filter';
import { ENUM_RESPONSE_STATUS_CODE } from 'src/response/response.constant';

@Injectable()
export class HelperImageInterceptor implements NestInterceptor {
    constructor(
        @Message() private readonly messageService: MessageService,
        @Debugger() private readonly debuggerService: DebuggerService,
        private readonly configService: ConfigService
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        const ctx: HttpArgumentsHost = context.switchToHttp();
        const { file } = ctx.getRequest();

        if (!file) {
            throw new CustomHttpException(
                ENUM_RESPONSE_STATUS_CODE.HELPER_IMAGE_NEEDED_ERROR
            );
        }

        const { size, mimetype } = file;
        const mime = (mimetype as string)
            .replace('image/', '')
            .toLocaleUpperCase();

        const maxSize = this.configService.get<number>('helper.image.maxSize');
        if (size > maxSize) {
            throw new CustomHttpException(
                ENUM_RESPONSE_STATUS_CODE.HELPER_IMAGE_MAX_SIZE_ERROR
            );
        } else if (!ENUM_HELPER_IMAGE[mime.toUpperCase()]) {
            throw new CustomHttpException(
                ENUM_RESPONSE_STATUS_CODE.HELPER_IMAGE_EXTENSION_ERROR
            );
        }

        return next.handle();
    }
}
