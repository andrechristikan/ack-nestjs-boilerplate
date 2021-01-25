import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Helper } from 'helper/helper.decorator';
import { HelperService } from 'helper/helper.service';
import { UserEntity } from 'user/user.schema';
import { UserService } from 'user/user.service';
import { IPayload } from 'auth/auth.interface';

@Injectable()
export class AuthService {
    constructor(
        @Helper() private readonly helperService: HelperService,
        private readonly userService: UserService,
        private readonly jwtService: JwtService
    ) {}

    async createAccessToken(payload: IPayload): Promise<string> {
        return new Promise((resolve) => {
            const accessToken = this.jwtService.sign(payload);
            resolve(accessToken);
        });
    }

    async validateUser(
        email: string,
        passwordString: string
    ): Promise<boolean> {
        const user: UserEntity = await this.userService.findOneByEmail(email);
        const hashPassword: string = await this.helperService.hashPassword(
            passwordString,
            user.salt
        );

        return new Promise((resolve, reject) => {
            if (user.password !== hashPassword) {
                reject(false);
            }

            resolve(true);
        });
    }
}
