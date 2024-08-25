import { WriteStream } from 'fs';
import { trace } from '../logger';
import { ReplitClient } from './replit';

export interface ExporterState {
    pageInfo?: PageInfo;
    user?: number;
}

export interface ExporterConfig {
    rest: {
        authorization: string;
        config?: any;
    };
    state?: ExporterState;
}

declare global {
    interface Error {
        response?: Array<{ [key: string]: string }>;
    }
}

export class Exporter {
    public state: ExporterState;
    private client: ReplitClient;

    constructor(config: ExporterConfig) {
        this.state = config.state || {};
        this.client = new ReplitClient(config.rest.authorization, config.rest.config);
    }

    public async getNextRepls(count: number = 15): Promise<Array<Repl>> {
        const { data: response } = await this.client.graphql<SearchReplResult>(
            'ExportRepls',
            {
                search: '',
                after: this.state.pageInfo?.nextCursor,
                count,
            },
            query,
        );

        const errors = response.errors;
        if (errors && errors.length > 0) {
            const error = new Error('Cannot fetch user repls');
            error.response = errors;
            throw error;
        }

        if (!response.data?.currentUser) {
            throw new Error('Invalid authorization cookie');
        }

        trace('getNextRepls response', JSON.stringify(response.data));
        const data = response.data?.currentUser.exportRepls;
        const pageInfo = data?.pageInfo;
        const repls = data?.items;

        this.state.pageInfo = pageInfo;
        return repls || [];
    }

    public async bulkDownloadRepls(
        repls: Array<Repl>,
        streams: Array<WriteStream>,
    ): Promise<{ failed: Array<string> }> {
        const failed: Array<string> = [];
        await Promise.all(
            repls.map(async (repl, index) => {
                const stream = streams[index];
                await this.downloadRepl(repl, stream).catch((error) => {
                    console.warn(`${repl.slug} (${repl.id}) failed`, error);
                    failed.push(repl.id);
                });
            }),
        );

        return { failed };
    }

    public async getUser(): Promise<number> {
        const { data: response } = await this.client.graphql<CurrentUserResult>(
            'CurrentUser',
            {},
            queryCurrentUser,
        );
        const errors = response.errors;
        if (errors && errors.length > 0) {
            const error = new Error('Cannot fetch current user');
            error.response = errors;
            throw error;
        }

        if (!response.data?.currentUser) {
            throw new Error('Invalid authorization cookie');
        }

        return response.data.currentUser.id;
    }

    public async downloadRepl(repl: Repl, stream: WriteStream) {
        // Download
        const slugUrl = `https://replit.com/@${repl.user.username}/${repl.slug}`;
        const zipUrl = `${slugUrl}.zip`;
        const download = await this.client.rest.get(zipUrl, { responseType: 'stream' });
        const contentType = download.headers['content-type'];
        if (contentType != 'application/zip') {
            throw new Error(`Invalid content type, should be application/zip, got ${contentType}`);
        }

        download.data.pipe(stream);

        await new Promise((resolve, reject) => {
            stream.once('finish', resolve);
            stream.once('error', reject);

            if (stream.errored) reject(new Error('Stream errored'));
            else if (stream.closed) resolve(1);
        });
    }
}

export interface PageInfo {
    hasNextPage: boolean;
    nextCursor?: string;
}

export interface Repl {
    id: string;
    title: string;
    isPrivate: boolean;
    slug: string;
    wasPublished: boolean;
    timeCreated: string;
    timeUpdated: string;
    user: {
        id: number;
        username: string;
    };
    config: {
        isServer: boolean;
        isExtension: boolean;
        gitRemoteUrl?: string;
        isVnc: boolean;
        doClone: boolean;
    };
    multiplayers: Array<{
        id: string;
        username: string;
    }>;
    domains: Array<{
        domain: string;
        state: string;
        hosting_deployment_id?: string;
    }>;
    isAlwaysOn: boolean;
    isBoosted: boolean;
}

interface CurrentUserResult {
    currentUser: {
        id: number;
    };
}

interface SearchReplResult {
    currentUser: {
        exportRepls: {
            items: Array<Repl>;
            pageInfo: PageInfo;
        };
    };
}

const queryCurrentUser = `query CurrentUser {
    currentUser {
        id
    }
}
`;

const query = `query ExportRepls($search: String!, $after: String, $count: Int) {
    currentUser {
      exportRepls: paginatedReplSearch(search: $search, after: $after, count: $count) {
        items {
          id
          title
          isPrivate
          slug
          wasPublished
          timeCreated
          timeUpdated
          user {
            id
            username
          }
          language
          config {
            isServer
            isExtension
            gitRemoteUrl
            isVnc
            doClone
          }
          multiplayers {
            id
            username
          }
          source {
            release {
              id
              description
              hostedUrl
              user {
                id
                username
              }
            }
            
            deployment {
              id
              domain
            }
          }
          domains {
            domain
            state
            hosting_deployment_id
          }
          isAlwaysOn
          isBoosted
        }

        pageInfo {
          hasNextPage
          nextCursor
        }
      }
    }
  }
`;
