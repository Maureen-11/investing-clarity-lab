# CloudBase 免费内测接口

这个目录只包含免费内测所需的无密钥 HTTP 函数适配层。它读取项目已经公开的三份数据文件，不直接请求 Yahoo、Twelve Data 或其他行情服务，也不保存用户信息。

## 部署边界

- 使用 CloudBase 免费体验环境即可验证接口和大陆访问。
- 不要在这个目录或 CloudBase 环境变量中提交数据源密钥。
- `MARKET_DATA_DIR` 可指向部署包内的 `public/data`；若部署工具使用其他路径，请在控制台配置该环境变量。
- `ALLOWED_ORIGIN` 可限制前端来源；免费内测暂时可使用 `*`，正式版必须改为实际域名。
- 函数内置每个客户端每分钟 60 次只读请求限流和 5 分钟内存缓存。

## HTTP 路径

- `GET /v1/directory`：完整证券目录。
- `GET /v1/history`：当前已核验的 ETF 历史快照。
- `GET /v1/macro`：CPI 与汇率快照。
- `GET /v1/search?q=VOO&market=US`：按市场检索目录。
- `GET /v1/capabilities`：返回每个证券的分析能力状态。

接口中的“目录存在”不代表“有长期收益结论”。历史缺失的 ETF 返回目录状态，个股返回事实统计模式；前端也会保留静态快照作为 CloudBase 不可用时的安全回退。
