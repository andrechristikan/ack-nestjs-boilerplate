import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { HealthResponseDto } from 'src/modules/health/dtos/response/health.response.dto';

export function HealthSystemCheckDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'health check api',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse<HealthResponseDto>('health.check', {
            dto: HealthResponseDto,
        })
    );
}
