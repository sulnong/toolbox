/**
 * GitHub 用户信息接口
 */
export interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  email: string | null;
  company: string | null;
  location: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

/**
 * Star 用户信息
 */
export interface StargazerUser {
  username: string;
  name: string | null;
  email: string | null;
  company: string | null;
  location: string | null;
  followers: number;
  following: number;
}

/**
 * GitHub API 响应接口
 */
export interface GitHubAPIResponse<T> {
  data: T;
  status: number;
  headers: {
    'x-ratelimit-remaining': string;
    'x-ratelimit-limit': string;
    'x-ratelimit-reset': string;
    link?: string;
  };
}

/**
 * 爬虫配置接口
 */
export interface CrawlerConfig {
  token?: string;
  delay: number;
  maxRetries: number;
  timeout: number;
  userAgent: string;
  verbose?: boolean;
}

/**
 * 输出选项接口
 */
export interface OutputOptions {
  format: 'csv' | 'json';
  output?: string;
  statsOnly: boolean;
  verbose: boolean;
}

/**
 * 统计信息接口
 */
export interface CrawlerStats {
  repository: string;
  totalStargazers: number;
  usersWithEmail: number;
  processingTime: number;
  rateLimitRemaining: number;
  errors: number;
}

/**
 * 爬虫结果接口
 */
export interface CrawlerResult {
  stats: CrawlerStats;
  users: StargazerUser[];
}

/**
 * 检查点数据接口
 */
export interface CheckpointData {
  repository: string;
  processedUsers: string[];
  completedUsers: StargazerUser[];
  totalStargazers: number;
  startTime: number;
  lastUpdateTime: number;
  outputFormat: 'csv' | 'json';
  outputFile?: string;
}

/**
 * 进度状态接口
 */
export interface ProgressStatus {
  current: number;
  total: number;
  percentage: number;
  processed: number;
  withEmail: number;
  errors: number;
}
