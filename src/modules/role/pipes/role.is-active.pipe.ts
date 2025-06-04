import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ENUM_ROLE_STATUS_CODE_ERROR } from '@module/role/enums/role.status-code.enum';
import { RoleDoc } from '@module/role/repository/entities/role.entity';

@Injectable()
export class RoleIsActivePipe implements PipeTransform {
    private readonly isActive: boolean[];

    constructor(isActive: boolean[]) {
        this.isActive = isActive;
    }

    async transform(value: RoleDoc): Promise<RoleDoc> {
        if (!this.isActive.includes(value.isActive)) {
            throw new BadRequestException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.IS_ACTIVE,
                message: 'role.error.isActiveInvalid',
            });
        }

        return value;
    }
}
