/**
 * 统一配置管理
 * 从 config.json 加载配置，并提供默认值
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../../config.json');

// 默认配置
const defaultConfig = {
  // 文本生成模型配置
  textModel: {
    apiUrl: '',           // 如: https://api.openai.com/v1
    apiKey: '',           // 如: sk-xxx
    modelName: '',        // 如: gpt-4o
  },
  
  // 图片生成模型配置
  imageModel: {
    apiUrl: '',           // 如: https://api.openai.com/v1
    apiKey: '',           // 如: sk-xxx
    modelName: '',        // 如: dall-e-3
  },
  
  // 微信公众号配置
  wechat: {
    appid: '',            // 微信公众号 AppID
    secret: '',           // 微信公众号 AppSecret
  },
  
  // 服务配置
  server: {
    port: 3000,           // 主服务端口
    dailyHotPort: 6688,   // DailyHotApi 端口
  },
};

/**
 * 加载配置
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const fileContent = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const userConfig = JSON.parse(fileContent);
      return mergeConfig(defaultConfig, userConfig);
    }
  } catch (error) {
    console.error('加载配置文件失败:', error.message);
  }
  return { ...defaultConfig };
}

/**
 * 合并配置（深度合并）
 */
function mergeConfig(defaults, user) {
  const result = { ...defaults };
  for (const key in user) {
    if (user[key] && typeof user[key] === 'object' && !Array.isArray(user[key])) {
      result[key] = mergeConfig(defaults[key] || {}, user[key]);
    } else {
      result[key] = user[key];
    }
  }
  return result;
}

/**
 * 保存配置
 */
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('保存配置文件失败:', error.message);
    return false;
  }
}

/**
 * 获取当前配置（单例）
 */
let cachedConfig = null;
function getConfig() {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

/**
 * 重新加载配置
 */
function reloadConfig() {
  cachedConfig = loadConfig();
  return cachedConfig;
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfig,
  reloadConfig,
  defaultConfig,
  CONFIG_FILE,
};
