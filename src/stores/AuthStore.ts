import router from '@/routers';
import { apiClient } from '@/services/apiClient';
import type { Token } from '@/types/token';
import {
    clearToken,
    fetchUserFavorites,
    hasToken,
    saveTokens,
} from '@/utils/authClient';
import type { AxiosResponse } from 'axios';
import { defineStore } from 'pinia';

interface DefaultUserState {
    user_id: number;
    username: string;
}

interface LoginResponse extends Token {
    user_id: number;
    username: string;
}

const defaultUserState: DefaultUserState = {
    user_id: -1,
    username: '',
};

export const useAuthStore = defineStore({
    id: 'auth',

    state: () => ({
        user: { ...defaultUserState },
        isAuthenticated: hasToken(),
        isInitialized: false,
        favorites: [],
    }),

    actions: {
        async setData() {
            const userData = localStorage.getItem('diginomad_user');

            if (userData) {
                const data = JSON.parse(userData);
                this.user = Object.assign({}, defaultUserState, data);

                const tokens = localStorage.getItem('diginomad_tokens');

                if (tokens) {
                    const tokensObject = JSON.parse(tokens) as Token;

                    if (this.favorites.length === 0) {
                        const favoritesList = await fetchUserFavorites(
                            this.user.user_id,
                            tokensObject.access_token
                        );

                        this.favorites = favoritesList.favorites;
                    }
                }
            }
        },

        // Initialize user if authenticated
        async initialize() {
            try {
                if (this.isAuthenticated) {
                    this.setData();
                }

                this.isInitialized = true;
            } catch (error) {
                console.error(error);
            }
        },

        // Remove data from state
        clearData() {
            this.user = Object.assign({}, defaultUserState);
            this.favorites = [];
            localStorage.removeItem('diginomad_user');
        },

        async login(username: string, password: string) {
            try {
                const response: AxiosResponse = await apiClient.post(
                    '/auth/login',
                    {
                        username: username,
                        password: password,
                    }
                );

                if (response.status === 200) {
                    const loginResponse: LoginResponse = response.data;

                    saveTokens(loginResponse);

                    localStorage.setItem(
                        'diginomad_user',
                        JSON.stringify({
                            user_id: loginResponse.user_id,
                            username: loginResponse.username,
                        })
                    );

                    this.setData();
                    this.isAuthenticated = true;
                }

                console.log(response);
            } catch (err) {
                console.error(err);
            }
        },

        logout() {
            this.isAuthenticated = false;

            this.clearData();
            clearToken();

            router.push('/');
        },
    },
});