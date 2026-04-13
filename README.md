# 公众号内容创作工作流

一个整合热榜获取、AI 写作、一键发布到微信公众号的完整工作流工具。

![workflow](https://img.shields.io/badge/Workflow-3%20Steps-blue)
![Node](https://img.shields.io/badge/Node.js-18+-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ 功能特性

### 1. 🔥 热榜获取
- 支持微博、知乎、B站、百度、抖音等 20+ 平台
- 点击话题自动填充写作主题
- 悬停显示操作按钮：🔗 打开原网页、📋 复制标题

### 2. ✍️ AI 写作
- 流式生成文章，实时预览
- 内置多种写作风格模板
- 支持自定义写作要求
- 自动生成 5 组标题和摘要
- AI 生成封面图 Prompt 并一键出图

### 3. 📤 一键发布
- 直接发布到微信公众号草稿箱
- 自动处理 Markdown 转微信 HTML
- 支持封面图上传
- 配置支持文件配置 + 浏览器本地存储

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 pnpm

### 1. 克隆并安装

```bash
git clone https://github.com/yourname/wechat-content-workflow.git
cd wechat-content-workflow

# 安装所有依赖
npm run install:all
```

### 2. 配置

编辑 `config.json` 文件：

```json
{
  "textModel": {
    "apiUrl": "https://api.openai.com/v1",
    "apiKey": "sk-your-api-key",
    "modelName": "gpt-4o"
  },
  "imageModel": {
    "apiUrl": "https://api.openai.com/v1",
    "apiKey": "sk-your-api-key",
    "modelName": "dall-e-3"
  },
  "wechat": {
    "appid": "wx-your-app-id",
    "secret": "your-app-secret"
  },
  "server": {
    "port": 3000,
    "dailyHotPort": 6688
  }
}
```

**支持的 API 服务商：**

| 服务商 | API Base URL | 模型示例 |
|--------|-------------|----------|
| OpenAI | `https://api.openai.com/v1` | gpt-4o, gpt-4-turbo |
| Azure | `https://your-resource.openai.azure.com/openai/deployments/your-deployment` | gpt-4 |
| 火山引擎 | `https://ark.cn-beijing.volces.com/api/v3` | doubao-pro-32k |
| 智谱 AI | `https://open.bigmodel.cn/api/paas/v4` | glm-4 |
| 本地部署 | `http://localhost:11434/v1` | llama3 |

### 3. 启动服务

```bash
npm start
```

访问 http://localhost:3000 即可使用。

> `npm start` 会同时启动两个服务：
> - DailyHotApi 服务在端口 **6688**（热榜数据）
> - 主服务在端口 **3000**（前端 + AI 写作 + 发布）

### 开发模式

```bash
npm run dev
# 使用 concurrently 同时启动两个服务，并启用 watch 模式
```

## 📖 使用指南

### 第一步：配置 AI API

两种方式：
1. **配置文件**（推荐）：编辑 `config.json`，重启服务后生效
2. **页面设置**：点击右上角 ⚙️ 图标，填写后保存到浏览器

### 第二步：选择热榜话题

1. 在左侧热榜面板选择平台（微博/知乎/B站/百度/抖音）
2. 浏览热门话题列表
3. **点击标题**自动填充到写作主题
4. **悬停话题**显示操作按钮：
   - 🔗 打开：在新标签页打开原网页
   - 📋 复制：复制标题到剪贴板

### 第三步：AI 写作

1. 确认或修改文章主题
2. 选择写作风格
3. 添加特殊要求（可选）
4. 点击「开始写作」生成文章
5. 点击「生成标题摘要」获取 5 组标题
6. 选择合适的标题

### 第四步：生成封面（可选）

1. 点击「生成封面图」
2. AI 生成 3 个不同风格的封面 Prompt
3. 点击喜欢的风格生成封面图
4. 下载封面或进入发布流程

### 第五步：发布到公众号

1. 填写微信公众号配置（可在 config.json 中预配置）
2. 确认文章标题、作者、内容
3. 点击「发布到草稿箱」
4. 成功后前往公众号后台查看并发布

## 📁 项目结构

```
wechat-content-workflow/
├── config.json              ⭐ 统一配置文件
├── package.json
├── README.md
├── server/                  # 后端服务
│   ├── index.js
│   ├── services/
│   │   ├── config.js       # 配置管理服务
│   │   ├── ai.js
│   │   ├── hotRanks.js     # 热榜服务
│   │   ├── styleLoader.js
│   │   └── wechatPublisher.js
│   ├── routes/
│   └── styles/             # 写作风格文件
├── public/                  # 前端单页应用
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
└── services/                # 内嵌服务
    └── dailyhot-api/       # DailyHotApi 热榜服务
        ├── .env            # DailyHotApi 配置
        └── ...
```

## 🔌 API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/config` | GET | 获取当前配置（不含敏感信息） |
| `/api/config` | POST | 保存配置到 config.json |
| `/api/styles` | GET | 获取写作风格列表 |
| `/api/article` | POST | 流式生成文章 (SSE) |
| `/api/titles` | POST | 生成标题摘要 |
| `/api/cover/prompts` | POST | 生成封面 Prompt |
| `/api/cover/generate` | POST | 生成封面图 |
| `/api/cover/proxy` | GET/POST | 图片代理 |
| `/api/publish` | POST | 发布到微信公众号 |
| `/api/hot-ranks/platforms` | GET | 获取热榜平台列表 |
| `/api/hot-ranks/:platform` | GET | 获取指定平台热榜 |

## 📝 配置优先级

配置读取优先级（从高到低）：
1. **浏览器 localStorage**（页面设置中保存的）
2. **config.json 文件**（服务器配置）
3. **默认值**（空值）

## 🐛 常见问题

### Q: 热榜获取失败？
- 确保 DailyHotApi 服务已启动（`npm start` 会自动启动）
- 检查 `config.json` 中的 `dailyHotPort` 是否与 DailyHotApi 实际端口一致

### Q: 微信发布失败？
- 检查 `config.json` 中的 `wechat.appid` 和 `wechat.secret`
- 确认公众号有草稿箱权限

### Q: 封面图生成失败？
- 确认 `config.json` 中的 `imageModel` 配置正确
- 使用支持图片生成的模型（如 dall-e-3）

### Q: 端口被占用？
- 修改 `config.json` 中的 `server.port` 或 `server.dailyHotPort`
- 同步修改 `services/dailyhot-api/.env` 中的 `PORT`

## 🙏 致谢

- [DailyHotApi](https://github.com/imsyy/DailyHotApi) - 热榜数据源
- 原 Auto-wechat-writing 项目
- 原 china-hot-ranks 项目
- 原 wechat-publisher 项目

## 📄 许可证

MIT License
