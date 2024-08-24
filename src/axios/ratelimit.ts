// Axios middleware to automatically retry 429 requests
import { AxiosInstance } from 'axios';

// Maximum retry-after duration in seconds (to avoid long delays)
const MAX_RETRY_AFTER = 60;

// Retry delay in seconds if 'retry-after' header is not present or exceeds MAX_RETRY_AFTER
const DEFAULT_RETRY_DELAY = 15;

export const useRatelimitMiddleware = (axios: AxiosInstance) => {
    axios.interceptors.response.use(
        (response) => {
            // If the response is successful, return it
            return response;
        },
        async (error) => {
            const { response, config } = error;

            // Check if the error is a 429 (Too Many Requests) response
            if (response && response.status === 429) {
                let retryAfter = parseInt(response.headers['retry-after'], 10);

                // Use the default retry delay if retry-after header is not present or is too long
                if (isNaN(retryAfter) || retryAfter > MAX_RETRY_AFTER) {
                    retryAfter = DEFAULT_RETRY_DELAY;
                }

                console.warn(
                    `${config.url} ratelimited, automatically retrying in ${retryAfter} seconds`,
                );

                // Wait for the specified retry delay
                await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));

                // Retry the request with the same config
                return axios(config);
            }

            // If the error is not a 429, reject it
            return Promise.reject(error);
        },
    );
};
