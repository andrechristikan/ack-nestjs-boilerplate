import { SetMetadata } from '@nestjs/common';
import { IApplyDecorator } from 'src/auth/auth.interface';
import { PermissionList, PERMISSION_KEY } from './role.constant';

export const Permissions = (
    ...permissions: PermissionList[]
): IApplyDecorator => SetMetadata(PERMISSION_KEY, permissions);
