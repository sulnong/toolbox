import { GitHubUser, StargazerUser } from './types';

/**
 * 邮箱提取器
 */
export class EmailExtractor {
  /**
   * 从 GitHub 用户信息中提取邮箱数据
   */
  static extractEmailData(users: GitHubUser[]): StargazerUser[] {
    const stargazerUsers: StargazerUser[] = [];

    for (const user of users) {
      const stargazerUser: StargazerUser = {
        username: user.login,
        name: user.name,
        email: this.extractEmail(user),
        company: this.cleanField(user.company),
        location: this.cleanField(user.location),
        followers: user.followers,
        following: user.following,
      };

      stargazerUsers.push(stargazerUser);
    }

    return stargazerUsers;
  }

  /**
   * 提取邮箱地址
   */
  private static extractEmail(user: GitHubUser): string | null {
    if (!user.email) {
      return null;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      return null;
    }

    // 过滤掉明显无效的邮箱
    const invalidPatterns = [
      /noreply\.github\.com$/,
      /example\.com$/,
      /test\.com$/,
      /users\.noreply\.github\.com$/,
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(user.email)) {
        return null;
      }
    }

    return user.email.toLowerCase();
  }

  /**
   * 清理字段数据
   */
  private static cleanField(field: string | null): string | null {
    if (!field) {
      return null;
    }

    return field.trim().replace(/\s+/g, ' ') || null;
  }

  /**
   * 过滤出有邮箱的用户
   */
  static filterUsersWithEmail(users: StargazerUser[]): StargazerUser[] {
    return users.filter((user) => user.email !== null);
  }

  /**
   * 去除重复用户（基于用户名）
   */
  static removeDuplicates(users: StargazerUser[]): StargazerUser[] {
    const seen = new Set<string>();
    return users.filter((user) => {
      if (seen.has(user.username)) {
        return false;
      }
      seen.add(user.username);
      return true;
    });
  }

  /**
   * 去除重复邮箱
   */
  static removeDuplicateEmails(users: StargazerUser[]): StargazerUser[] {
    const seenEmails = new Set<string>();
    return users.filter((user) => {
      if (!user.email || seenEmails.has(user.email)) {
        return false;
      }
      seenEmails.add(user.email);
      return true;
    });
  }

  /**
   * 按邮箱域名分组统计
   */
  static getEmailDomainStats(users: StargazerUser[]): Map<string, number> {
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
   * 获取统计信息
   */
  static getStats(users: StargazerUser[]): {
    total: number;
    withEmail: number;
    withoutEmail: number;
    uniqueEmails: number;
    topDomains: Array<{ domain: string; count: number }>;
  } {
    const usersWithEmail = this.filterUsersWithEmail(users);
    const uniqueUsers = this.removeDuplicates(users);
    const uniqueEmailUsers = this.removeDuplicateEmails(usersWithEmail);
    const domainStats = this.getEmailDomainStats(uniqueEmailUsers);

    // 获取前5个域名
    const topDomains = Array.from(domainStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain, count]) => ({ domain, count }));

    return {
      total: uniqueUsers.length,
      withEmail: usersWithEmail.length,
      withoutEmail: uniqueUsers.length - usersWithEmail.length,
      uniqueEmails: uniqueEmailUsers.length,
      topDomains,
    };
  }
}
