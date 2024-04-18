import { applyDecorators } from '@nestjs/common';
import { AppHelloDto } from 'src/app/dtos/response/app.hello.dto';
import { Doc, DocResponse } from 'src/common/doc/decorators/doc.decorator';

export function AppHelloDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'hello test api',
        }),
        DocResponse<AppHelloDto>('app.hello', {
            dto: AppHelloDto,
        })
    );
}
