import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ENUM_USER_STATUS } from 'src/modules/user/enums/user.enum';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
@Injectable()
export class UserStatusPipe implements PipeTransform {
    private readonly status: ENUM_USER_STATUS[];

    constructor(status: ENUM_USER_STATUS[]) {
        this.status = status;
    }

    async transform(value: UserDoc): Promise<UserDoc> {
        if (!this.status.includes(value.status)) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.STATUS_INVALID,
                message: 'user.error.statusInvalid',
            });
        }

        return value;
    }
}
