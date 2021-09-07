import { SetMetadata } from '@nestjs/common';
import { IApplyDecorator } from 'src/auth/auth.interface';
import { ENUM_PERMISSIONS, PERMISSION_META_KEY } from './permission.constant';
import { Inject } from '@nestjs/common';

export const Permissions = (
    ...permissions: ENUM_PERMISSIONS[]
): IApplyDecorator => SetMetadata(PERMISSION_META_KEY, permissions);
