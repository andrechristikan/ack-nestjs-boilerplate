import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import {
    USER_ACTIVE_META_KEY,
    USER_BLOCKED_META_KEY,
    USER_INACTIVE_PERMANENT_META_KEY,
} from 'src/modules/user/constants/user.constant';
import { UserActiveGuard } from 'src/modules/user/guards/user.active.guard';
import { UserBlockedGuard } from 'src/modules/user/guards/user.blocked.guard';
import { UserInactivePermanentGuard } from 'src/modules/user/guards/user.inactive-permanent.guard';

export function UserAuthProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(
            UserBlockedGuard,
            UserInactivePermanentGuard,
            UserActiveGuard
        ),
        SetMetadata(USER_INACTIVE_PERMANENT_META_KEY, [false]),
        SetMetadata(USER_BLOCKED_META_KEY, [false]),
        SetMetadata(USER_ACTIVE_META_KEY, [true])
    );
}
