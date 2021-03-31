import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Message } from 'src/message/message.decorator';
import { IErrors } from 'src/message/message.interface';
import { MessageService } from 'src/message/message.service';

@Catch()
export class ResponseFilter implements ExceptionFilter {
    constructor(@Message() private readonly messageService: MessageService) {}

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: any = ctx.getResponse();

        if (exception instanceof HttpException) {
            const status: number = exception.getStatus();
            const exceptionHttp: Record<string, any> = exception;
            const exceptionData: Record<string, any> = exceptionHttp.response;
            const errors: IErrors[] = exceptionData.errors;
            const message: string = exceptionData.message;

            response.status(status).json({
                statusCode: status,
                message,
                errors
            });
        } else {
            const status: number = HttpStatus.INTERNAL_SERVER_ERROR;
            const message: string = this.messageService.get(
                'http.serverError.internalServerError'
            );

            response.status(status).json({
                statusCode: status,
                message
            });
        }
    }
}