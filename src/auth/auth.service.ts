import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from 'user/user.schema';
import { UserService } from 'user/user.service';
import { IPayload, IPayloadBasicToken } from 'auth/auth.interface';
import { HashService } from 'hash/hash.service';
import { Hash } from 'hash/hash.decorator';
import { IUser } from 'user/user.interface';

@Injectable()
export class AuthService {
    constructor(
        @Hash() private readonly hashService: HashService,
        private readonly userService: UserService,
        private readonly jwtService: JwtService
    ) {}

    async createAccessToken(payload: IPayload | IPayloadBasicToken): Promise<string> {
        return new Promise((resolve) => {
            const accessToken = this.jwtService.sign(payload);
            resolve(accessToken);
        });
    }

    async validateUser(
        email: string,
        passwordString: string
    ): Promise<boolean> {
        const user: IUser = await this.userService.findOneByEmail(email);
        const hashPassword: string = await this.hashService.hashPassword(
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
