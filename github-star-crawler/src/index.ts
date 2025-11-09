/**
 * GitHub Star Crawler - 主入口文件
 *
 * 一个合规的 GitHub 工具，用于获取公开仓库的 star 用户邮箱信息
 */

export { GitHubClient } from './github-client';
export { EmailExtractor } from './email-extractor';
export { DataExporter } from './exporter';
export { GitHubStarCrawler } from './crawler';
export { main } from './cli';
export * from './types';
