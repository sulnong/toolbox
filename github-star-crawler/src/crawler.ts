import { GitHubClient } from './github-client';
import { EmailExtractor } from './email-extractor';
import { CheckpointManager } from './checkpoint-manager';
import {
  CrawlerConfig,
  OutputOptions,
  CrawlerResult,
  CrawlerStats,
  StargazerUser,
  CheckpointData,
  ProgressStatus,
} from './types';

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
    options: OutputOptions,
    resume: boolean = false
  ): Promise<CrawlerResult> {
    const repository = `${owner}/${repo}`;
    const startTime = Date.now();

    console.log(`🚀 开始爬取 ${repository} 的 star 用户邮箱信息...`);

    try {
      // 检查是否可以恢复
      let checkpoint: CheckpointData | null = null;
      if (resume) {
        checkpoint = await CheckpointManager.loadCheckpoint(repository);
        if (checkpoint) {
          console.log(`🔄 检测到未完成任务，将从断点继续...`);
          console.log(`   已处理: ${checkpoint.processedUsers.length}/${checkpoint.totalStargazers} 用户`);
          console.log(`   已完成: ${checkpoint.completedUsers.length} 个有效用户`);
        }
      }

      // 如果没有检查点或不恢复，则从头开始
      if (!checkpoint) {
        const stargazers = await this.client.getStargazers(owner, repo);
        if (stargazers.length === 0) {
          console.log('📝 该仓库暂无 star 用户');
          return this.createEmptyResult(owner, repo, startTime);
        }

        console.log(`📋 发现 ${stargazers.length} 个 star 用户`);
        checkpoint = CheckpointManager.createInitialCheckpoint(
          repository,
          stargazers.length,
          options.format,
          options.output
        );
      }

      // 获取待处理的用户列表
      const allStargazers = await this.client.getStargazers(owner, repo);
      const remainingUsers = allStargazers.filter(
        (username) => !checkpoint!.processedUsers.includes(username)
      );

      console.log(`📋 剩余待处理: ${remainingUsers.length} 个用户`);

      // 渐进式处理用户
      await this.processUsersProgressively(
        remainingUsers,
        checkpoint,
        options
      );

      // 完成处理
      const rateLimit = await this.client.getRateLimit();
      const finalStats: CrawlerStats = {
        repository,
        totalStargazers: checkpoint.totalStargazers,
        usersWithEmail: EmailExtractor.filterUsersWithEmail(checkpoint.completedUsers).length,
        processingTime: Date.now() - startTime,
        rateLimitRemaining: rateLimit.remaining,
        errors: 0,
      };

      // 显示最终统计
      this.displayFinalStats(checkpoint.completedUsers, finalStats, options);

      // 清理检查点
      await CheckpointManager.deleteCheckpoint(repository);

      return {
        stats: finalStats,
        users: checkpoint.completedUsers,
      };
    } catch (error: any) {
      console.error('❌ 爬取失败:', error.message);
      console.log('💡 提示: 可以使用 --resume 选项从中断点继续');
      throw error;
    }
  }

  /**
   * 渐进式处理用户
   */
  private async processUsersProgressively(
    usernames: string[],
    checkpoint: CheckpointData,
    options: OutputOptions
  ): Promise<void> {
    const batchSize = 10; // 每处理 10 个用户保存一次检查点
    let processedInBatch = 0;

    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i];

      try {
        // 获取用户信息
        const userInfo = await this.client.getUserInfo(username);
        if (userInfo) {
          const stargazerUser = EmailExtractor.extractEmailData([userInfo])[0];
          if (stargazerUser) {
            checkpoint.completedUsers.push(stargazerUser);
          }
        }

        // 记录已处理的用户
        checkpoint.processedUsers.push(username);
        processedInBatch++;

        // 显示进度
        const progress = CheckpointManager.calculateProgress(checkpoint);
        const stats = CheckpointManager.getProcessingStats(checkpoint);

        if (i % 10 === 0 || i === usernames.length - 1) {
          console.log(
            `🔄 进度: ${progress}% (${checkpoint.processedUsers.length}/${checkpoint.totalStargazers}) - ` +
            `速度: ${stats.rate.toFixed(1)} 用户/秒 - ` +
            `预计剩余: ${Math.round(stats.eta / 60)} 分钟`
          );
        }

        // 定期保存检查点和写入数据
        if (processedInBatch >= batchSize || i === usernames.length - 1) {
          await CheckpointManager.saveCheckpoint(checkpoint);
          await this.writeProgressData(checkpoint, options);
          processedInBatch = 0;
        }

        // 添加延迟
        if (this.config.delay > 0 && i < usernames.length - 1) {
          await this.sleep(this.config.delay);
        }
      } catch (error: any) {
        console.warn(`⚠️ 处理用户 ${username} 失败:`, error.message);
        // 继续处理下一个用户
      }
    }
  }

  /**
   * 写入进度数据
   */
  private async writeProgressData(
    checkpoint: CheckpointData,
    options: OutputOptions
  ): Promise<void> {
    if (options.statsOnly) {
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = options.output || `${checkpoint.repository.replace('/', '-')}-${timestamp}-progress.${options.format}`;

    try {
      if (options.format === 'csv') {
        await this.writeProgressCsv(checkpoint, filename);
      } else if (options.format === 'json') {
        await this.writeProgressJson(checkpoint, filename);
      }
    } catch (error: any) {
      console.warn('⚠️ 写入进度数据失败:', error.message);
    }
  }

  /**
   * 写入 CSV 格式进度数据
   */
  private async writeProgressCsv(checkpoint: CheckpointData, filename: string): Promise<void> {
    const createCsvWriter = require('csv-writer').createObjectCsvWriter;
    const fs = require('fs');
    const path = require('path');

    const usersWithEmail = checkpoint.completedUsers.filter((user) => user.email !== null);
    if (usersWithEmail.length === 0) {
      return;
    }

    const csvWriter = createCsvWriter({
      path: filename,
      header: [
        { id: 'username', title: 'USERNAME' },
        { id: 'name', title: 'NAME' },
        { id: 'email', title: 'EMAIL' },
        { id: 'company', title: 'COMPANY' },
        { id: 'location', title: 'LOCATION' },
        { id: 'followers', title: 'FOLLOWERS' },
        { id: 'following', title: 'FOLLOWING' },
      ],
      append: checkpoint.processedUsers.length > usersWithEmail.length, // 如果文件已存在则追加
    });

    await csvWriter.writeRecords(usersWithEmail);
  }

  /**
   * 写入 JSON 格式进度数据
   */
  private async writeProgressJson(checkpoint: CheckpointData, filename: string): Promise<void> {
    const fs = require('fs').promises;

    const jsonData = {
      metadata: {
        repository: checkpoint.repository,
        lastUpdated: new Date().toISOString(),
        totalStargazers: checkpoint.totalStargazers,
        processedUsers: checkpoint.processedUsers.length,
        completedUsers: checkpoint.completedUsers.length,
        progress: CheckpointManager.calculateProgress(checkpoint),
      },
      users: checkpoint.completedUsers.filter((user) => user.email !== null),
    };

    await fs.writeFile(filename, JSON.stringify(jsonData, null, 2));
  }

  /**
   * 显示最终统计
   */
  private displayFinalStats(users: StargazerUser[], stats: CrawlerStats, options: OutputOptions): void {
    console.log(`\n📊 爬取完成！统计信息:`);
    console.log(`   总 star 用户: ${stats.totalStargazers}`);
    console.log(`   有邮箱用户: ${stats.usersWithEmail}`);
    console.log(`   处理时间: ${Math.round(stats.processingTime / 1000)}s`);
    console.log(`   剩余 API 请求: ${stats.rateLimitRemaining}`);

    // 显示详细统计
    const emailStats = EmailExtractor.getStats(users);
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
   * 检查是否有未完成的任务
   */
  static async hasUnfinishedTask(repository: string): Promise<boolean> {
    return await CheckpointManager.hasCheckpoint(repository);
  }

  /**
   * 列出所有未完成的任务
   */
  static async listUnfinishedTasks(): Promise<string[]> {
    return await CheckpointManager.listCheckpoints();
  }

  /**
   * 清理检查点
   */
  static async cleanupCheckpoints(maxAge?: number): Promise<void> {
    await CheckpointManager.cleanupOldCheckpoints(maxAge);
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    // 加载环境变量
    require('dotenv').config();

    return {
      token: process.env.GITHUB_TOKEN,
      delay: parseInt(process.env.DEFAULT_DELAY || '1000'),
      maxRetries: 3,
      timeout: parseInt(process.env.DEFAULT_TIMEOUT || '30000'),
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
