import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { HealthAwsResponseDto } from '@modules/health/dtos/response/health.aws.response.dto';
import { HealthDatabaseResponseDto } from '@modules/health/dtos/response/health.database.response.dto';
import { HealthInstanceResponseDto } from '@modules/health/dtos/response/health.instance.response.dto';
import { HealthThirdPartyResponseDto } from '@modules/health/dtos/response/health.sentry.response.dto';

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

export function HealthSystemCheckThirdPartyDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'health check api for third party services',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse<HealthThirdPartyResponseDto>('health.checkThirdParty', {
            dto: HealthThirdPartyResponseDto,
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
