import { SetMetadata } from '@nestjs/common';
import { IApplyDecorator } from 'src/auth/auth.interface';
import { PermissionList, PERMISSION_META_KEY } from './permission.constant';
import { Inject } from '@nestjs/common';

export const Permissions = (
    ...permissions: PermissionList[]
): IApplyDecorator => SetMetadata(PERMISSION_META_KEY, permissions);
