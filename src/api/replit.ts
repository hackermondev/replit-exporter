import axios, { AxiosInstance, AxiosResponse, CreateAxiosDefaults } from 'axios';
import { useRatelimitMiddleware } from '../axios/ratelimit';

import https from 'https';

const defaultConfig: CreateAxiosDefaults<any> = {
    baseURL: 'https://replit.com',
    httpsAgent: new https.Agent({ keepAlive: true }),
    headers: {
        'user-agent': 'Replit-Exporter (+https://github.com/hackermondev/replit-exporter)',

        // Replit API requires these headers
        'x-requested-with': 'XMLHttpRequest',
        referer: 'https://replit.com',
    },
};

export class ReplitClient {
    public rest: AxiosInstance;

    constructor(authorizationCookie: string, overrideConfig?: CreateAxiosDefaults<any>) {
        const config = {
            ...defaultConfig,
            ...overrideConfig,
        } as any;

        config.headers['cookie'] = `connect.sid=${authorizationCookie}`;

        this.rest = axios.create(config);
        useRatelimitMiddleware(this.rest);
    }

    public async graphql<T>(
        operationName: string,
        variables: { [key: string]: any },
        query: string,
    ): Promise<AxiosResponse<GraphqlResponse<T>>> {
        return await this.rest.post(
            '/graphql',
            {
                operationName,
                variables,
                query,
            },
            { validateStatus: (status) => status >= 200 && status <= 499 },
        );
    }
}

export interface GraphqlResponse<T> {
    errors?: Array<{ [key: string]: string }>;
    data?: T;
}
