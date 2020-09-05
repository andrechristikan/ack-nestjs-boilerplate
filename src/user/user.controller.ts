import {
    BadRequestException,
    Controller,
    Param,
    Get,
    Post,
    Body,
    Delete,
} from '@nestjs/common';
import { UserService } from 'user/user.service';
import {
    UserFillableFields,
    UserFields,
    User,
    UserFullFields,
} from 'user/user.model';

@Controller('api/user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('/:id')
    async getById(@Param('id') id: string): Promise<UserFields> {
        const user: UserFullFields = (await this.userService.getById(
            id,
        )) as UserFullFields;
        if (!user) {
            throw new BadRequestException('User not found');
        }
        return this.userService.filterUserField(user);
    }

    @Post('/store')
    async store(@Body() userData: UserFillableFields): Promise<UserFields> {
        const exist = await this.userService.exist(userData.email, userData.mobileNumber);
        if(exist){
            throw new BadRequestException('User exist, try to use another email or mobile number');
        }

        const user: UserFullFields = (await this.userService.store(
            userData,
        )) as UserFullFields;
        return this.userService.filterUserField(user);
    }

    @Delete('/destroy/:id')
    async destroy(@Param('id') id: string): Promise<UserFields> {
        const user: UserFullFields = await this.userService.destroy(id) as UserFullFields;
        return this.userService.filterUserField(user);
    }
}
