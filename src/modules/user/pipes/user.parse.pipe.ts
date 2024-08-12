import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';

@Injectable()
export class UserParsePipe implements PipeTransform {
    constructor(private readonly userService: UserService) {}

    async transform(value: string): Promise<UserDoc> {
        const user: UserDoc = await this.userService.findOneById(value);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        return user;
    }
}

@Injectable()
export class UserActiveParsePipe implements PipeTransform {
    constructor(private readonly userService: UserService) {}

    async transform(value: string): Promise<IUserDoc> {
        const user =
            await this.userService.findOneWithRoleAndCountryById(value);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        return user;
    }
}
