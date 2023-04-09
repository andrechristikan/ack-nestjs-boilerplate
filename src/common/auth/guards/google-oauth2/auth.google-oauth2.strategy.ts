import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { config } from 'dotenv';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGoogleOAuth2Scope } from 'src/common/auth/constants/auth.constant';
config();
@Injectable()
export class AuthGoogleOAuth2Strategy extends PassportStrategy(
    Strategy,
    'google'
) {
    constructor(private readonly configService: ConfigService) {
        super({
            clientID: configService.get<string>('auth.googleOAuth2.clientId'),
            clientSecret: configService.get<string>(
                'auth.googleOAuth2.clientSecret'
            ),
            callbackURL: configService.get<string>(
                'auth.googleOAuth2.callbackUrl'
            ),
            scope: AuthGoogleOAuth2Scope,
        });
    }
    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback
    ): Promise<any> {
        const { name, emails } = profile;
        const user = {
            email: emails[0].value,
            firstName: name.givenName,
            lastName: name.familyName,
        };

        done(null, user);
    }
}
