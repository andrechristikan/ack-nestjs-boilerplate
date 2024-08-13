import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { HelloResponseDto } from 'src/modules/hello/dtos/response/hello.response.dto';

export function HelloDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'hello test api',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse<HelloResponseDto>('app.hello', {
            dto: HelloResponseDto,
        })
    );
}
