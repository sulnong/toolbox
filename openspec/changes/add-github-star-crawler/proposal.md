## Why
创建一个合规的 GitHub 爬虫工具，用于获取公开仓库的 star 用户邮箱信息，支持开发者和项目管理者进行社区分析和联系。

## What Changes
- 添加 `github-star-crawler` 工具目录及完整实现
- 实现 GitHub API 集成，遵守所有反爬限制和 API 使用规范
- 建立合规的数据收集和处理流程
- **BREAKING**: None (新工具添加)

## Impact
- Affected specs: github-crawler (new capability)
- Affected code: 新增 `github-star-crawler/` 目录
- Documentation: 新增 `docs/tools/github-star-crawler.md`

## Legal and Ethical Considerations
- 仅访问公开的 GitHub 仓库信息
- 遵守 GitHub API 使用条款和速率限制
- 不进行任何可能违法的数据收集活动
- 尊重用户隐私，仅使用公开可见的邮箱信息