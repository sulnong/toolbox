# GitHub Star Crawler

一个合规的 GitHub 工具，用于获取公开仓库的 star 用户邮箱信息。

## 功能特性

- 🔍 获取指定 GitHub 仓库的所有 star 用户
- 📧 提取用户公开的邮箱地址
- 🛡️ 严格遵守 GitHub API 使用条款和速率限制
- 📊 支持多种输出格式 (CSV, JSON)
- ⚡ 支持断点续传和错误重试
- 🔒 仅访问公开数据，确保合规性

## 安装

```bash
# 使用 pnpm 安装依赖
pnpm install

# 构建项目
pnpm run build
```

## 使用方法

### 基本用法

```bash
# 获取仓库的 star 用户邮箱
pnpm start owner/repository

# 指定输出格式
pnpm start owner/repository --format csv

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
```csv
username,name,email,company,location,followers,following
octocat,The Octocat,octocat@github.com,GitHub,San Francisco,1234,567
```

### JSON 格式
```json
{
  "repository": "owner/repo",
  "total_stargazers": 1234,
  "emails_found": 456,
  "users": [
    {
      "username": "octocat",
      "name": "The Octocat",
      "email": "octocat@github.com",
      "company": "GitHub",
      "location": "San Francisco",
      "followers": 1234,
      "following": 567
    }
  ]
}
```

## 合规性声明

- ⚠️ 本工具仅访问 GitHub 上的公开信息
- ✅ 遵守 GitHub API 使用条款
- ✅ 尊重用户隐私设置
- ✅ 不进行任何可能违法的数据收集
- ⚠️ 请勿将收集的邮箱用于垃圾邮件

## GitHub Token 配置

为了获得更高的 API 速率限制，建议配置 GitHub token:

1. 访问 [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. 生成新的 token (无需特殊权限)
3. 设置环境变量: `export GITHUB_TOKEN=your_token_here`

## 速率限制

- **未认证请求**: 60 次/小时
- **认证请求**: 5000 次/小时

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
```

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

## 许可证

MIT License

## 免责声明

本工具仅用于教育和合法的数据收集目的。使用者需要确保遵守相关法律法规和 GitHub 服务条款。