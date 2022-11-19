import { applyDecorators } from '@nestjs/common';
import { AppHelloSerialization } from 'src/app/serializations/app.hello.serialization';
import { Doc } from 'src/common/doc/decorators/doc.decorator';

export function AppHelloDoc(): MethodDecorator {
    return applyDecorators(
        Doc<AppHelloSerialization>('app.hello', {
            response: {
                classSerialization: AppHelloSerialization,
            },
        })
    );
}

export function AppHelloApiKeyDoc(): MethodDecorator {
    return applyDecorators(
        Doc<AppHelloSerialization>('app.helloApiKey', {
            auth: {
                apiKey: true,
            },
            requestHeader: {
                timestamp: true,
                userAgent: true,
            },
            response: {
                classSerialization: AppHelloSerialization,
            },
        })
    );
}
