export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'qwen3.5:9b',
  allowedOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173'],
};
