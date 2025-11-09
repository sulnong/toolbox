# Toolbox

一个简洁的工具集合，包含各种实用工具和小项目。

## 概述

这是一个模块化的工具箱，每个工具或小项目都有独立的目录结构，便于管理和维护。

## 项目结构

```
toolbox/
├── README.md           # 项目总览
├── CLAUDE.md          # AI 助手指令
├── AGENTS.md          # 智能代理配置
├── docs/              # 文档目录
│   ├── README.md      # 文档索引
│   ├── project-setup.md    # 项目设置指南
│   ├── contribution-guide.md # 贡献指南
│   └── ...           # 其他文档
├── crawler/           # 爬虫工具
├── mail-sender/       # 邮件发送工具
├── project1/          # 示例项目1
└── ...               # 其他工具和项目
```

## 工具列表

### GitHub Star Crawler (github-star-crawler)
- 描述：获取 GitHub 仓库 star 用户邮箱信息的合规工具
- 状态：✅ 已完成
- 技术栈：Node.js > 22, TypeScript, pnpm
- 功能：GitHub API 集成、邮箱提取、CSV/JSON 导出
- 详细文档：[GitHub Star Crawler 使用指南](./docs/tools/github-star-crawler.md)

### 邮件发送工具 (mail-sender)
- 描述：邮件批量发送和管理工具
- 状态：规划中

### 示例项目1 (project1)
- 描述：[项目描述]
- 状态：规划中

## 文档

详细文档请查看 [docs/](./docs/) 目录：

- [项目设置指南](./docs/project-setup.md)
- [贡献指南](./docs/contribution-guide.md)
- [开发规范](./docs/development-standards.md)

## 贡献

欢迎贡献新的工具或项目！请阅读 [贡献指南](./docs/contribution-guide.md) 了解详细信息。

### 添加新工具

1. 创建新的工具目录：`mkdir your-tool-name`
2. 实现工具功能
3. 添加相应的文档到 `docs/` 目录
4. 更新本 README.md

## 许可证

[添加许可证信息]