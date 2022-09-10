import {
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
} from '@nestjs/common';
import { AUTH_EXCLUDE_API_KEY_META_KEY } from 'src/common/auth/constants/auth.constant';
import { IAuthApiPayload } from 'src/common/auth/interfaces/auth.interface';

export const ApiKey = createParamDecorator(
    (data: string, ctx: ExecutionContext): IAuthApiPayload => {
        const { apiKey } = ctx.switchToHttp().getRequest();
        return data ? apiKey[data] : apiKey;
    }
);

export const AuthExcludeApiKey = () =>
    SetMetadata(AUTH_EXCLUDE_API_KEY_META_KEY, true);
