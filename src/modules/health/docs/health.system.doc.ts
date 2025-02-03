import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { HealthAwsResponseDto } from 'src/modules/health/dtos/response/health.aws.response.dto';
import { HealthDatabaseResponseDto } from 'src/modules/health/dtos/response/health.database.response.dto';
import { HealthInstanceResponseDto } from 'src/modules/health/dtos/response/health.instance.response.dto';

export function HealthSystemCheckAwsDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'health check api for aws',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse<HealthAwsResponseDto>('health.checkAws', {
            dto: HealthAwsResponseDto,
        })
    );
}

export function HealthSystemCheckDatabaseDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'health check api for database',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse<HealthDatabaseResponseDto>('health.checkDatabase', {
            dto: HealthDatabaseResponseDto,
        })
    );
}

export function HealthSystemCheckInstanceDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'health check api for instance',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse<HealthInstanceResponseDto>('health.checkInstance', {
            dto: HealthInstanceResponseDto,
        })
    );
}
