import { GitHubStarCrawler } from '../src/crawler';

describe('GitHubStarCrawler', () => {
  describe('validateRepository', () => {
    it('应该验证正确的仓库格式', () => {
      const result = GitHubStarCrawler.validateRepository('owner/repo');
      expect(result).toEqual({
        owner: 'owner',
        name: 'repo'
      });
    });

    it('应该拒绝错误的仓库格式', () => {
      const invalidRepos = [
        'owner',
        '/repo',
        'owner/',
        'owner/repo/extra',
        '',
        'owner/repo/name'
      ];

      invalidRepos.forEach(repo => {
        const result = GitHubStarCrawler.validateRepository(repo);
        expect(result).toBeNull();
      });
    });
  });

  describe('createDefaultConfig', () => {
    it('应该创建默认配置', () => {
      const config = GitHubStarCrawler.createDefaultConfig();

      expect(config.delay).toBe(1000);
      expect(config.maxRetries).toBe(3);
      expect(config.timeout).toBe(30000);
      expect(config.userAgent).toBe('GitHub-Star-Crawler/1.0.0');
      expect(config.verbose).toBe(false);
    });
  });

  describe('createDefaultOptions', () => {
    it('应该创建默认输出选项', () => {
      const options = GitHubStarCrawler.createDefaultOptions();

      expect(options.format).toBe('csv');
      expect(options.statsOnly).toBe(false);
      expect(options.verbose).toBe(false);
    });
  });
});