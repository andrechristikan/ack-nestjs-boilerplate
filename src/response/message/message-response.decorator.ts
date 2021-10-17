import { applyDecorators, UseFilters, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { IAuthApplyDecorator } from 'src/auth/auth.interface';
import { MessageResponseFilter } from './message-response.filter';

export function MessageResponse(messagePath: string): IAuthApplyDecorator {
    return applyDecorators(
        UseInterceptors(MessagePattern(messagePath)),
        UseFilters(MessageResponseFilter)
    );
}
