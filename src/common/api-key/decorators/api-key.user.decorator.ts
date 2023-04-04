import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { API_KEY_ACTIVE_META_KEY } from 'src/common/api-key/constants/api-key.constant';
import { ApiKeyActiveGuard } from 'src/common/api-key/guards/api-key.active.guard';
import { ApiKeyExpiredGuard } from 'src/common/api-key/guards/api-key.expired.guard';
import { ApiKeyNotFoundGuard } from 'src/common/api-key/guards/api-key.not-found.guard';
import { ApiKeyPayloadPutToRequestGuard } from 'src/common/api-key/guards/payload/api-key.put-to-request.guard';

export function ApiKeyUserGetGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(ApiKeyPayloadPutToRequestGuard, ApiKeyNotFoundGuard)
    );
}

export function ApiKeyUserUpdateGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(
            ApiKeyPayloadPutToRequestGuard,
            ApiKeyNotFoundGuard,
            ApiKeyActiveGuard,
            ApiKeyExpiredGuard
        ),
        SetMetadata(API_KEY_ACTIVE_META_KEY, [true])
    );
}

export function ApiKeyUserUpdateResetGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(
            ApiKeyPayloadPutToRequestGuard,
            ApiKeyNotFoundGuard,
            ApiKeyActiveGuard,
            ApiKeyExpiredGuard
        ),
        SetMetadata(API_KEY_ACTIVE_META_KEY, [true])
    );
}
