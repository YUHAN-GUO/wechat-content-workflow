/**
 * AI 服务 - 处理 OpenAI 兼容 API 的请求
 * 复用自 Auto-wechat-writing
 */

const API_TIMEOUT = 120000; // 2分钟超时

/**
 * 创建流式聊天完成
 */
async function createChatCompletionStream({ apiUrl, apiKey, modelName, messages, onChunk }) {
  const url = `${apiUrl.replace(/\/$/, '')}/chat/completions`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API 请求失败: ${response.status} - ${error}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              onChunk?.(content, fullContent);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullContent;
}

/**
 * 创建非流式聊天完成
 */
async function createChatCompletionJSON({ apiUrl, apiKey, modelName, messages, temperature = 0.7 }) {
  const url = `${apiUrl.replace(/\/$/, '')}/chat/completions`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API 请求失败: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('API 请求超时，请检查网络或模型状态');
    }
    throw error;
  }
}

/**
 * 创建图片
 */
async function createImage({ apiUrl, apiKey, modelName, prompt, size = '3008x1280' }) {
  const url = `${apiUrl.replace(/\/$/, '')}/images/generations`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        prompt,
        size,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`图片生成失败: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    // 处理不同格式的响应
    if (data.data && data.data[0]) {
      return {
        url: data.data[0].url,
        b64_json: data.data[0].b64_json,
        revised_prompt: data.data[0].revised_prompt,
      };
    }
    
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('图片生成超时，请重试');
    }
    throw error;
  }
}

/**
 * 解析 JSON（容错处理）
 */
function parseJSON(text) {
  // 尝试直接解析
  try {
    return JSON.parse(text);
  } catch (e) {
    // 尝试提取 JSON 代码块
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (e2) {
        // 继续尝试其他方法
      }
    }
    
    // 尝试查找方括号或花括号包裹的内容
    const bracketMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (bracketMatch) {
      try {
        return JSON.parse(bracketMatch[1]);
      } catch (e3) {
        // 失败
      }
    }
    
    throw new Error('无法解析 JSON 响应');
  }
}

module.exports = {
  createChatCompletionStream,
  createChatCompletionJSON,
  createImage,
  parseJSON,
};
