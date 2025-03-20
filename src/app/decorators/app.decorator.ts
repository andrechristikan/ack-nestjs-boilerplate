import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { APP_ENV_META_KEY } from 'src/app/constants/app.constant';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';
import { AppEnvGuard } from 'src/app/guards/app.env.guard';

export function AppEnvProtected(
    ...envs: ENUM_APP_ENVIRONMENT[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(AppEnvGuard),
        SetMetadata(APP_ENV_META_KEY, envs)
    );
}
