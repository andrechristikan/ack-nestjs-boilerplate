import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ENUM_USER_STATUS } from 'src/modules/user/constants/user.enum.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class UserStatusActivePipe implements PipeTransform {
    async transform(value: UserDoc): Promise<UserDoc> {
        if (value.status === ENUM_USER_STATUS.ACTIVE) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.STATUS_INVALID_ERROR,
                message: 'user.error.statusInvalid',
            });
        }

        return value;
    }
}

@Injectable()
export class UserStatusInactivePipe implements PipeTransform {
    async transform(value: UserDoc): Promise<UserDoc> {
        if (value.status === ENUM_USER_STATUS.ACTIVE) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.STATUS_INVALID_ERROR,
                message: 'user.error.statusInvalid',
            });
        }

        return value;
    }
}
