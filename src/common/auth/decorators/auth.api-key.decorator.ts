import {
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
} from '@nestjs/common';
import { IAuthApiPayload } from '../auth.interface';
import { AUTH_EXCLUDE_API_KEY_META_KEY } from '../constants/auth.constant';

export const ApiKey = createParamDecorator(
    (data: string, ctx: ExecutionContext): IAuthApiPayload => {
        const { apiKey } = ctx.switchToHttp().getRequest();
        return data ? apiKey[data] : apiKey;
    }
);

export const AuthExcludeApiKey = () =>
    SetMetadata(AUTH_EXCLUDE_API_KEY_META_KEY, true);
