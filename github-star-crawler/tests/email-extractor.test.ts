import { EmailExtractor } from '../src/email-extractor';
import { GitHubUser } from '../src/types';

describe('EmailExtractor', () => {
  const mockUsers: GitHubUser[] = [
    {
      login: 'user1',
      id: 1,
      name: 'User One',
      email: 'user1@realdomain.com',
      company: 'Company A',
      location: 'City A',
      bio: null,
      public_repos: 10,
      followers: 100,
      following: 50,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    },
    {
      login: 'user2',
      id: 2,
      name: 'User Two',
      email: null,
      company: null,
      location: null,
      bio: null,
      public_repos: 5,
      followers: 50,
      following: 25,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    },
    {
      login: 'user3',
      id: 3,
      name: 'User Three',
      email: 'user3@noreply.github.com',
      company: 'Company B',
      location: 'City B',
      bio: null,
      public_repos: 20,
      followers: 200,
      following: 100,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    }
  ];

  describe('extractEmailData', () => {
    it('应该正确提取邮箱数据', () => {
      const result = EmailExtractor.extractEmailData(mockUsers);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        username: 'user1',
        name: 'User One',
        email: 'user1@realdomain.com',
        company: 'Company A',
        location: 'City A',
        followers: 100,
        following: 50
      });
      expect(result[1].email).toBeNull();
      expect(result[2].email).toBeNull(); // noreply 邮箱被过滤
    });
  });

  describe('filterUsersWithEmail', () => {
    it('应该只返回有邮箱的用户', () => {
      const stargazerUsers = EmailExtractor.extractEmailData(mockUsers);
      const result = EmailExtractor.filterUsersWithEmail(stargazerUsers);

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('user1@realdomain.com');
    });
  });

  describe('removeDuplicates', () => {
    it('应该去除重复用户', () => {
      const duplicateUsers = [...mockUsers, mockUsers[0]];
      const stargazerUsers = EmailExtractor.extractEmailData(duplicateUsers);
      const result = EmailExtractor.removeDuplicates(stargazerUsers);

      expect(result).toHaveLength(3);
    });
  });

  describe('getStats', () => {
    it('应该生成正确的统计信息', () => {
      const stargazerUsers = EmailExtractor.extractEmailData(mockUsers);
      const stats = EmailExtractor.getStats(stargazerUsers);

      expect(stats.total).toBe(3);
      expect(stats.withEmail).toBe(1);
      expect(stats.withoutEmail).toBe(2);
      expect(stats.uniqueEmails).toBe(1);
      expect(stats.topDomains).toHaveLength(1);
      expect(stats.topDomains[0]).toEqual({
        domain: 'realdomain.com',
        count: 1
      });
    });
  });
});