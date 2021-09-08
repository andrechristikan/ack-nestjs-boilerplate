import { SetMetadata } from '@nestjs/common';
import { IAuthApplyDecorator } from 'src/auth/auth.interface';
import { ENUM_PERMISSIONS, PERMISSION_META_KEY } from './permission.constant';

export const Permissions = (
    ...permissions: ENUM_PERMISSIONS[]
): IAuthApplyDecorator => SetMetadata(PERMISSION_META_KEY, permissions);
