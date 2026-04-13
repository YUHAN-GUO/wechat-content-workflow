/**
 * 公众号内容创作工作流 - 前端应用
 */

const App = {
  // 状态
  state: {
    currentPlatform: 'weibo',
    hotData: {},
    generatedArticle: '',
    generatedTitles: [],
    selectedTitle: '',
    selectedSummary: '',
    coverImageUrl: '',
    currentCoverPrompt: '',
    apiConfig: {
      apiUrl: '',
      apiKey: '',
      modelName: '',
      imageApiUrl: '',
      imageApiKey: '',
      imageModel: '',
    },
    wechatConfig: {
      appid: '',
      secret: '',
    },
  },

  // 初始化
  async init() {
    await this.loadServerConfig(); // 从服务器加载配置文件
    this.loadSettings();
    this.loadWechatConfig();
    await this.loadStyles();
    await this.loadHotRanks('weibo');
    this.updateUI();
  },

  // 从服务器加载配置文件
  async loadServerConfig() {
    try {
      const res = await fetch('/api/config');
      const cfg = await res.json();
      
      // 如果服务器有配置，使用服务器配置
      if (cfg.textModel?.apiUrl) {
        this.state.apiConfig.apiUrl = cfg.textModel.apiUrl;
        this.state.apiConfig.modelName = cfg.textModel.modelName;
        // API Key 不会从服务器返回，需要用户自行输入
      }
      
      if (cfg.imageModel?.apiUrl) {
        this.state.apiConfig.imageApiUrl = cfg.imageModel.apiUrl;
        this.state.apiConfig.imageModel = cfg.imageModel.modelName;
      }
      
      if (cfg.wechat?.appid) {
        this.state.wechatConfig.appid = cfg.wechat.appid;
        document.getElementById('publish-appid').value = cfg.wechat.appid;
      }
      
      this.fillSettingsForm();
    } catch (err) {
      console.log('服务器配置加载失败，使用本地存储:', err.message);
    }
  },

  // 加载设置
  loadSettings() {
    const saved = localStorage.getItem('apiConfig');
    if (saved) {
      this.state.apiConfig = JSON.parse(saved);
      this.fillSettingsForm();
    }
    this.updateGenerateButton();
  },

  // 加载微信配置
  loadWechatConfig() {
    const saved = localStorage.getItem('wechatConfig');
    if (saved) {
      this.state.wechatConfig = JSON.parse(saved);
      document.getElementById('publish-appid').value = this.state.wechatConfig.appid || '';
      document.getElementById('publish-secret').value = this.state.wechatConfig.secret || '';
    }
  },

  // 填充设置表单
  fillSettingsForm() {
    const cfg = this.state.apiConfig;
    document.getElementById('settings-api-url').value = cfg.apiUrl || '';
    document.getElementById('settings-api-key').value = cfg.apiKey || '';
    document.getElementById('settings-model-name').value = cfg.modelName || '';
    document.getElementById('settings-image-api-url').value = cfg.imageApiUrl || '';
    document.getElementById('settings-image-api-key').value = cfg.imageApiKey || '';
    document.getElementById('settings-image-model').value = cfg.imageModel || '';
  },

  // 加载风格列表
  async loadStyles() {
    try {
      const res = await fetch('/api/styles');
      const data = await res.json();
      const select = document.getElementById('style-select');
      select.innerHTML = data.styles.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
      this.updateGenerateButton();
    } catch (err) {
      console.error('加载风格失败:', err);
    }
  },

  // 加载热榜
  async loadHotRanks(platform) {
    this.state.currentPlatform = platform;
    const container = document.getElementById('hot-list');
    container.innerHTML = '<div class="p-8 text-center text-slate-400"><i class="fas fa-spinner fa-spin text-2xl mb-3"></i><p>正在加载...</p></div>';

    try {
      const res = await fetch(`/api/hot-ranks/${platform}`);
      const data = await res.json();
      this.state.hotData[platform] = data.data;
      this.renderHotList(data.data);
    } catch (err) {
      container.innerHTML = `<div class="p-8 text-center text-red-400"><i class="fas fa-exclamation-circle text-2xl mb-3"></i><p>加载失败: ${err.message}</p></div>`;
    }
  },

  // 渲染热榜列表
  renderHotList(data) {
    const container = document.getElementById('hot-list');
    if (!data || data.length === 0) {
      container.innerHTML = '<div class="p-8 text-center text-slate-400">暂无数据</div>';
      return;
    }

    container.innerHTML = data.map((item, index) => `
      <div class="p-3 hover:bg-slate-50 transition-colors group border-b border-slate-50 last:border-0">
        <div class="flex items-start gap-2">
          <span class="flex-shrink-0 w-5 h-5 rounded-full ${index < 3 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'} flex items-center justify-center text-xs font-bold mt-0.5">
            ${item.rank || index + 1}
          </span>
          <div class="flex-1 min-w-0">
            <div class="text-sm text-slate-800 font-medium leading-tight cursor-pointer hover:text-primary-600 transition-colors" onclick="App.selectTopic('${item.title.replace(/'/g, "\\'")}')">${item.title}</div>
            ${item.hot ? `<div class="text-xs text-slate-400 mt-1">${item.hot}</div>` : ''}
            <!-- 操作按钮 -->
            <div class="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              ${item.url ? `
                <button onclick="App.openUrl('${item.url.replace(/'/g, "\\'")}')" class="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors flex items-center gap-1">
                  <i class="fas fa-external-link-alt text-[10px]"></i>
                  打开
                </button>
              ` : ''}
              <button onclick="App.copyText('${item.title.replace(/'/g, "\\'")}')" class="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors flex items-center gap-1">
                <i class="far fa-copy text-[10px]"></i>
                复制
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  },

  // 切换平台
  switchPlatform(platform) {
    // 更新标签样式
    document.querySelectorAll('.platform-tab').forEach(tab => {
      if (tab.dataset.platform === platform) {
        tab.classList.add('text-primary-600', 'border-b-2', 'border-primary-600', 'bg-primary-50/50');
        tab.classList.remove('text-slate-500');
      } else {
        tab.classList.remove('text-primary-600', 'border-b-2', 'border-primary-600', 'bg-primary-50/50');
        tab.classList.add('text-slate-500');
      }
    });

    // 加载数据
    if (this.state.hotData[platform]) {
      this.renderHotList(this.state.hotData[platform]);
    } else {
      this.loadHotRanks(platform);
    }
  },

  // 刷新热榜
  refreshHotRanks() {
    this.loadHotRanks(this.state.currentPlatform);
  },

  // 选择话题
  selectTopic(title) {
    document.getElementById('topic-input').value = title;
    this.showToast('已填入主题', 'success');

    // 滚动到写作区域
    document.getElementById('topic-input').scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  // 打开 URL
  openUrl(url) {
    if (url && url !== '#') {
      window.open(url, '_blank');
    } else {
      this.showToast('无效链接', 'error');
    }
  },

  // 复制文本
  copyText(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('已复制', 'success');
      }).catch(() => {
        this.fallbackCopy(text);
      });
    } else {
      this.fallbackCopy(text);
    }
  },

  // 备用复制方法
  fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      this.showToast('已复制', 'success');
    } catch (err) {
      this.showToast('复制失败', 'error');
    }
    document.body.removeChild(textarea);
  },

  // 更新生成按钮状态
  updateGenerateButton() {
    const hasApi = this.state.apiConfig.apiUrl && this.state.apiConfig.apiKey && this.state.apiConfig.modelName;
    const btn = document.getElementById('btn-generate');
    btn.disabled = !hasApi;
    if (!hasApi) {
      btn.title = '请先配置 API 设置';
    }
  },

  // 打开设置
  openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
  },

  // 关闭设置
  closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
  },

  // 保存设置
  saveSettings() {
    this.state.apiConfig = {
      apiUrl: document.getElementById('settings-api-url').value.trim(),
      apiKey: document.getElementById('settings-api-key').value.trim(),
      modelName: document.getElementById('settings-model-name').value.trim(),
      imageApiUrl: document.getElementById('settings-image-api-url').value.trim() || document.getElementById('settings-api-url').value.trim(),
      imageApiKey: document.getElementById('settings-image-api-key').value.trim() || document.getElementById('settings-api-key').value.trim(),
      imageModel: document.getElementById('settings-image-model').value.trim(),
    };

    localStorage.setItem('apiConfig', JSON.stringify(this.state.apiConfig));
    this.closeSettings();
    this.updateGenerateButton();
    this.showToast('设置已保存', 'success');
  },

  // 生成文章
  async generateArticle() {
    const topic = document.getElementById('topic-input').value.trim();
    const requirements = document.getElementById('requirements-input').value.trim();
    const style = document.getElementById('style-select').value;
    
    if (!topic) {
      this.showToast('请输入文章主题', 'error');
      return;
    }

    const btn = document.getElementById('btn-generate');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>写作中...</span>';
    btn.disabled = true;

    const outputSection = document.getElementById('article-output');
    const contentDiv = document.getElementById('article-content');
    outputSection.classList.remove('hidden');
    contentDiv.innerHTML = '<div class="text-slate-400">AI 正在思考...</div>';

    try {
      const res = await fetch('/api/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          requirements,
          style,
          ...this.state.apiConfig,
        }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.full) {
                fullContent = parsed.full;
                contentDiv.innerHTML = marked.parse(fullContent);
              }
            } catch (e) {
              // 忽略
            }
          }
        }
      }

      this.state.generatedArticle = fullContent;
      document.getElementById('btn-titles').disabled = false;
      this.showToast('文章生成完成', 'success');
    } catch (err) {
      contentDiv.innerHTML = `<div class="text-red-500">生成失败: ${err.message}</div>`;
      this.showToast('生成失败', 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  },

  // 复制文章
  copyArticle() {
    if (!this.state.generatedArticle) return;
    navigator.clipboard.writeText(this.state.generatedArticle);
    this.showToast('已复制到剪贴板', 'success');
  },

  // 生成标题
  async generateTitles() {
    if (!this.state.generatedArticle) return;

    const btn = document.getElementById('btn-titles');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>生成中...</span>';
    btn.disabled = true;

    try {
      const res = await fetch('/api/titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article: this.state.generatedArticle,
          apiUrl: this.state.apiConfig.apiUrl,
          apiKey: this.state.apiConfig.apiKey,
          modelName: this.state.apiConfig.modelName,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      this.state.generatedTitles = data.titles;
      this.renderTitles(data.titles);
      
      document.getElementById('titles-output').classList.remove('hidden');
      this.showToast('标题生成完成', 'success');
    } catch (err) {
      this.showToast('生成失败: ' + err.message, 'error');
    } finally {
      btn.innerHTML = '<i class="fas fa-heading"></i> <span>生成标题摘要</span>';
      btn.disabled = false;
    }
  },

  // 渲染标题列表
  renderTitles(titles) {
    const container = document.getElementById('titles-list');
    container.innerHTML = titles.map((t, i) => `
      <div class="p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all ${i === 0 ? 'border-primary-400 bg-primary-50' : ''}" onclick="App.selectTitle(${i}, this)">
        <div class="font-medium text-slate-800 mb-1">${t.title}</div>
        <div class="text-xs text-slate-500">${t.summary}</div>
      </div>
    `).join('');

    // 默认选中第一个
    if (titles.length > 0) {
      this.selectTitle(0, container.firstElementChild);
    }
  },

  // 选择标题
  selectTitle(index, element) {
    // 更新样式
    element.parentElement.querySelectorAll('div').forEach(el => {
      el.classList.remove('border-primary-400', 'bg-primary-50');
    });
    element.classList.add('border-primary-400', 'bg-primary-50');

    this.state.selectedTitle = this.state.generatedTitles[index].title;
    this.state.selectedSummary = this.state.generatedTitles[index].summary;
  },

  // 生成封面 Prompt
  async generateCoverPrompts() {
    if (!this.state.generatedArticle) return;

    const btn = document.getElementById('btn-cover');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>生成中...</span>';
    btn.disabled = true;

    try {
      const res = await fetch('/api/cover/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article: this.state.generatedArticle,
          apiUrl: this.state.apiConfig.apiUrl,
          apiKey: this.state.apiConfig.apiKey,
          modelName: this.state.apiConfig.modelName,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      this.renderCoverPrompts(data);
      document.getElementById('cover-output').classList.remove('hidden');
    } catch (err) {
      this.showToast('生成失败: ' + err.message, 'error');
    } finally {
      btn.innerHTML = '<i class="fas fa-image"></i> <span>生成封面图</span>';
      btn.disabled = false;
    }
  },

  // 渲染封面 Prompts
  renderCoverPrompts(data) {
    const container = document.getElementById('cover-prompts');
    container.innerHTML = data.prompts.map((p, i) => `
      <div class="p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-all text-sm" onclick="App.generateCoverImage(${i}, '${encodeURIComponent(p)}', this)">
        <div class="font-medium text-slate-700 mb-1">风格 ${i + 1}</div>
        <div class="text-xs text-slate-500 line-clamp-2">${p}</div>
      </div>
    `).join('');
  },

  // 生成封面图
  async generateCoverImage(index, promptEncoded, element) {
    const prompt = decodeURIComponent(promptEncoded);
    this.state.currentCoverPrompt = prompt;

    // 显示 loading
    element.innerHTML = '<div class="flex items-center gap-2"><i class="fas fa-spinner fa-spin"></i> 生成中...</div>';

    try {
      const res = await fetch('/api/cover/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          apiUrl: this.state.apiConfig.imageApiUrl,
          apiKey: this.state.apiConfig.imageApiKey,
          modelName: this.state.apiConfig.imageModel,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      this.state.coverImageUrl = data.url || `/api/cover/proxy?url=${encodeURIComponent(data.url)}`;
      
      // 显示图片
      const img = document.getElementById('cover-image');
      img.src = data.url ? `/api/cover/proxy?url=${encodeURIComponent(data.url)}` : `data:image/png;base64,${data.b64_json}`;
      
      document.getElementById('cover-image-container').classList.remove('hidden');
      
      // 更新预览
      document.getElementById('publish-cover-preview').innerHTML = `<img src="${img.src}" class="h-full w-full object-cover rounded-xl">`;

      this.showToast('封面生成完成', 'success');
    } catch (err) {
      element.innerHTML = '<div class="text-red-500">生成失败</div>';
      this.showToast('封面生成失败: ' + err.message, 'error');
    }
  },

  // 下载封面
  async downloadCover() {
    if (!this.state.coverImageUrl) return;

    try {
      const res = await fetch('/api/cover/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: this.state.coverImageUrl }),
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cover-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.showToast('封面已下载', 'success');
    } catch (err) {
      this.showToast('下载失败', 'error');
    }
  },

  // 填充发布表单
  fillPublishForm() {
    document.getElementById('publish-title').value = this.state.selectedTitle || '';
    document.getElementById('publish-content').value = this.state.generatedArticle || '';
    
    // 滚动到发布区域
    document.getElementById('publish-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.showToast('已填入发布表单', 'success');
  },

  // 发布到微信
  async publishToWechat() {
    const appid = document.getElementById('publish-appid').value.trim();
    const secret = document.getElementById('publish-secret').value.trim();
    const title = document.getElementById('publish-title').value.trim();
    const author = document.getElementById('publish-author').value.trim();
    const content = document.getElementById('publish-content').value.trim();
    const saveConfig = document.getElementById('save-config').checked;

    if (!appid || !secret || !title || !content) {
      this.showToast('请填写完整信息', 'error');
      return;
    }

    // 保存配置
    if (saveConfig) {
      localStorage.setItem('wechatConfig', JSON.stringify({ appid, secret }));
    }

    const btn = document.getElementById('btn-publish');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>发布中...</span>';
    btn.disabled = true;

    const resultDiv = document.getElementById('publish-result');
    resultDiv.classList.add('hidden');

    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appid,
          secret,
          title,
          content,
          author,
          digest: this.state.selectedSummary || '',
          coverUrl: this.state.coverImageUrl,
        }),
      });

      const data = await res.json();
      
      resultDiv.classList.remove('hidden');
      if (data.success) {
        resultDiv.className = 'rounded-xl p-4 text-sm bg-emerald-50 text-emerald-700 border border-emerald-200';
        resultDiv.innerHTML = `
          <div class="flex items-center gap-2 mb-2">
            <i class="fas fa-check-circle text-emerald-600"></i>
            <span class="font-medium">发布成功！</span>
          </div>
          <div class="text-xs text-emerald-600">Media ID: ${data.mediaId}</div>
          <div class="mt-2 text-xs">请前往公众号后台查看并发布</div>
        `;
        this.showToast('发布成功！', 'success');
      } else {
        resultDiv.className = 'rounded-xl p-4 text-sm bg-red-50 text-red-700 border border-red-200';
        resultDiv.innerHTML = `
          <div class="flex items-center gap-2">
            <i class="fas fa-exclamation-circle"></i>
            <span>${data.error || '发布失败'}</span>
          </div>
        `;
        this.showToast('发布失败', 'error');
      }
    } catch (err) {
      resultDiv.classList.remove('hidden');
      resultDiv.className = 'rounded-xl p-4 text-sm bg-red-50 text-red-700 border border-red-200';
      resultDiv.innerHTML = `<div class="flex items-center gap-2"><i class="fas fa-exclamation-circle"></i><span>${err.message}</span></div>`;
      this.showToast('发布失败', 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  },

  // 显示 Toast
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    const colors = {
      success: 'bg-emerald-500',
      error: 'bg-red-500',
      info: 'bg-slate-700',
    };

    toast.className = `${colors[type]} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-toast-in`;
    toast.innerHTML = `
      <i class="fas ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-exclamation' : 'fa-info'}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('animate-toast-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // 更新 UI
  updateUI() {
    this.updateGenerateButton();
  },
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
