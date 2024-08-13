import {
    BadRequestException,
    Inject,
    Injectable,
    PipeTransform,
    Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';

@Injectable({ scope: Scope.REQUEST })
export class UserNotSelfPipe implements PipeTransform {
    constructor(@Inject(REQUEST) protected readonly request: IRequestApp) {}

    async transform(value: string): Promise<string> {
        const { user } = this.request;
        if (
            user._id === value &&
            user.type !== ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN
        ) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_SELF,
                message: 'user.error.notSelf',
            });
        }

        return value;
    }
}
