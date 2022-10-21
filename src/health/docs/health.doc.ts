import { applyDecorators } from '@nestjs/common';
import { Doc } from 'src/common/doc/decorators/doc.decorator';
import { HealthSerialization } from 'src/health/serializations/health.serialization';

export function HealthCheckDoc(): any {
    return applyDecorators(
        Doc<HealthSerialization>('health.check', {
            auth: {
                jwtAccessToken: false,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            response: { classSerialization: HealthSerialization },
        })
    );
}
