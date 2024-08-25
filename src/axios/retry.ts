// Axios middleware to retry requests at least once
import { AxiosInstance } from 'axios';

export const useRetryMiddleware = (axiosInstance: AxiosInstance) => {
    axiosInstance.interceptors.response.use(
        (response) => {
            // If the response is successful, just return it
            return response;
        },
        async (error) => {
            const { config, response } = error;

            // Check if the error is retryable (i.e., not 429)
            if (response && response.status !== 429) {
                const retryCount = config._retry || 0;
                if (retryCount <= 5) {
                    config._retry = retryCount + 1;
                    console.log(
                        `Retrying request to ${config.url}(${retryCount}), recieved status code ${response.status}`,
                    );

                    await new Promise((resolve) => setTimeout(resolve, 500 * retryCount));

                    // Retry the request
                    return axiosInstance(config);
                }
            }

            // If it's a 429 or has already been retried, reject the promise with the error
            return Promise.reject(error);
        },
    );
};
