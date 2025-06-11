import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { APP_ENV_META_KEY } from '@app/constants/app.constant';
import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { AppEnvGuard } from '@app/guards/app.env.guard';

export function AppEnvProtected(
    ...envs: ENUM_APP_ENVIRONMENT[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(AppEnvGuard),
        SetMetadata(APP_ENV_META_KEY, envs)
    );
}
