import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { IPayload, IPayloadBasicToken } from 'src/auth/auth.interface';
import { HashService } from 'src/hash/hash.service';
import { Hash } from 'src/hash/hash.decorator';
import { UserEntity } from 'src/user/user.schema';

@Injectable()
export class AuthService {
    constructor(
        @Hash() private readonly hashService: HashService,
        private readonly userService: UserService,
        private readonly jwtService: JwtService
    ) {}

    async createAccessToken(
        payload: IPayload | IPayloadBasicToken
    ): Promise<string> {
        return this.jwtService.sign(payload);
    }

    async validateUser(
        email: string,
        passwordString: string
    ): Promise<boolean> {
        const user: UserEntity = await this.userService.findOneByEmail(email);
        return this.hashService.validatePassword(passwordString, user.password);
    }
}
