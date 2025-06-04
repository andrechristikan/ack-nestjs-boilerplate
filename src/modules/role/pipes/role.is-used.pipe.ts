import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ENUM_ROLE_STATUS_CODE_ERROR } from '@module/role/enums/role.status-code.enum';
import { RoleDoc } from '@module/role/repository/entities/role.entity';
import { UserService } from '@module/user/services/user.service';

@Injectable()
export class RoleIsUsedPipe implements PipeTransform {
    constructor(private readonly userService: UserService) {}

    async transform(value: RoleDoc): Promise<RoleDoc> {
        const exist = await this.userService.existByRole(value._id);
        if (exist) {
            throw new BadRequestException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.USED,
                message: 'role.error.used',
            });
        }

        return value;
    }
}
