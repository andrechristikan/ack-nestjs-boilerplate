import { applyDecorators } from '@nestjs/common';
import { Doc, DocResponse } from '@common/doc/decorators/doc.decorator';
import {
    HelloResponseDto,
    HelloResponseSchema,
} from '@modules/hello/dtos/response/hello.response.dto';

export function HelloPublicDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'hello test api',
        }),
        DocResponse<HelloResponseDto>('app.hello', {
            schema: HelloResponseSchema,
        })
    );
}
