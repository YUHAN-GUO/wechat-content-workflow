/**
 * 微信发布服务
 * Node.js 重写版（原 publisher.py）
 */

const https = require('https');
const { createCanvas } = require('canvas');

class WeChatPublisher {
  constructor(appid, secret) {
    this.appid = appid;
    this.secret = secret;
    this.accessToken = null;
    this.baseUrl = 'https://api.weixin.qq.com/cgi-bin';
  }

  /**
   * 获取 Access Token
   */
  async getAccessToken() {
    console.log('🔑 正在获取 access_token...');
    
    const url = `${this.baseUrl}/token?grant_type=client_credential&appid=${this.appid}&secret=${this.secret}`;
    
    try {
      const data = await this._httpsGet(url);
      
      if (data.access_token) {
        this.accessToken = data.access_token;
        console.log(`✅ access_token 获取成功（有效期 ${data.expires_in / 60} 分钟）`);
        return this.accessToken;
      } else {
        console.error(`❌ access_token 获取失败：${data.errcode} - ${data.errmsg}`);
        return null;
      }
    } catch (error) {
      console.error('❌ 网络请求失败：', error.message);
      return null;
    }
  }

  /**
   * 上传封面图片获取 media_id
   */
  async uploadImage(imageBuffer) {
    if (!this.accessToken) {
      throw new Error('请先获取 access_token');
    }

    console.log('🖼️ 正在上传封面图片...');

    const url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${this.accessToken}&type=image`;
    
    try {
      // 构造 multipart/form-data
      const boundary = `----FormBoundary${Date.now()}`;
      const chunks = [];
      
      // 写入文件字段
      chunks.push(Buffer.from(`--${boundary}\r\n`));
      chunks.push(Buffer.from('Content-Disposition: form-data; name="media"; filename="cover.jpg"\r\n'));
      chunks.push(Buffer.from('Content-Type: image/jpeg\r\n\r\n'));
      chunks.push(imageBuffer);
      chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));
      
      const body = Buffer.concat(chunks);
      
      const data = await this._httpsPost(url, body, {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      });

      if (data.media_id) {
        console.log(`✅ 封面图片上传成功！media_id: ${data.media_id}`);
        return data.media_id;
      } else {
        console.error(`❌ 封面图片上传失败：${data.errcode} - ${data.errmsg}`);
        return null;
      }
    } catch (error) {
      console.error('❌ 上传失败：', error.message);
      return null;
    }
  }

  /**
   * 生成默认封面图
   */
  async generateDefaultCover(title = 'Article') {
    console.log('📌 正在生成默认封面...');
    
    try {
      const width = 900;
      const height = 500;
      
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      
      // 渐变背景
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#1e3a5f');
      gradient.addColorStop(1, '#3d2b5d');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      // 文字
      const text = title.slice(0, 20);
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 文字阴影
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(text, width/2 + 2, height/2 + 2);
      
      // 文字本体
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, width/2, height/2);
      
      // 转为 buffer
      const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
      return buffer;
    } catch (error) {
      console.error('❌ 默认封面生成失败：', error.message);
      return null;
    }
  }

  /**
   * 创建草稿
   */
  async createDraft({ title, content, author = '作者', digest = '', thumbMediaId = null }) {
    if (!this.accessToken) {
      throw new Error('请先获取 access_token');
    }

    console.log(`📝 正在上传草稿：${title}`);

    const url = `${this.baseUrl}/draft/add?access_token=${this.accessToken}`;
    
    const safeTitle = title.slice(0, 64);
    const safeDigest = digest.slice(0, 120);
    
    const articles = {
      articles: [{
        title: safeTitle,
        author: author,
        digest: safeDigest,
        content: content,
        content_source_url: '',
        thumb_media_id: thumbMediaId,
        show_cover_pic: 1,
        need_open_comment: 0,
        only_fans_can_comment: 0,
      }],
    };

    try {
      const data = await this._httpsPost(url, JSON.stringify(articles), {
        'Content-Type': 'application/json; charset=utf-8',
      });

      if (data.media_id) {
        console.log(`✅ 草稿上传成功！media_id: ${data.media_id}`);
        return data.media_id;
      } else {
        console.error(`❌ 草稿上传失败：${data.errcode} - ${data.errmsg}`);
        
        // 封面裁剪失败，尝试用默认封面
        if (data.errcode === 53402 && !thumbMediaId) {
          console.log('💡 尝试上传默认封面后重试...');
          const defaultCoverBuffer = await this.generateDefaultCover(title);
          if (defaultCoverBuffer) {
            const defaultMediaId = await this.uploadImage(defaultCoverBuffer);
            if (defaultMediaId) {
              return this.createDraft({ title, content, author, digest, thumbMediaId: defaultMediaId });
            }
          }
        }
        
        return null;
      }
    } catch (error) {
      console.error('❌ 请求失败：', error.message);
      return null;
    }
  }

  /**
   * Markdown 转微信兼容 HTML
   */
  markdownToWechatHTML(mdText) {
    const MarkdownIt = require('markdown-it');
    const md = new MarkdownIt({
      html: true,
      breaks: true,
      linkify: true,
    });

    let html = md.render(mdText);

    // 1. 标题样式化
    html = html.replace(/<h1[^>]*>(.*?)<\/h1>/g, 
      '<section style="font-size:20px;font-weight:bold;margin:20px 0 10px;color:#333;">$1</section>');
    html = html.replace(/<h2[^>]*>(.*?)<\/h2>/g,
      '<section style="font-size:18px;font-weight:bold;margin:16px 0 8px;color:#333;">$1</section>');
    html = html.replace(/<h3[^>]*>(.*?)<\/h3>/g,
      '<section style="font-size:16px;font-weight:bold;margin:12px 0 6px;color:#333;">$1</section>');

    // 2. 段落样式化
    html = html.replace(/<p>(.*?)<\/p>/gs,
      '<section style="font-size:17px;line-height:1.75;color:#333;margin:12px 0;word-break:break-word;">$1</section>');

    // 3. 引用块样式化
    html = html.replace(/<blockquote>(.*?)<\/blockquote>/gs,
      '<section style="border-left:4px solid #ddd;padding:8px 12px;margin:12px 0;color:#666;font-style:italic;background:#f9f9f9;">$1</section>');

    // 4. 代码块样式化
    html = html.replace(/<pre><code[^>]*>(.*?)<\/code><\/pre>/gs,
      '<section style="background:#f6f8fa;padding:12px;border-radius:6px;margin:12px 0;overflow-x:auto;font-size:14px;"><pre style="margin:0;">$1</pre></section>');

    // 5. 行内代码样式化
    html = html.replace(/<code>(.*?)<\/code>/g,
      '<code style="background:#f6f8fa;padding:2px 6px;border-radius:3px;font-size:14px;color:#e83e8c;">$1</code>');

    // 6. 列表样式化
    html = html.replace(/<ul>/g, '<section style="margin:12px 0;padding-left:20px;">');
    html = html.replace(/<\/ul>/g, '</section>');
    html = html.replace(/<li>/g, '<section style="margin:6px 0;">• ');
    html = html.replace(/<\/li>/g, '</section>');

    // 7. 链接样式化
    html = html.replace(/<a href="([^"]*)"[^>]*>(.*?)<\/a>/g,
      '<a href="$1" style="color:#576b95;text-decoration:none;">$2</a>');

    // 8. 图片样式化
    html = html.replace(/<img[^>]*src="([^"]*)"[^>]*>/g,
      '<section style="text-align:center;margin:12px 0;"><img src="$1" style="max-width:100%;height:auto;border-radius:4px;" /></section>');

    // 9. 表格样式化
    html = html.replace(/<table>/g,
      '<section style="overflow-x:auto;margin:12px 0;"><table style="width:100%;border-collapse:collapse;font-size:14px;">');
    html = html.replace(/<\/table>/g, '</table></section>');
    html = html.replace(/<th>/g, '<th style="border:1px solid #ddd;padding:8px;background:#f6f8fa;font-weight:bold;">');
    html = html.replace(/<td>/g, '<td style="border:1px solid #ddd;padding:8px;">');

    return html;
  }

  /**
   * HTTP GET 请求
   */
  _httpsGet(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * HTTP POST 请求
   */
  _httpsPost(url, body, headers = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}

module.exports = WeChatPublisher;
