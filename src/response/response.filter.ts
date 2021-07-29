import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';

// Restructure Response Object For Guard Exception
@Catch()
export class ResponseFilter implements ExceptionFilter {
    constructor(@Message() private readonly messageService: MessageService) {}

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const responseHttp: any = ctx.getResponse();

        if (exception instanceof HttpException) {
            const statusHttp: number = exception.getStatus();
            const response: any = exception.getResponse();
            const { errors, message } = response;

            response.status(statusHttp).json({
                statusCode: statusHttp,
                message,
                errors
            });
        } else {
            // if error is not http cause
            const statusHttp: number = HttpStatus.INTERNAL_SERVER_ERROR;
            const message: string = this.messageService.get(
                'http.serverError.internalServerError'
            );

            responseHttp.status(statusHttp).json({
                statusCode: statusHttp,
                message: message
            });
        }
    }
}
