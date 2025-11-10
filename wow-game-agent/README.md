# 魔兽世界游戏助手 (WoW Game Agent)

> 🔒 **合规安全** - 专注于辅助功能而非全自动机器人的魔兽世界游戏助手

一个为魔兽世界玩家设计的智能辅助系统，提供人性化、合规的游戏辅助功能，帮助提升游戏体验同时严格遵守用户条款，避免账号封禁风险。

## ✨ 核心特性

### 🔒 安全合规
- **严格合规**: 遵守魔兽世界用户条款，不实现全自动机器人
- **防检测设计**: 人性化操作模拟，避免被反作弊系统识别
- **用户掌控**: 关键操作需要用户确认，不提供无人值守功能
- **透明操作**: 详细操作日志，完全可追溯

### 🎮 智能辅助
- **钓鱼助手**: 鱼咬钩提醒、数据记录、一键收竿辅助
- **人性化输入**: 贝塞尔曲线鼠标轨迹、动态延迟模拟
- **AI 建议**: 基于屏幕分析的智能操作建议
- **场景插件**: 可扩展的辅助功能插件系统

### 🛡️ 安全机制
- **实时监控**: 行为模式分析和风险评估
- **使用限制**: 防止过度使用的自动休息机制
- **紧急停止**: 一键暂停所有操作
- **合规审查**: 定期验证功能合规性

## 🚀 快速开始

### 环境要求

- **Node.js**: >= 18.0.0
- **操作系统**: Windows 10/11 (推荐)
- **游戏**: 魔兽世界正式服

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/your-org/wow-game-agent.git
   cd wow-game-agent
   ```

2. **安装依赖**
   ```bash
   npm install
   # 或使用 pnpm
   pnpm install
   ```

3. **配置环境**
   ```bash
   # 复制配置模板
   cp .env.example .env

   # 编辑配置文件，填入你的设置
   # 主要配置：AI API密钥、游戏路径、安全参数
   ```

4. **构建项目**
   ```bash
   npm run build
   ```

5. **启动助手**
   ```bash
   # 开发模式
   npm run dev

   # 生产模式
   npm start
   ```

## 📖 使用指南

### 基础配置

编辑 `.env` 文件，配置以下关键参数：

```env
# AI 模型配置
OPENAI_API_KEY=your_api_key_here

# 游戏路径
WOW_CLIENT_PATH=C:\\Program Files (x86)\\World of Warcraft\\_retail_\\Wow.exe

# 安全设置
MAX_SESSION_HOURS=4
REST_INTERVAL_MINUTES=30
```

### 钓鱼场景使用

1. **启动游戏** 到钓鱼地点
2. **运行助手** 选择钓鱼场景
3. **配置技能** 将钓鱼技能拖到快捷键1
4. **开始辅助** 助手会提醒鱼咬钩并协助收竿

### 命令行界面

```bash
# 查看帮助
npm start -- --help

# 启动钓鱼助手
npm start -- fishing

# 查看状态
npm start -- status

# 安全检查
npm start -- safety-check
```

## 🔧 开发指南

### 项目结构

```
wow-game-agent/
├── src/
│   ├── core/                 # 核心安全框架
│   │   ├── human-input/      # 人性化输入模拟
│   │   ├── safety-monitor/   # 安全监控
│   │   ├── ai-engine/        # AI决策引擎
│   │   └── plugin-manager/   # 插件管理
│   ├── scenarios/            # 场景插件
│   │   ├── fishing/          # 钓鱼助手
│   │   ├── login/            # 登录流程
│   │   └── navigation/       # 地图导航
│   ├── config/               # 配置管理
│   ├── types/                # 类型定义
│   └── utils/                # 工具函数
├── tests/                    # 测试文件
├── docs/                     # 文档
└── config/                   # 配置文件
```

### 开发命令

```bash
# 开发模式 (热重载)
npm run dev

# 运行测试
npm test

# 代码检查
npm run lint

# 格式化代码
npm run format

# 构建项目
npm run build
```

### 插件开发

创建新的场景插件：

```typescript
import { BaseScenario } from '@/scenarios/base-scenario';
import { IScenarioConfig } from '@/types/scenario';

export class MyScenario extends BaseScenario {
  constructor(config: IScenarioConfig) {
    super(config);
  }

  async execute(): Promise<void> {
    // 实现场景逻辑
  }

  protected async validateSafety(): Promise<boolean> {
    // 安全检查
    return true;
  }
}
```

## 🔒 安全最佳实践

### ✅ 推荐做法
- 始终保持用户确认关键操作
- 遵循游戏时间限制，合理休息
- 监控操作行为，避免机械重复
- 定期检查合规性更新

### ❌ 禁止行为
- 无人值守的全自动操作
- 修改游戏客户端或内存
- 绕过游戏反作弊系统
- 违反用户条款的任何行为

## 📊 功能状态

| 功能模块 | 状态 | 描述 |
|---------|------|------|
| 人性化输入 | 🚧 开发中 | 贝塞尔曲线鼠标轨迹 |
| 安全监控 | 📋 规划中 | 行为分析和风险评估 |
| 钓鱼助手 | 📋 规划中 | 鱼咬钩提醒和辅助 |
| AI 引擎 | 📋 规划中 | 屏幕分析和建议 |
| 插件系统 | 📋 规划中 | 可扩展架构 |

## 🤝 贡献指南

我们欢迎社区贡献！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 开发规范

- 遵循 TypeScript 严格模式
- 编写单元测试
- 更新相关文档
- 确保合规性检查

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## ⚠️ 免责声明

本软件仅供学习和研究目的使用。使用者需要：

1. 遵守魔兽世界用户条款和相关法律法规
2. 承担使用本软件的所有风险
3. 理解使用任何游戏辅助软件都可能导致账号封禁
4. 在使用前备份游戏数据

**开发团队不承担任何因使用本软件导致的损失或责任。**

## 📞 支持与反馈

- **问题报告**: [GitHub Issues](https://github.com/your-org/wow-game-agent/issues)
- **功能建议**: [GitHub Discussions](https://github.com/your-org/wow-game-agent/discussions)
- **安全问题**: 请发送邮件至 security@example.com

## 🏆 致谢

感谢所有为项目做出贡献的开发者和社区成员！

---

**⚡ 记住：合规使用，安全第一！**