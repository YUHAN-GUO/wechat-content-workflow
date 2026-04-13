/**
 * 风格加载服务
 * 复用自 Auto-wechat-writing
 */

const fs = require('fs');
const path = require('path');

const STYLES_DIR = path.join(__dirname, '../styles');

/**
 * 获取所有可用风格
 */
function getStyles() {
  try {
    if (!fs.existsSync(STYLES_DIR)) {
      return [];
    }

    const files = fs.readdirSync(STYLES_DIR);
    const styles = files
      .filter(f => f.endsWith('.txt'))
      .map(f => {
        const name = path.basename(f, '.txt');
        const content = fs.readFileSync(path.join(STYLES_DIR, f), 'utf-8');
        return { name, content };
      });

    return styles;
  } catch (error) {
    console.error('加载风格文件失败:', error);
    return [];
  }
}

/**
 * 获取指定风格内容
 */
function getStyle(name) {
  try {
    const filePath = path.join(STYLES_DIR, `${name}.txt`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`加载风格 ${name} 失败:`, error);
    return null;
  }
}

module.exports = {
  getStyles,
  getStyle,
};
