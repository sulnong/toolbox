<!-- OPENSPEC:START -->
# OpenSpec 指令

这些指令是为在此项目中工作的AI编码助手准备的。

当请求包含以下内容时，始终打开 `@/openspec/AGENTS.md`：
- 提及规划或提案（包含 proposal、spec、change、plan 等词汇）
- 引入新功能、破坏性变更、架构变更或重大性能/安全工作
- 听起来模棱两可，需要权威规范才能编码

使用 `@/openspec/AGENTS.md` 学习：
- 如何创建和应用变更提案
- 规范格式和约定
- 项目结构和指南

请保持此管理块，以便 'openspec update' 可以刷新指令。

## 快速参考（中文）

### 创建变更提案流程
1. **审查现有工作**：`openspec spec list --long`、`openspec list`
2. **确定范围**：新功能 vs 修改现有功能
3. **选择唯一的变更ID**：kebab-case格式，动词引导（`add-`、`update-`、`remove-`、`refactor-`）
4. **构建结构**：`proposal.md`、`tasks.md`、`design.md`（仅在需要时），以及每个受影响功能的增量规范
5. **编写增量**：使用 `## ADDED|MODIFIED|REMOVED|RENAMED Requirements`；每个需求至少包含一个 `#### Scenario:`
6. **验证**：`openspec validate [change-id] --strict` 并解决问题
7. **请求批准**：在批准之前不要开始实现

### 何时创建提案
**创建提案的情况**：
- 添加功能或能力
- 进行破坏性变更（API、架构）
- 改变架构或模式
- 优化性能（改变行为）
- 更新安全模式

**跳过提案的情况**：
- 错误修复（恢复预期行为）
- 拼写、格式、注释
- 依赖更新（非破坏性）
- 配置更改
- 现有行为的测试

### 验证和CLI命令
```bash
# 基本命令
openspec list                  # 列出活动变更
openspec list --specs          # 列出规范
openspec show [item]           # 显示变更或规范
openspec validate [item]       # 验证变更或规范
openspec archive <change-id>   # 部署后归档

# 严格验证
openspec validate [change-id] --strict
```

### 规范格式要点
- 每个需求必须至少有一个场景
- 场景格式：`#### Scenario: 场景名称`（4个#号）
- 需求措辞：使用 SHALL/MUST 表示规范性要求

<!-- OPENSPEC:END -->

# 项目宪法
所有回复均使用中文

# 技术栈偏好

### 优先技术栈
- **后端运行时**: Node.js
- **编程语言**: TypeScript (严格类型检查)
- **Web框架**: Next.js (如需要Web界面)
- **包管理器**: pnpm
- **构建工具**: 基于项目需求选择，倾向于现代工具链

### 项目结构约定
- 使用 monorepo 结构管理多个子项目
- 每个子项目独立管理依赖和配置
- 统一的代码风格和ESLint配置
- 完整的TypeScript类型定义

### 开发工具配置
- 严格的TypeScript配置
- 自动化代码格式化 (Prettier)
- Git hooks进行代码质量检查
- 完整的测试覆盖率要求

