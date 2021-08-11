import { SetMetadata } from '@nestjs/common';
import { IApplyDecorator } from 'src/auth/auth.interface';
import { PERMISSION_LIST, PERMISSION_META_KEY } from './permission.constant';
import { Inject } from '@nestjs/common';

export const Permissions = (
    ...permissions: PERMISSION_LIST[]
): IApplyDecorator => SetMetadata(PERMISSION_META_KEY, permissions);
