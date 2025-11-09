import { GitHubClient } from './github-client';
import { EmailExtractor } from './email-extractor';
import { CrawlerConfig, OutputOptions, CrawlerResult, CrawlerStats, StargazerUser } from './types';

/**
 * GitHub Star 爬虫主类
 */
export class GitHubStarCrawler {
  private client: GitHubClient;
  private config: CrawlerConfig;

  constructor(config: CrawlerConfig) {
    this.client = new GitHubClient(config);
    this.config = config;
  }

  /**
   * 爬取指定仓库的 star 用户邮箱信息
   */
  async crawlRepository(
    owner: string,
    repo: string,
    options: OutputOptions
  ): Promise<CrawlerResult> {
    const startTime = Date.now();
    console.log(`🚀 开始爬取 ${owner}/${repo} 的 star 用户邮箱信息...`);

    try {
      // 1. 获取所有 star 用户名
      const stargazers = await this.client.getStargazers(owner, repo);
      if (stargazers.length === 0) {
        console.log('📝 该仓库暂无 star 用户');
        return this.createEmptyResult(owner, repo, startTime);
      }

      console.log(`📋 发现 ${stargazers.length} 个 star 用户`);

      // 2. 获取用户详细信息
      const users = await this.client.getBatchUserInfos(stargazers, (current, total) => {
        const progress = Math.round((current / total) * 100);
        console.log(`🔄 进度: ${progress}% (${current}/${total})`);
      });

      // 3. 提取邮箱数据
      const stargazerUsers = EmailExtractor.extractEmailData(users);
      const uniqueUsers = EmailExtractor.removeDuplicates(stargazerUsers);

      // 4. 生成统计信息
      const rateLimit = await this.client.getRateLimit();
      const stats: CrawlerStats = {
        repository: `${owner}/${repo}`,
        totalStargazers: uniqueUsers.length,
        usersWithEmail: EmailExtractor.filterUsersWithEmail(uniqueUsers).length,
        processingTime: Date.now() - startTime,
        rateLimitRemaining: rateLimit.remaining,
        errors: 0,
      };

      console.log(`\n📊 爬取完成！统计信息:`);
      console.log(`   总 star 用户: ${stats.totalStargazers}`);
      console.log(`   有邮箱用户: ${stats.usersWithEmail}`);
      console.log(`   处理时间: ${Math.round(stats.processingTime / 1000)}s`);
      console.log(`   剩余 API 请求: ${stats.rateLimitRemaining}`);

      // 5. 显示详细统计
      const emailStats = EmailExtractor.getStats(uniqueUsers);
      if (options.verbose) {
        console.log(`\n📈 详细统计:`);
        console.log(`   无邮箱用户: ${emailStats.withoutEmail}`);
        console.log(`   唯一邮箱: ${emailStats.uniqueEmails}`);

        if (emailStats.topDomains.length > 0) {
          console.log(`\n🌐 热门邮箱域名:`);
          emailStats.topDomains.forEach(({ domain, count }) => {
            console.log(`   ${domain}: ${count}`);
          });
        }
      }

      return {
        stats,
        users: uniqueUsers,
      };
    } catch (error: any) {
      console.error('❌ 爬取失败:', error.message);
      throw error;
    }
  }

  /**
   * 创建空结果
   */
  private createEmptyResult(owner: string, repo: string, startTime: number): CrawlerResult {
    return {
      stats: {
        repository: `${owner}/${repo}`,
        totalStargazers: 0,
        usersWithEmail: 0,
        processingTime: Date.now() - startTime,
        rateLimitRemaining: 0,
        errors: 0,
      },
      users: [],
    };
  }

  /**
   * 验证仓库格式
   */
  static validateRepository(repo: string): { owner: string; name: string } | null {
    const match = repo.match(/^([^\/]+)\/([^\/]+)$/);
    if (!match) {
      return null;
    }

    const [, owner, name] = match;
    if (!owner || !name) {
      return null;
    }

    return { owner, name };
  }

  /**
   * 创建默认配置
   */
  static createDefaultConfig(): CrawlerConfig {
    return {
      token: process.env.GITHUB_TOKEN,
      delay: 1000, // 1秒延迟
      maxRetries: 3,
      timeout: 30000, // 30秒超时
      userAgent: 'GitHub-Star-Crawler/1.0.0',
      verbose: false,
    };
  }

  /**
   * 创建默认输出选项
   */
  static createDefaultOptions(): OutputOptions {
    return {
      format: 'csv',
      statsOnly: false,
      verbose: false,
    };
  }
}
