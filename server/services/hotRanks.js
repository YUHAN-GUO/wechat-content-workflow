/**
 * 热榜抓取服务
 * 直接调用本地 DailyHotApi 服务
 */

const { getConfig } = require('./config');

/**
 * 获取 DailyHotApi URL
 */
function getDailyHotUrl() {
  const config = getConfig();
  const port = config.server.dailyHotPort || 6688;
  return `http://localhost:${port}`;
}

/**
 * 获取所有支持的平台
 */
function getPlatforms() {
  return [
    { id: 'weibo', name: '微博热搜', icon: '🔥' },
    { id: 'zhihu', name: '知乎热榜', icon: '📚' },
    { id: 'bilibili', name: 'B站热门', icon: '📺' },
    { id: 'baidu', name: '百度热搜', icon: '🔍' },
    { id: 'douyin', name: '抖音热榜', icon: '🎵' },
    { id: '36kr', name: '36氪', icon: '💼' },
    { id: 'juejin', name: '掘金', icon: '💎' },
    { id: 'csdn', name: 'CSDN', icon: '💻' },
    { id: 'ithome', name: 'IT之家', icon: '📱' },
  ];
}

/**
 * 获取指定平台热榜
 */
async function fetchHotRanks(platform) {
  try {
    const dailyHotUrl = getDailyHotUrl();
    const response = await fetch(`${dailyHotUrl}/${platform}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 200 || !data.data) {
      throw new Error(data.message || '返回数据异常');
    }

    // 转换为统一格式
    return data.data.slice(0, 20).map((item, index) => ({
      rank: index + 1,
      title: item.title,
      url: item.url || item.mobileUrl,
      hot: formatHot(item.hot),
      desc: item.desc,
    }));
  } catch (error) {
    console.error(`${platform} 热榜获取失败:`, error.message);
    // 返回空数组，前端会显示空状态
    return [];
  }
}

/**
 * 格式化热度数字
 */
function formatHot(hot) {
  if (!hot) return '-';
  
  const num = parseInt(hot, 10);
  if (isNaN(num)) return String(hot);
  
  if (num >= 100000000) {
    return (num / 100000000).toFixed(1) + '亿';
  }
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return String(num);
}

module.exports = {
  fetchHotRanks,
  getPlatforms,
};
