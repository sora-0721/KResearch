# KResearch

![KResearch Banner](public/icon.png)

> A modern AI-powered deep research platform built with Next.js. Featuring the unique "Liquid Glass" design language, it delivers a fluid visual experience and powerful research capabilities.
>
> 一个基于 Next.js 构建的现代化 AI 驱动深度研究平台。采用独特的 "Liquid Glass" 设计语言，提供流畅的视觉体验和强大的研究功能。

**🌐 Live Demo | 在线体验：[https://kvideo.pages.dev/](https://kvideo.pages.dev/)**

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

## 📖 About | 项目简介

**KResearch** is a high-performance, modern AI-powered research application focused on providing exceptional user experience and visual design. This project leverages the latest features of Next.js 16, combined with React 19 and Tailwind CSS v4, to create both a beautiful and powerful research platform.

**KResearch** 是一个高性能、现代化的 AI 驱动研究应用，专注于提供极致的用户体验和视觉设计。本项目利用 Next.js 16 的最新特性，结合 React 19 和 Tailwind CSS v4，打造了一个既美观又强大的研究平台。

### Core Design Philosophy | 核心设计理念：Liquid Glass（液态玻璃）

The project's visual design is based on the **"Liquid Glass"** design system, a modern UI design language that combines:

项目的视觉设计基于 **"Liquid Glass"** 设计系统，这是一套融合了以下特性的现代化 UI 设计语言：

- **Glassmorphism Effect** | **玻璃拟态效果**：Frosted translucent effects via `backdrop-filter` | 通过 `backdrop-filter` 实现的磨砂半透明效果
- **Universal Softness** | **通用柔和度**：Unified use of `rounded-2xl` and `rounded-full` | 统一使用两种圆角半径
- **Light Interaction** | **光影交互**：Inner glow effects on hover and focus states | 悬停和聚焦状态下的内发光效果
- **Fluid Animation** | **流畅动画**：Physics-based `cubic-bezier` curves | 基于物理的过渡曲线
- **Depth Hierarchy** | **深度层级**：Clear z-axis hierarchy | 清晰的层次结构

## ✨ Core Features | 核心功能

### 🧠 AI-Powered Deep Research | AI 驱动深度研究

- **Multi-Step Research** | **多步骤研究**：Iterative research process with intelligent planning | 智能规划的迭代研究过程
- **Google Search Grounding** | **谷歌搜索落地**：Real-time web search integration via Gemini API | 通过 Gemini API 实现实时网络搜索
- **Auto-Generated Reports** | **自动生成报告**：Comprehensive research reports with citations | 带引用的综合研究报告
- **Research Logs** | **研究日志**：Real-time visibility into research process | 研究过程的实时可见性

### 🔍 Intelligent Research Agent | 智能研究代理

- **Planner Agent** | **规划代理**：Designs research strategy and next steps | 设计研究策略和下一步行动
- **Worker Agent** | **工作代理**：Executes searches and gathers information | 执行搜索和收集信息
- **Writer Agent** | **写作代理**：Synthesizes findings into coherent reports | 将发现整合成连贯的报告
- **Verifier Agent** | **验证代理**：Validates research completeness | 验证研究的完整性

### 📱 Responsive Design | 响应式设计

- **Full Platform Support** | **全平台支持**：Perfect support for desktop, tablet, and mobile | 完美支持桌面、平板和移动设备
- **Mobile First** | **移动优先**：Dedicated mobile components and interactions | 专门的移动端组件和交互
- **Touch Optimized** | **触摸优化**：Touch-optimized gestures and interactions | 针对触摸屏优化

### 🌙 Theme System | 主题系统

- **Dark/Light Mode** | **深色/浅色模式**：System-level theme switching support | 支持系统级主题切换
- **Dynamic Theming** | **动态主题**：CSS Variables based dynamic theme system | 基于 CSS Variables 的动态主题系统
- **Seamless Transitions** | **无缝过渡**：Smooth transition animations on theme switch | 主题切换时的平滑过渡动画

### ⌨️ Accessibility | 无障碍设计

- **Keyboard Navigation** | **键盘导航**：Full keyboard shortcut support | 完整的键盘快捷键支持
- **ARIA Labels**：WCAG 2.2 compliant accessibility | 符合 WCAG 2.2 标准的无障碍实现
- **Semantic HTML** | **语义化 HTML**：Semantic tags for improved accessibility | 使用语义化标签提升可访问性

## 🛠 Tech Stack | 技术栈

### Frontend Core | 前端核心

| Technology | Version | Purpose |
|------|------|------|
| **[Next.js](https://nextjs.org/)** | 16.0.3 | React framework with App Router |
| **[React](https://react.dev/)** | 19.2.0 | UI component library |
| **[TypeScript](https://www.typescriptlang.org/)** | 5.x | Type-safe JavaScript |
| **[Tailwind CSS](https://tailwindcss.com/)** | 4.x | Utility-first CSS framework |
| **[Zustand](https://github.com/pmndrs/zustand)** | 5.0.2 | Lightweight state management |

### Development Tools | 开发工具

- **ESLint 9**：Code quality checking | 代码质量检查
- **PostCSS 8**：CSS processor | CSS 处理器
- **Vercel Analytics**：Performance monitoring | 性能监控和分析

## 🚀 Quick Deployment | 快速部署

### Live Demo | 在线体验

Visit **[https://kvideo.pages.dev/](https://kvideo.pages.dev/)** to try now, no installation required!

访问 **[https://kvideo.pages.dev/](https://kvideo.pages.dev/)** 立即体验，无需安装！

### Deploy to Your Server | 部署到自己的服务器

#### Option 1: Vercel One-Click Deploy | Vercel 一键部署（推荐）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/KuekHaoYang/KResearch)

1. Click the button above | 点击上方按钮
2. Connect your GitHub account | 连接你的 GitHub 账号
3. Vercel will auto-detect and deploy | Vercel 会自动检测并部署
4. Access your own KResearch instance in minutes | 几分钟后即可访问

#### Option 2: Docker Deployment | Docker 部署

**Pull from Docker Hub (Easiest) | 从 Docker Hub 拉取（最简单）：**

```bash
# Pull latest version | 拉取最新版本
docker pull kuekhaoyang/kresearch:latest
docker run -d -p 3000:3000 --name kresearch kuekhaoyang/kresearch:latest
```

The app will start at `http://localhost:3000`.

应用将在 `http://localhost:3000` 启动。

> **✨ Multi-Architecture Support | 多架构支持**：Images support 2 major platforms:
> - `linux/amd64` - Intel/AMD 64-bit (most servers, PCs, Intel Mac)
> - `linux/arm64` - ARM 64-bit (Apple Silicon Mac, AWS Graviton, Raspberry Pi 4/5)

**Build your own image | 自己构建镜像：**

```bash
git clone https://github.com/KuekHaoYang/KResearch.git
cd KResearch
docker build -t kresearch .
docker run -d -p 3000:3000 --name kresearch kresearch
```

**Using Docker Compose：**

```bash
docker-compose up -d
```

#### Option 3: Traditional Node.js Deployment | 传统 Node.js 部署

```bash
# 1. Clone repository | 克隆仓库
git clone https://github.com/KuekHaoYang/KResearch.git
cd KResearch

# 2. Install dependencies | 安装依赖
npm install

# 3. Build project | 构建项目
npm run build

# 4. Start production server | 启动生产服务器
npm start
```

The app will start at `http://localhost:3000`.

应用将在 `http://localhost:3000` 启动。

## 🔄 How to Update | 如何更新

### Vercel Deployment | Vercel 部署

Vercel will auto-detect GitHub repository updates and redeploy, no manual action needed.

Vercel 会自动检测 GitHub 仓库的更新并重新部署，无需手动操作。

### Docker Deployment | Docker 部署

When a new version is released | 当有新版本发布时：

```bash
# Stop and remove old container | 停止并删除旧容器
docker stop kresearch
docker rm kresearch

# Pull latest image | 拉取最新镜像
docker pull kuekhaoyang/kresearch:latest

# Run new container | 运行新容器
docker run -d -p 3000:3000 --name kresearch kuekhaoyang/kresearch:latest
```

### Node.js Deployment | Node.js 部署

```bash
cd KResearch
git pull origin main
npm install
npm run build
npm start
```

> **🔄 Automated Deployment | 自动化部署**：This project uses GitHub Actions to auto-build and publish Docker images. Each push to main triggers multi-architecture image builds to Docker Hub.
>
> 本项目使用 GitHub Actions 自动构建和发布 Docker 镜像。每次代码推送到 main 分支时，会自动构建多架构镜像并推送到 Docker Hub。

## 🤝 Contributing | 贡献代码

We welcome all forms of contributions! Whether it's reporting bugs, suggesting new features, improving documentation, or submitting code, every contribution makes this project better.

我们非常欢迎各种形式的贡献！无论是报告 Bug、提出新功能建议、改进文档，还是提交代码，你的每一份贡献都让这个项目变得更好。

**Want to contribute? Check out the [Contributing Guide](CONTRIBUTING.md) for detailed development guidelines and processes.**

**想要参与开发？请查看 [贡献指南](CONTRIBUTING.md) 了解详细的开发规范和流程。**

Quick Start | 快速开始：
1. **Report Bugs | 报告 Bug**：[Submit Issue](https://github.com/KuekHaoYang/KResearch/issues)
2. **Feature Suggestions | 功能建议**：Share your ideas in Issues
3. **Code Contribution | 代码贡献**：Fork → Branch → PR
4. **Documentation | 文档改进**：Submit PR directly

## 📄 License | 许可证

This project is open source under the [MIT License](LICENSE).

本项目基于 [MIT 许可证](LICENSE) 开源。

## 🙏 Acknowledgments | 致谢

Thanks to these open source projects | 感谢以下开源项目：

- [Next.js](https://nextjs.org/) - React Framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS Framework
- [Zustand](https://github.com/pmndrs/zustand) - State Management
- [React](https://react.dev/) - UI Library
- [Google Gemini](https://ai.google.dev/) - AI Model

## 📞 Contact | 联系方式

- **Author | 作者**：[KuekHaoYang](https://github.com/KuekHaoYang)
- **Project Homepage | 项目主页**：[https://github.com/KuekHaoYang/KResearch](https://github.com/KuekHaoYang/KResearch)
- **Issue Feedback | 问题反馈**：[GitHub Issues](https://github.com/KuekHaoYang/KResearch/issues)

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/KuekHaoYang">KuekHaoYang</a>
  <br>
  If this project helps you, please consider giving a ⭐️
  <br>
  如果这个项目对你有帮助，请考虑给一个 ⭐️
</div>
