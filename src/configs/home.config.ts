import { registerAs } from '@nestjs/config';

export interface IConfigHome {
    name: string;
    url: string;
}

export default registerAs('home', (): IConfigHome => {
    return {
        name: process.env.HOME_NAME!,
        url: process.env.HOME_URL!,
    };
});
