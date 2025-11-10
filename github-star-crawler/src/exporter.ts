import * as fs from 'fs/promises';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { CrawlerResult, OutputOptions, StargazerUser } from './types';

/**
 * 数据导出器
 */
export class DataExporter {
  /**
   * 导出数据到文件
   */
  static async exportToFile(result: CrawlerResult, options: OutputOptions): Promise<string | null> {
    if (options.statsOnly) {
      this.displayStats(result);
      return null;
    }

    // 检查是否有数据可导出
    if (result.users.length === 0) {
      console.log('⚠️ 没有数据可导出');
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const defaultFilename = `${result.stats.repository.replace('/', '-')}-${timestamp}`;
    const filename = options.output || `${defaultFilename}.${options.format}`;

    try {
      if (options.format === 'csv') {
        await this.exportToCsv(result, filename);
      } else if (options.format === 'json') {
        await this.exportToJson(result, filename);
      }

      console.log(`✅ 数据已导出到: ${filename}`);
      return path.resolve(filename);
    } catch (error: any) {
      console.error('❌ 导出失败:', error.message);
      throw error;
    }
  }

  /**
   * 导出为 CSV 格式
   */
  private static async exportToCsv(result: CrawlerResult, filename: string): Promise<void> {
    const usersWithEmail = result.users.filter((user) => user.email !== null);

    if (usersWithEmail.length === 0) {
      console.log('⚠️ 没有找到邮箱信息，将导出所有用户信息（邮箱字段为空）');
    }

    // 导出所有用户，不仅仅是邮箱用户
    const csvWriter = createObjectCsvWriter({
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
    });

    await csvWriter.writeRecords(result.users);

    console.log(`📊 导出了 ${result.users.length} 个用户，其中 ${usersWithEmail.length} 个有邮箱地址`);
  }

  /**
   * 导出为 JSON 格式
   */
  private static async exportToJson(result: CrawlerResult, filename: string): Promise<void> {
    const usersWithEmail = result.users.filter((user) => user.email !== null);

    const jsonData = {
      metadata: {
        repository: result.stats.repository,
        exportedAt: new Date().toISOString(),
        totalStargazers: result.stats.totalStargazers,
        usersWithEmail: result.stats.usersWithEmail,
        processingTime: result.stats.processingTime,
        note: usersWithEmail.length === 0 ? '大多数 GitHub 用户不会公开邮箱地址，这是正常现象' : undefined,
      },
      users: result.users, // 导出所有用户
    };

    await fs.writeFile(filename, JSON.stringify(jsonData, null, 2));

    console.log(`📊 导出了 ${result.users.length} 个用户，其中 ${usersWithEmail.length} 个有邮箱地址`);
  }

  /**
   * 显示统计信息
   */
  static displayStats(result: CrawlerResult): void {
    const { stats } = result;

    console.log('\n📊 统计信息:');
    console.log(`   仓库: ${stats.repository}`);
    console.log(`   总 star 用户: ${stats.totalStargazers}`);
    console.log(`   有邮箱用户: ${stats.usersWithEmail}`);
    console.log(
      `   邮箱覆盖率: ${stats.totalStargazers > 0 ? Math.round((stats.usersWithEmail / stats.totalStargazers) * 100) : 0}%`
    );
    console.log(`   处理时间: ${Math.round(stats.processingTime / 1000)}s`);
    console.log(`   剩余 API 请求: ${stats.rateLimitRemaining}`);

    // 显示域名统计
    const usersWithEmail = result.users.filter((user) => user.email !== null);
    if (usersWithEmail.length > 0) {
      const domainStats = this.getEmailDomainStats(usersWithEmail);
      const topDomains = Array.from(domainStats.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      if (topDomains.length > 0) {
        console.log('\n🌐 热门邮箱域名:');
        topDomains.forEach(([domain, count]) => {
          const percentage = Math.round((count / usersWithEmail.length) * 100);
          console.log(`   ${domain}: ${count} (${percentage}%)`);
        });
      }
    }
  }

  /**
   * 获取邮箱域名统计
   */
  private static getEmailDomainStats(users: StargazerUser[]): Map<string, number> {
    const domainStats = new Map<string, number>();

    for (const user of users) {
      if (user.email) {
        const domain = user.email.split('@')[1]?.toLowerCase();
        if (domain) {
          domainStats.set(domain, (domainStats.get(domain) || 0) + 1);
        }
      }
    }

    return domainStats;
  }

  /**
   * 验证输出路径
   */
  static async validateOutputPath(filename: string): Promise<boolean> {
    try {
      const dir = path.dirname(filename);
      await fs.access(dir);
      return true;
    } catch {
      try {
        await fs.mkdir(path.dirname(filename), { recursive: true });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * 生成默认文件名
   */
  static generateDefaultFilename(repository: string, format: 'csv' | 'json'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${repository.replace('/', '-')}-${timestamp}.${format}`;
  }
}
