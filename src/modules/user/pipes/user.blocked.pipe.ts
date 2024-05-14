import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class UserNotBlockedPipe implements PipeTransform {
    async transform(value: UserDoc): Promise<UserDoc> {
        if (value.blocked) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.BLOCKED_INVALID_ERROR,
                message: 'user.error.blockedInvalid',
            });
        }

        return value;
    }
}
