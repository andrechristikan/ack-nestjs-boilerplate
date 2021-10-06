import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    UnprocessableEntityException
} from '@nestjs/common';
import { Debugger } from 'src/debugger/debugger.decorator';
import { Logger as DebuggerService } from 'winston';
import { Observable } from 'rxjs';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { HelperImageValidation } from '../validator/helper.image.validator';
import { validate } from 'class-validator';
import { IErrors } from 'src/message/message.interface';

@Injectable()
export class HelperImageInterceptor implements NestInterceptor {
    constructor(
        @Message() private readonly messageService: MessageService,
        @Debugger() private readonly debuggerService: DebuggerService
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        const ctx: HttpArgumentsHost = context.switchToHttp();
        const { file } = ctx.getRequest();

        const { size, mimetype } = file;
        const mime = (mimetype as string)
            .replace('image/', '')
            .toLocaleUpperCase();

        const validator = new HelperImageValidation();
        validator.mime = mime;
        validator.size = size;

        const rawErrors: Record<string, any>[] = await validate(validator);
        if (rawErrors.length > 0) {
            const errors: IErrors[] = this.messageService.getRequestErrorsMessage(
                rawErrors
            );

            this.debuggerService.error('Request File Errors', {
                class: 'HelperImageInterceptor',
                function: 'intercept',
                errors
            });

            throw new UnprocessableEntityException(
                errors,
                this.messageService.get('http.clientError.badRequest')
            );
        }

        return next.handle();
    }
}
