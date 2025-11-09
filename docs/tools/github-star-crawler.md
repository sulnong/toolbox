# GitHub Star Crawler

GitHub Star Crawler 是一个合规的工具，用于获取公开仓库的 star 用户邮箱信息。

## 功能

- 🔍 获取指定 GitHub 仓库的所有 star 用户
- 📧 提取用户公开的邮箱地址
- 🛡️ 严格遵守 GitHub API 使用条款和速率限制
- 📊 支持多种输出格式 (CSV, JSON)
- ⚡ 支持断点续传和错误重试

## 安装

在 `github-star-crawler/` 目录中：

```bash
pnpm install
pnpm run build
```

## 使用方法

### 基本用法

```bash
# 获取仓库的 star 用户邮箱
pnpm start owner/repository

# 指定输出格式
pnpm start owner/repository --format json

# 指定输出文件
pnpm start owner/repository --output results.csv
```

### 高级选项

```bash
# 使用 GitHub token 提高速率限制
export GITHUB_TOKEN=your_token_here
pnpm start owner/repository

# 自定义请求延迟 (毫秒)
pnpm start owner/repository --delay 1000

# 启用详细日志
pnpm start owner/repository --verbose

# 仅统计不导出数据
pnpm start owner/repository --stats-only
```

## 环境变量

| 变量名 | 描述 | 必需 |
|--------|------|------|
| `GITHUB_TOKEN` | GitHub 个人访问令牌 | 否 (但推荐) |

## 输出格式

### CSV 格式
包含以下字段：
- USERNAME: 用户名
- NAME: 真实姓名
- EMAIL: 邮箱地址
- COMPANY: 公司
- LOCATION: 位置
- FOLLOWERS: 关注者数量
- FOLLOWING: 关注数量

### JSON 格式
```json
{
  "metadata": {
    "repository": "owner/repo",
    "exportedAt": "2023-XX-XX...",
    "totalStargazers": 1234,
    "usersWithEmail": 456,
    "processingTime": 1234
  },
  "users": [...]
}
```

## 合规性

- ✅ 仅访问 GitHub 上的公开信息
- ✅ 遵守 GitHub API 使用条款
- ✅ 尊重用户隐私设置
- ✅ 不进行任何可能违法的数据收集

## 速率限制

- **未认证请求**: 60 次/小时
- **认证请求**: 5000 次/小时

## 故障排除

### 常见问题

1. **速率限制错误**
   - 配置 GitHub token
   - 增加请求延迟

2. **仓库不存在或私有**
   - 确认仓库名称正确
   - 确保仓库为公开状态

3. **找不到邮箱信息**
   - 许多用户不公开邮箱地址
   - 这是正常现象

## 开发

```bash
# 开发模式
pnpm run dev

# 运行测试
pnpm test

# 代码检查
pnpm run lint

# 代码格式化
pnpm run format

# 构建项目
pnpm run build
```

## API

### 主要类

- `GitHubClient`: GitHub API 客户端
- `EmailExtractor`: 邮箱提取器
- `DataExporter`: 数据导出器
- `GitHubStarCrawler`: 主爬虫类

### 示例代码

```typescript
import { GitHubStarCrawler } from './src/crawler';

const config = GitHubStarCrawler.createDefaultConfig();
const crawler = new GitHubStarCrawler(config);

const result = await crawler.crawlRepository('owner', 'repo', {
  format: 'json',
  verbose: true
});
```