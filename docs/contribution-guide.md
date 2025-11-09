# 贡献指南

## 如何贡献

欢迎为 Toolbox 项目贡献代码、文档或建议！

### 贡献类型

1. **新工具** - 添加全新的工具或项目
2. **改进现有工具** - 修复 bug、添加功能
3. **文档改进** - 完善文档、添加示例
4. **测试** - 增加测试覆盖率

### 新工具贡献流程

#### 1. 规划阶段

- 确定工具的功能和用途
- 选择合适的目录名称（小写字母和连字符）
- 检查是否已有类似工具

#### 2. 开发阶段

```bash
# 1. 创建工具目录
mkdir your-tool-name
cd your-tool-name

# 2. 初始化项目
npm init -y

# 3. 安装开发依赖
npm install --save-dev jest eslint

# 4. 创建基本文件
mkdir src tests
touch README.md src/index.js tests/index.test.js .gitignore
```

#### 3. 工具结构要求

每个工具必须包含：

- `README.md` - 工具说明、使用方法
- `package.json` - 项目配置和依赖
- `src/` - 源代码目录
- `tests/` - 测试文件
- `.gitignore` - Git 忽略文件

#### 4. 代码规范

- 使用 ESLint 进行代码检查
- 函数和类添加适当的注释
- 错误处理要完善
- 测试覆盖率应达到 80% 以上

#### 5. 文档要求

在 `docs/tools/` 中创建对应的文档文件：

```markdown
# 工具名称

## 功能描述
简要描述工具的功能

## 安装和使用
详细的安装和使用步骤

## API 文档
如果适用，提供 API 文档

## 示例
实际使用示例
```

#### 6. 提交流程

```bash
# 1. 添加文件到 Git
git add your-tool-name/

# 2. 提交更改
git commit -m "Add new tool: your-tool-name - brief description"

# 3. 创建 Pull Request
# 在 GitHub 上创建 PR，描述工具功能和使用方法
```

### 文档贡献

#### 改进现有文档

1. 找到需要改进的文档文件
2. 进行修改和补充
3. 确保格式正确
4. 提交更改

#### 添加新文档

1. 在 `docs/` 目录下创建新文件
2. 在 `docs/README.md` 中添加链接
3. 确保文档结构清晰

### 代码审查

所有贡献都会经过代码审查，重点关注：

- 代码质量和规范
- 测试覆盖率
- 文档完整性
- 安全性考虑

### 发布

被接受的贡献会：

1. 合并到主分支
2. 更新版本号
3. 更新 CHANGELOG
4. 发布新版本

## 代码风格

### JavaScript/Node.js

```javascript
// 使用 2 空格缩进
// 使用单引号
// 函数使用驼峰命名
// 常量使用大写下划线

const API_URL = 'https://api.example.com';

function getData() {
  // 实现
}
```

### 文档格式

- 使用 Markdown
- 标题使用 # ## ### 层级
- 代码块使用 ``` 语言标记
- 链接使用相对路径

## 联系方式

如有疑问，请：

1. 创建 Issue
2. 发起 Discussion
3. 联系维护者

## 许可证

贡献的代码遵循项目的许可证条款。