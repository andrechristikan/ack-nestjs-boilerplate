import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { POLICY_META_KEY } from 'src/common/policy/constants/policy.constant';
import { PolicyGuard } from 'src/common/policy/guards/policy.guard';
import { IPolicy } from 'src/common/policy/interfaces/policy.interface';

export function PolicyProtected(...handlers: IPolicy[]): MethodDecorator {
    return applyDecorators(
        UseGuards(PolicyGuard),
        SetMetadata(POLICY_META_KEY, handlers)
    );
}
