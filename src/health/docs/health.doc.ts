import { applyDecorators } from '@nestjs/common';
import { Doc } from 'src/common/doc/decorators/doc.decorator';
import { HealthSerialization } from 'src/health/serializations/health.serialization';

export function HealthCheckDoc(): MethodDecorator {
    return applyDecorators(
        Doc<HealthSerialization>('health.check', {
            auth: {
                jwtAccessToken: false,
            },
            response: { serialization: HealthSerialization },
        })
    );
}
