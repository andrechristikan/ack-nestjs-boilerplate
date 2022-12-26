import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { API_KEY_ACTIVE_META_KEY } from 'src/common/api-key/constants/api-key.constant';
import { ApiKeyActiveGuard } from 'src/common/api-key/guards/api-key.active.guard';
import { ApiKeyNotFoundGuard } from 'src/common/api-key/guards/api-key.not-found.guard';
import { ApiKeyPutToRequestGuard } from 'src/common/api-key/guards/api-key.put-to-request.guard';

export function ApiKeyGetGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(ApiKeyPutToRequestGuard, ApiKeyNotFoundGuard)
    );
}

export function ApiKeyUpdateResetGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(
            ApiKeyPutToRequestGuard,
            ApiKeyNotFoundGuard,
            ApiKeyActiveGuard
        ),
        SetMetadata(API_KEY_ACTIVE_META_KEY, [true])
    );
}

export function ApiKeyUpdateActiveGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(
            ApiKeyPutToRequestGuard,
            ApiKeyNotFoundGuard,
            ApiKeyActiveGuard
        ),
        SetMetadata(API_KEY_ACTIVE_META_KEY, [false])
    );
}

export function ApiKeyUpdateInactiveGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(
            ApiKeyPutToRequestGuard,
            ApiKeyNotFoundGuard,
            ApiKeyActiveGuard
        ),
        SetMetadata(API_KEY_ACTIVE_META_KEY, [true])
    );
}
