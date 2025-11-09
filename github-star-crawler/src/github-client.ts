import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { GitHubUser, GitHubAPIResponse, CrawlerConfig } from './types';

/**
 * GitHub API 客户端
 */
export class GitHubClient {
  private client: AxiosInstance;
  private config: CrawlerConfig;

  constructor(config: CrawlerConfig) {
    this.config = config;

    this.client = axios.create({
      baseURL: 'https://api.github.com',
      timeout: config.timeout,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': config.userAgent,
        ...(config.token && { Authorization: `token ${config.token}` }),
      },
    });

    // 添加请求拦截器用于日志记录
    if (config.verbose) {
      this.client.interceptors.request.use((request) => {
        console.log(`🔄 ${request.method?.toUpperCase()} ${request.url}`);
        return request;
      });
    }

    // 添加响应拦截器用于速率限制监控
    this.client.interceptors.response.use((response) => {
      const remaining = response.headers['x-ratelimit-remaining'];
      const limit = response.headers['x-ratelimit-limit'];

      if (this.config.verbose && remaining && limit) {
        console.log(`📊 Rate Limit: ${remaining}/${limit}`);
      }

      return response;
    });
  }

  /**
   * 获取仓库的所有 star 用户
   */
  async getStargazers(owner: string, repo: string): Promise<string[]> {
    const stargazers: string[] = [];
    let page = 1;
    const perPage = 100; // GitHub API 最大值

    console.log(`⭐ 获取 ${owner}/${repo} 的 star 用户列表...`);

    while (true) {
      try {
        const url = `/repos/${owner}/${repo}/stargazers`;
        const response = await this.client.get(url, {
          params: { page, per_page: perPage },
        });

        const users = response.data;
        if (users.length === 0) {
          break;
        }

        // 提取用户名
        const usernames = users.map((user: any) => user.login);
        stargazers.push(...usernames);

        console.log(`📄 已获取 ${stargazers.length} 个 star 用户`);

        // 检查是否还有更多页面
        const linkHeader = response.headers.link;
        if (!linkHeader || !linkHeader.includes('rel="next"')) {
          break;
        }

        page++;

        // 添加延迟以避免速率限制
        if (this.config.delay > 0) {
          await this.sleep(this.config.delay);
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          throw new Error(`仓库 ${owner}/${repo} 不存在或为私有仓库`);
        } else if (error.response?.status === 403) {
          const resetTime = error.response.headers['x-ratelimit-reset'];
          if (resetTime) {
            const waitTime = parseInt(resetTime) * 1000 - Date.now();
            if (waitTime > 0) {
              console.log(`⏰ 速率限制，等待 ${Math.ceil(waitTime / 1000)} 秒...`);
              await this.sleep(waitTime);
              continue;
            }
          }
        }
        throw error;
      }
    }

    return stargazers;
  }

  /**
   * 获取用户详细信息
   */
  async getUserInfo(username: string): Promise<GitHubUser | null> {
    try {
      const response: AxiosResponse<GitHubUser> = await this.client.get(`/users/${username}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn(`⚠️ 用户 ${username} 不存在`);
        return null;
      } else if (error.response?.status === 403) {
        const resetTime = error.response.headers['x-ratelimit-reset'];
        if (resetTime) {
          const waitTime = parseInt(resetTime) * 1000 - Date.now();
          if (waitTime > 0) {
            console.log(`⏰ 速率限制，等待 ${Math.ceil(waitTime / 1000)} 秒...`);
            await this.sleep(waitTime);
            return this.getUserInfo(username); // 重试
          }
        }
      }

      if (this.config.verbose) {
        console.warn(`⚠️ 获取用户 ${username} 信息失败:`, error.message);
      }
      return null;
    }
  }

  /**
   * 批量获取用户信息
   */
  async getBatchUserInfos(
    usernames: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<GitHubUser[]> {
    const users: GitHubUser[] = [];
    const total = usernames.length;

    console.log(`👥 开始获取 ${total} 个用户的详细信息...`);

    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i];
      const userInfo = await this.getUserInfo(username);

      if (userInfo) {
        users.push(userInfo);
      }

      // 更新进度
      if (onProgress && (i + 1) % 10 === 0) {
        onProgress(i + 1, total);
      }

      // 添加延迟
      if (this.config.delay > 0 && i < usernames.length - 1) {
        await this.sleep(this.config.delay);
      }
    }

    if (onProgress) {
      onProgress(total, total);
    }

    console.log(`✅ 成功获取 ${users.length} 个用户的详细信息`);
    return users;
  }

  /**
   * 获取当前速率限制状态
   */
  async getRateLimit(): Promise<{ remaining: number; limit: number; reset: number }> {
    try {
      const response = await this.client.get('/rate_limit');
      const core = response.data.resources.core;
      return {
        remaining: core.remaining,
        limit: core.limit,
        reset: core.reset,
      };
    } catch (error) {
      return { remaining: 0, limit: 0, reset: 0 };
    }
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
