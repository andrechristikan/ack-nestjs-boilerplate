import { applyDecorators } from '@nestjs/common';
import { Doc, DocResponse } from 'src/common/doc/decorators/doc.decorator';
import { HelloResponseDto } from 'src/modules/hello/dtos/response/hello.response.dto';

export function HelloDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'hello test api',
        }),
        DocResponse<HelloResponseDto>('app.hello', {
            dto: HelloResponseDto,
        })
    );
}
