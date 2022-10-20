import { applyDecorators } from '@nestjs/common';
import { AppHelloSerialization } from 'src/app/serializations/app.hello.serialization';
import { Doc } from 'src/common/doc/decorators/doc.decorator';

export function AppHelloDoc(): any {
    return applyDecorators(
        Doc<AppHelloSerialization>('app.hello', {
            response: {
                classSerialization: AppHelloSerialization,
            },
        })
    );
}

export function AppHelloTimeoutDoc(): any {
    return applyDecorators(
        Doc<void>('app.helloTimeout', {
            responseVoid: true,
        })
    );
}
