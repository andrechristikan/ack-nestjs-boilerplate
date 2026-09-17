import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { HealthAwsResponseSchema } from '@modules/health/dtos/response/health.aws.response.dto';
import type { HealthAwsResponseDto } from '@modules/health/dtos/response/health.aws.response.dto';
import { HealthDatabaseResponseSchema } from '@modules/health/dtos/response/health.database.response.dto';
import type { HealthDatabaseResponseDto } from '@modules/health/dtos/response/health.database.response.dto';
import { HealthInstanceResponseSchema } from '@modules/health/dtos/response/health.instance.response.dto';
import type { HealthInstanceResponseDto } from '@modules/health/dtos/response/health.instance.response.dto';
import { HealthThirdPartyResponseSchema } from '@modules/health/dtos/response/health.third-party.response.dto';
import type { HealthThirdPartyResponseDto } from '@modules/health/dtos/response/health.third-party.response.dto';

export function HealthSystemCheckAwsDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'health check api for aws',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse<HealthAwsResponseDto>('health.checkAws', {
            schema: HealthAwsResponseSchema,
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
            schema: HealthDatabaseResponseSchema,
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
            schema: HealthThirdPartyResponseSchema,
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
            schema: HealthInstanceResponseSchema,
        })
    );
}
