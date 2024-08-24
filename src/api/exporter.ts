import { WriteStream } from 'fs';
import { ReplitClient } from './replit';

export interface ExporterState {
    pageInfo?: PageInfo;
}

export interface ExporterConfig {
    rest: {
        authorization: string;
        config?: any;
    };
    state?: ExporterState;
}

declare global {
    interface Error { response?: Array<{ [key: string]: string }>; }
}

export class Exporter {
    public state: ExporterState;
    private client: ReplitClient;

    constructor(config: ExporterConfig) {
        this.state = config.state || {};
        this.client = new ReplitClient(config.rest.authorization, config.rest.config);
    }

    public async getNextRepls(count: number = 15): Promise<Array<Repl>> {
        const { data: response } = await this.client.graphql<SearchReplResult>('ExportRepls', {
            search: '',
            after: this.state.pageInfo?.nextCursor,
            count,
        }, query);

        const errors = response.errors;
        if (errors && errors.length > 0) {
            const error = new Error('Cannot fetch user repls');
            error.response = errors;
            throw error;
        }

        const data = response.data?.currentUser.exportRepls;
        const pageInfo = data?.pageInfo;
        const repls = data?.items;

        this.state.pageInfo = pageInfo;
        return repls || [];
    }

    public async bulkDownloadRepls(repls: Array<Repl>, streams: Array<WriteStream>) {
        await Promise.all(repls.map(async (repl, index) => {
            const stream = streams[index];
            await this.downloadRepl(repl, stream);
        }));
    }

    public async downloadRepl(repl: Repl, stream: WriteStream) {
        // Find repl slug url
        const response = await this.client.rest.get(`/replid/${repl.id}`, { maxRedirects: 0, validateStatus: status => status >= 300 && status <= 399 });
        const slugUrl = response.headers['location'];

        // Download
        const zipUrl = `${slugUrl}.zip`;
        const download = await this.client.rest.get(zipUrl, { responseType: 'stream' });
        download.data.pipe(stream);
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

export interface SearchReplResult {
    currentUser: {
        exportRepls: {
            items: Array<Repl>;
            pageInfo: PageInfo;
        }
    }
}

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