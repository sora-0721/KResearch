# Contributing Guide | 贡献指南

Welcome to **KResearch**! We greatly appreciate your willingness to contribute. Whether it's fixing bugs, adding new features, improving documentation, or making suggestions, every contribution makes this project better.

欢迎来到 **KResearch** 项目！我们非常感谢你愿意为这个项目做出贡献。无论是修复 Bug、添加新功能、改进文档，还是提出建议，你的每一份贡献都将让这个项目变得更好。

Please read this guide carefully before submitting contributions.

为了确保协作顺畅、代码质量一致，请在提交贡献前仔细阅读本指南。

## 📋 Table of Contents | 目录

- [Code of Conduct | 行为准则](#-code-of-conduct--行为准则)
- [Quick Start | 快速开始](#-quick-start--快速开始)
- [Development Setup | 开发环境设置](#-development-setup--开发环境设置)
- [Code Standards | 代码规范](#-code-standards--代码规范)
- [Git Workflow | Git 工作流程](#-git-workflow--git-工作流程)
- [Commit Conventions | 提交规范](#-commit-conventions--提交规范)
- [Pull Request Guide | Pull Request 指南](#-pull-request-guide--pull-request-指南)
- [Design System | 设计系统规范](#-design-system--设计系统规范)
- [Testing | 测试要求](#-testing--测试要求)
- [FAQ | 常见问题](#-faq--常见问题)

## 🤝 Code of Conduct | 行为准则

We are committed to building an open, friendly, and inclusive community environment.

我们致力于构建一个开放、友好、包容的社区环境。请在参与项目时：

- ✅ Be respectful and courteous | 保持尊重和礼貌
- ✅ Welcome different perspectives and experiences | 欢迎不同的观点和经验
- ✅ Accept constructive criticism | 接受建设性的批评
- ✅ Focus on what's best for the community | 专注于对社区最有利的事情
- ❌ Don't use gendered language or images | 不要使用性别化的语言或图像
- ❌ Don't engage in personal or political attacks | 不要进行人身攻击或政治攻击
- ❌ Don't harass or discriminate | 不要骚扰或歧视他人

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details.

详细的行为准则请参阅 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

## 🚀 Quick Start | 快速开始

### Ways to Contribute | 我能贡献什么？

Here are some ways you can contribute | 以下是一些你可以做出贡献的方式：

1. **🐛 Report Bugs | 报告 Bug**：Found an issue? Submit an Issue | 发现了问题？请提交 Issue
2. **💡 Suggest Features | 提出新功能**：Have a good idea? Share in Discussions or Issues | 有好想法？在 Discussions 或 Issues 中分享
3. **📝 Improve Docs | 改进文档**：Help us improve unclear or incorrect documentation | 发现文档不清晰或有错误？帮助我们改进
4. **🎨 Optimize UI/UX | 优化 UI/UX**：Make the interface more beautiful and user-friendly | 让界面更美观、更易用
5. **⚡ Performance | 性能优化**：Make the app run faster | 让应用运行得更快
6. **🔧 Fix Bugs | 修复 Bug**：Solve existing problems | 解决现有的问题
7. **✨ Add Features | 添加功能**：Implement new features | 实现新的特性

### First Time Contributing? | 第一次贡献？

If this is your first time contributing to open source | 如果这是你第一次为开源项目做贡献，我们推荐：

1. Browse [GitHub Issues](https://github.com/KuekHaoYang/KResearch/issues) | 浏览 Issues
2. Look for issues labeled `good first issue` | 寻找标记为 `good first issue` 的问题
3. Comment on the Issue to express your interest | 在 Issue 中评论，表明你想要解决这个问题
4. Follow this guide to develop and submit | 按照本指南进行开发和提交

## 🛠 Development Setup | 开发环境设置

### System Requirements | 系统要求

Ensure your development environment meets these requirements | 确保你的开发环境满足以下要求：

| Tool | Min Version | Recommended | Check Command |
|------|-------------|-------------|---------------|
| **Node.js** | 20.0.0 | 20.x LTS | `node --version` |
| **npm** | 9.0.0 | 10.x | `npm --version` |
| **Git** | 2.30.0 | Latest | `git --version` |

### Setup Steps | 详细设置步骤

#### 1. Fork Repository | Fork 仓库

Click the "Fork" button at the top right of the GitHub page.

点击 GitHub 页面右上角的 "Fork" 按钮，将项目 Fork 到你的账号下。

#### 2. Clone Repository | 克隆仓库

```bash
# Clone your forked repository | 克隆你 Fork 的仓库
git clone https://github.com/YOUR_USERNAME/KResearch.git
cd KResearch

# Add upstream repository | 添加上游仓库
git remote add upstream https://github.com/KuekHaoYang/KResearch.git
```

#### 3. Install Dependencies | 安装依赖

```bash
npm install
```

#### 4. Start Dev Server | 启动开发服务器

```bash
npm run dev
```

Visit `http://localhost:3000` to view the app.

访问 `http://localhost:3000` 查看应用。

#### 5. Verify Environment | 验证环境

Ensure these commands run successfully | 确保以下命令都能正常运行：

```bash
# Code linting | 代码检查
npm run lint

# Build test | 构建测试
npm run build
```

## 📏 Code Standards | 代码规范

### Core Rules | 核心规范

#### 1. File Length Limit ⚠️ | 文件长度限制 ⚠️

> [!CAUTION]
> **This is a hard rule! All project files must stay under 150 lines (except system files).**
>
> **这是项目的硬性规则！所有项目文件必须保持在 150 行以内（除系统文件外）。**

**Check command | 检查命令：**

```bash
find . -type f -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/.git/*" -not -name "package-lock.json" -not -name "*.png" -not -name "*.md" | xargs wc -l | awk '$1 > 150 && $2 != "total" {print $2 " - " $1 " lines"}'
```

**If there's output, files exceed 150 lines and must be refactored!**

**如果命令有输出，说明有文件超过 150 行，必须重构！**

**Refactoring Strategies | 重构策略：**

##### A. Extract Components | 提取组件

```typescript
// ❌ Bad: One 200-line component | 不好：一个 200 行的大组件
export function ResearchPanel() {
  // 150+ lines of code
  return <div>{/* Lots of JSX */}</div>;
}

// ✅ Good: Split into smaller components | 好：拆分为多个小组件
export function ResearchPanel() {
  return (
    <div>
      <ResearchInput />
      <ResearchResults />
      <ResearchLogs />
    </div>
  );
}
```

##### B. Extract Custom Hooks | 提取自定义 Hook

```typescript
// ❌ Bad: Lots of state logic in component | 不好：组件内有大量状态逻辑
export function ResearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  // ... lots of logic
}

// ✅ Good: Extract to custom Hook | 好：提取到自定义 Hook
export function ResearchPage() {
  const { query, results, startResearch } = useResearch();
  return <div>{/* JSX */}</div>;
}
```

##### C. Extract Utility Functions | 提取工具函数

```typescript
// ❌ Bad: Utilities in component file | 不好：组件文件包含工具函数
export function ResultCard() {
  const formatDate = (date: Date) => { /* ... */ };
  // ...
}

// ✅ Good: Extract to utility file | 好：提取到工具文件
import { formatDate } from '@/lib/utils/format-utils';

export function ResultCard() {
  return <div>{/* JSX */}</div>;
}
```

#### 2. TypeScript Standards | TypeScript 规范

**Type Safety | 类型安全**

```typescript
// ❌ Avoid using any | 避免使用 any
function processData(data: any) {
  return data.value;
}

// ✅ Use specific types | 使用具体类型
interface ResearchData {
  id: string;
  title: string;
  content: string;
}

function processData(data: ResearchData) {
  return data.title;
}
```

#### 3. React Component Standards | React 组件规范

```typescript
// ✅ Standard function component structure | 标准函数组件结构
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant = 'primary', children, onClick }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
}
```

#### 4. Naming Conventions | 命名规范

**File Naming | 文件命名**

- Components: `PascalCase.tsx` (e.g., `ResearchCard.tsx`)
- Hooks: `camelCase.ts` (e.g., `useResearch.ts`)
- Utilities: `kebab-case.ts` (e.g., `format-utils.ts`)
- Types: `kebab-case.ts` (e.g., `research-types.ts`)

## 🔄 Git Workflow | Git 工作流程

### Branch Strategy | 分支策略

**Main Branch | 主分支**

- `main`：Stable production branch, only accepts PR merges | 稳定的生产分支，只接受 PR 合并

**Feature Branch Naming | 功能分支命名**

- `feat/feature-name`：New feature | 新功能
- `fix/issue-description`：Bug fix | 错误修复
- `docs/doc-change`：Documentation | 文档更新
- `refactor/refactor-name`：Code refactoring | 代码重构
- `perf/optimization`：Performance | 性能优化
- `style/style-change`：Style changes | 样式调整
- `test/test-content`：Testing | 测试相关
- `chore/other-changes`：Build/tools | 构建或工具变动

### Development Flow | 开发流程

#### 1. Sync Upstream | 同步上游仓库

```bash
# Fetch upstream updates | 获取上游更新
git fetch upstream

# Switch to main branch | 切换到主分支
git checkout main

# Merge upstream updates | 合并上游更新
git merge upstream/main

# Push to your Fork | 推送到你的 Fork
git push origin main
```

#### 2. Create Feature Branch | 创建功能分支

```bash
# Create new branch from main | 从 main 创建新分支
git checkout -b feat/your-feature-name

# Confirm current branch | 确认当前分支
git branch
```

#### 3. Pre-commit Checks | 提交前检查

**Required checks | 必须通过的检查：**

```bash
# 1. Code linting | 代码规范检查
npm run lint

# 2. File length check | 文件长度检查
find . -type f -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/.git/*" -not -name "package-lock.json" -not -name "*.png" -not -name "*.md" | xargs wc -l | awk '$1 > 150 && $2 != "total" {print $2 " - " $1 " lines"}'

# 3. Build test | 构建测试
npm run build
```

**If any check fails, fix it first! | 如果任何检查失败，必须先修复！**

## 📝 Commit Conventions | 提交规范

### Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types | 类型：**

- `feat`：New feature | 新功能
- `fix`：Bug fix | 错误修复
- `docs`：Documentation changes | 文档变更
- `style`：Code formatting | 代码格式
- `refactor`：Refactoring | 重构
- `perf`：Performance optimization | 性能优化
- `test`：Testing related | 测试相关
- `chore`：Build/tool changes | 构建过程或辅助工具的变动

**Examples | 示例：**

```bash
# Simple commit | 简单提交
git commit -m "feat: add research history feature"

# Detailed commit | 详细提交
git commit -m "feat(research): add multi-step research capability

- Support iterative research process
- Add real-time research logs
- Implement auto-generated reports

Closes #123"
```

## 🔍 Pull Request Guide | Pull Request 指南

### Creating a PR | 创建 PR

1. **Push branch to your Fork | 推送分支到你的 Fork**

```bash
git push origin feat/your-feature-name
```

2. **Create PR on GitHub | 在 GitHub 上创建 PR**

- Visit your Fork page | 访问你的 Fork 页面
- Click "Compare & pull request" | 点击 "Compare & pull request"
- Select target branch: `KuekHaoYang/KResearch:main` | 选择目标分支

### PR Description Template | PR 描述模板

```markdown
## 📝 Description | 变更说明

Brief description of what this PR does.

简要描述这个 PR 做了什么。

## 🎯 Related Issue | 相关 Issue

Closes #123

## ✅ Checklist | 检查清单

- [ ] Code passes `npm run lint` | 代码已通过 lint
- [ ] All files under 150 lines | 所有文件都在 150 行以内
- [ ] Build succeeds (`npm run build`) | 构建成功
- [ ] Tested all changes locally | 已在本地测试所有变更
- [ ] Follows Liquid Glass design system | 遵循设计系统
- [ ] Commit messages follow conventions | 提交信息符合规范
- [ ] Updated relevant docs | 已更新相关文档
```

## 🎨 Design System | 设计系统规范

### Liquid Glass Principles | Liquid Glass 原则

When writing UI code, follow the Liquid Glass design system | 在编写 UI 代码时，必须遵循 Liquid Glass 设计系统：

#### 1. Border Radius | 圆角规范

> [!IMPORTANT]
> **Only use two border radii: `rounded-2xl` and `rounded-full`**
>
> **只使用两种圆角：`rounded-2xl` 和 `rounded-full`**

```typescript
// ✅ Correct | 正确
<div className="rounded-2xl">  {/* Containers, cards, buttons, inputs */}
<div className="rounded-full"> {/* Avatars, badges, pills */}

// ❌ Wrong | 错误
<div className="rounded-lg">
<div className="rounded-xl">
```

#### 2. Glass Effect | 玻璃效果

```typescript
// ✅ Use glass class or backdrop-filter | 使用 glass 类
<div className="glass">
  {/* Content */}
</div>

// Or custom glass effect | 或自定义玻璃效果
<div className="
  backdrop-blur-xl 
  backdrop-saturate-180 
  bg-white/10
  border border-white/20
">
```

#### 3. Transitions | 动画过渡

```typescript
// ✅ Use standard transition curves | 使用标准过渡曲线
<button className="
  transition-all 
  duration-300 
  ease-out
  hover:scale-105
">
```

## 🧪 Testing | 测试要求

### Manual Testing | 手动测试

Before submitting PR, manually test | 在提交 PR 前，请手动测试：

#### Functionality | 功能测试

- [ ] New feature works as expected | 新功能按预期工作
- [ ] No existing features broken | 没有破坏现有功能
- [ ] Edge cases handled correctly | 边界情况处理正确

#### Browser Testing | 浏览器测试

Test in these browsers | 在以下浏览器中测试：

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)

#### Responsive Testing | 响应式测试

Test at these device sizes | 在以下设备尺寸测试：

- [ ] Mobile (375px - 428px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (1280px+)

## ❓ FAQ | 常见问题

### Q1: Where should I start? | 我应该从哪里开始？

**A:** Check Issues labeled `good first issue`, these are usually simpler and suitable for beginners.

**A:** 查看标记为 `good first issue` 的 Issues，这些通常比较简单，适合新手。

### Q2: How to keep files under 150 lines? | 如何让文件保持在 150 行以内？

**A:** Refer to the [File Length Limit](#1-file-length-limit-️--文件长度限制-️) section. Key strategies:

**A:** 参考[文件长度限制](#1-file-length-limit-️--文件长度限制-️)部分。关键是：

- Extract components | 提取组件
- Extract Hooks | 提取 Hook
- Extract utility functions | 提取工具函数
- Modularize | 模块化

Note: System files (README.md, CONTRIBUTING.md, etc.) are exempt.

注：系统文件（如 README.md、CONTRIBUTING.md 等文档）不受此限制。

### Q3: How long until my PR gets reviewed? | 我的 PR 多久会被审查？

**A:** Usually within 1-3 business days. If no response after a week, add a comment to remind.

**A:** 通常在 1-3 个工作日内。如果超过一周没有回应，可以在 PR 中添加评论提醒。

### Q4: Can I submit multiple PRs at once? | 可以同时提交多个 PR 吗？

**A:** Yes, but each PR should focus on one feature or fix. Avoid unrelated changes in one PR.

**A:** 可以，但建议每个 PR 专注于一个功能或修复。避免在一个 PR 中做太多不相关的改动。

### Q5: How to resolve merge conflicts? | 如何解决合并冲突？

```bash
# 1. Sync upstream | 同步上游
git fetch upstream
git checkout main
git merge upstream/main

# 2. Switch to feature branch and rebase | 切换到功能分支并 rebase
git checkout feat/your-feature
git rebase main

# 3. After resolving conflicts | 解决冲突后
git add .
git rebase --continue

# 4. Force push (rebase changes history) | 强制推送
git push origin feat/your-feature --force
```

### Q6: What if I made a typo in my commit message? | 我的提交信息写错了怎么办？

```bash
# Amend last commit | 修改最后一次提交
git commit --amend -m "New commit message"

# If already pushed | 如果已经推送了
git push origin feat/your-feature --force
```

### Q7: How to test my changes? | 如何测试我的改动？

1. Start dev server: `npm run dev` | 启动开发服务器
2. Manually test in browser | 在浏览器中手动测试功能
3. Test different screen sizes | 测试不同的设备尺寸
4. Run `npm run build` to ensure production build succeeds | 确保生产构建成功

### Q8: How do I report security vulnerabilities? | 如何报告安全漏洞？

See [SECURITY.md](SECURITY.md) for the security vulnerability reporting process. Don't discuss security issues in public Issues.

请查看 [SECURITY.md](SECURITY.md) 了解安全漏洞报告流程。不要在公开 Issue 中讨论安全问题。

## 📞 Need Help? | 需要帮助？

If you have any questions | 如果你有任何问题：

1. **Check Documentation | 查看文档**：README.md and this guide
2. **Search Issues | 搜索 Issues**：Someone may have asked the same question
3. **Ask Questions | 提出问题**：In Discussions or Issues
4. **Contact Maintainer | 联系维护者**：[@KuekHaoYang](https://github.com/KuekHaoYang)

## 🎉 Thank you for contributing! | 感谢你的贡献！

Thank you for taking the time to read this guide and contribute to KResearch. Every contribution, big or small, makes this project better.

感谢你花时间阅读本指南，并为 KResearch 做出贡献。每一个贡献，无论大小，都让这个项目变得更好。

We look forward to your Pull Request!

我们期待看到你的 Pull Request！

---

<div align="center">
  <strong>Let's build a better KResearch together! | 让我们一起打造更好的 KResearch！</strong>
</div>
