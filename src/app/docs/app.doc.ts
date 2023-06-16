import { applyDecorators } from '@nestjs/common';
import { AppHelloSerialization } from 'src/app/serializations/app.hello.serialization';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';

export function AppHelloDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'hello',
        }),
        DocResponse<AppHelloSerialization>('app.hello', {
            serialization: AppHelloSerialization,
        })
    );
}

export function AppHelloApiKeyDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'hello',
        }),
        DocAuth({ apiKey: true }),
        DocGuard({ timestamp: true, userAgent: true }),
        DocResponse<AppHelloSerialization>('app.helloApiKey', {
            serialization: AppHelloSerialization,
        })
    );
}
