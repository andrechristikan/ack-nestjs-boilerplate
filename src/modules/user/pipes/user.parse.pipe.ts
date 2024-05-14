import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';

@Injectable()
export class UserParsePipe implements PipeTransform {
    constructor(private readonly userService: UserService) {}

    async transform(value: any): Promise<UserDoc> {
        const user: UserDoc = await this.userService.findOneById(value);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND_ERROR,
                message: 'user.error.notFound',
            });
        }

        return user;
    }
}
