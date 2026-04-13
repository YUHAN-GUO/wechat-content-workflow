/**
 * 主入口
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const { getConfig } = require('./services/config');

// 加载配置
const config = getConfig();
const PORT = process.env.PORT || config.server.port || 3000;

const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 获取当前配置（不含敏感信息）
app.get('/api/config', (req, res) => {
  const cfg = getConfig();
  res.json({
    textModel: {
      apiUrl: cfg.textModel.apiUrl,
      modelName: cfg.textModel.modelName,
      hasApiKey: !!cfg.textModel.apiKey,
    },
    imageModel: {
      apiUrl: cfg.imageModel.apiUrl,
      modelName: cfg.imageModel.modelName,
      hasApiKey: !!cfg.imageModel.apiKey,
    },
    wechat: {
      appid: cfg.wechat.appid,
      hasSecret: !!cfg.wechat.secret,
    },
  });
});

// 保存配置
app.post('/api/config', (req, res) => {
  const { saveConfig, reloadConfig } = require('./services/config');
  const newConfig = req.body;
  
  if (saveConfig(newConfig)) {
    reloadConfig();
    res.json({ success: true, message: '配置已保存' });
  } else {
    res.status(500).json({ success: false, error: '保存失败' });
  }
});

// API 路由
app.use('/api', require('./routes/styles'));
app.use('/api', require('./routes/article'));
app.use('/api', require('./routes/titles'));
app.use('/api', require('./routes/cover'));
app.use('/api', require('./routes/publish'));
app.use('/api/hot-ranks', require('./routes/hotRanks'));

// 静态文件
app.use(express.static(path.join(__dirname, '../public')));

// 启动服务
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     公众号内容创作工作流 - WeChat Content Workflow       ║
╠══════════════════════════════════════════════════════════╣
║  🚀 服务运行中: http://localhost:${PORT}                    ║
║                                                          ║
║  配置文件: ./config.json                                 ║
║                                                          ║
║  功能模块:                                                ║
║  • 🔥 热榜获取    /api/hot-ranks/:platform               ║
║  • ✍️ 文章生成    POST /api/article                      ║
║  • 📝 标题生成    POST /api/titles                       ║
║  • 🖼️ 封面生成    POST /api/cover/*                      ║
║  • 📤 微信发布    POST /api/publish                      ║
╚══════════════════════════════════════════════════════════╝
  `);
});
