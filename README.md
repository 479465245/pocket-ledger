# 记账本

一个基于 uni-app、Vue 3、Pinia 和 Vite 的本地记账应用。项目主打轻量、PWA 优先和离线可用，数据默认保存在本地存储中，不依赖后端服务。

更完整的业务说明和维护记录见 [wiki/wiki.md](wiki/wiki.md)。

## 功能特性

- 账单记录：支持支出、收入、转账，以及账单编辑和删除。
- 退款处理：支持对普通收入/支出创建退款账单，用于冲销余额且默认不参与统计。
- 资产管理：维护现金、微信、支付宝、银行卡等账户，支持多币种余额和是否计入总资产；资产账单明细可查看每笔余额快照并直接记一笔。
- 记账联动：添加或修改账单时，支出分类会自动回填该分类最近一次使用的资产，并按当前分类和资产提供最近 5 个备注候选。
- 分类管理：支持收入/支出分类、一级分类和二级分类。
- 统计分析：按月或按年查看收入、支出和分类占比，转账不参与统计且不在统计页显示。
- 数据导入：支持在 PWA/H5 中选择本地 `.xls` / `.xlsx` / `.csv` 文件，自动识别支付宝、微信或通用模板，并预览、校验导入数据。
- 数据导出：按日期范围导出账单数据，PWA/H5 优先弹出系统保存位置选择器，不支持时降级为浏览器下载。
- 备份还原：支持本地 JSON 完整备份和覆盖还原。
- WebDAV 备份：配置远程目录，上传备份文件或下载备份文件还原数据。
- 网络文件：配置下载/上传地址，用于导入文件下载和导出文件上传。
- 交叉校验：用外部账单流水核对本地账本，定位本地缺失、本地多余、资产不一致和疑似重复。
- AI 助手：支持配置 OpenAI-compatible 服务，对本地账本摘要进行对话式分析，并辅助识别 PDF 流水用于交叉校验。
- 本地持久化：资产、分类和账单通过 `uni.setStorageSync` 保存到本地。

## 技术栈

- uni-app
- Vue 3
- Pinia
- Vite
- Sass
- xlsx
- pdfjs-dist

## 快速开始

```bash
pnpm install
pnpm dev:h5
```

构建 H5 版本：

```bash
pnpm build:h5
```

正式功能验收以 PWA/H5 打包产物为主。每次执行 `pnpm build:h5` 会先自增补丁版本，并同步 `package.json`、`src/manifest.json`、设置菜单显示版本和 `src/static/version.txt`，打包产物固定输出到 `pwa-dist`；不要直接用 `uni build` 作为正式打包命令。

其他端的运行和构建脚本可在 [package.json](package.json) 中查看，例如 App、小程序、快应用等 uni-app 支持的平台。

## 目录结构

```text
.
├─ index.html
├─ 1024x1024.png
├─ package.json
├─ pnpm-lock.yaml
├─ vite.config.js
├─ src
│  ├─ App.vue
│  ├─ main.js
│  ├─ manifest.json
│  ├─ pages.json
│  ├─ store
│  │  ├─ asset.js
│  │  ├─ bill.js
│  │  └─ category.js
│  ├─ pages
│  │  ├─ index
│  │  ├─ bill
│  │  ├─ stats
│  │  ├─ settings
│  │  ├─ categories
│  │  └─ cross-check
│  ├─ static
│  └─ utils
└─ wiki
   └─ wiki.md
```

## 核心数据

应用的主要数据由 3 个 Pinia store 管理：

| Store | 文件 | 本地存储 key | 说明 |
| --- | --- | --- | --- |
| 资产 | `src/store/asset.js` | `account_book_assets` | 账户列表、初始余额、当前余额、多币种余额、是否计入总资产 |
| 分类 | `src/store/category.js` | `account_book_categories` | 收入/支出分类、一级/二级分类、隐藏系统分类 |
| 账单 | `src/store/bill.js` | `account_book_bills` | 账单流水、退款关系、转账字段、余额快照 |

账单是余额计算的核心。新增、编辑或删除账单后，系统会根据受影响的资产重新滚动计算余额，避免补录历史账单或修改旧账单后出现错账。

其他本地配置和会话数据：

| 数据 | 管理位置 | 本地存储 key | 说明 |
| --- | --- | --- | --- |
| WebDAV 配置 | `src/utils/webdav.js` | `webdav_configs` | WebDAV 地址、目录、用户名和密码 |
| 网络文件配置 | `src/utils/networkFile.js` | `network_file_configs` | 文件下载地址和上传地址 |
| 交叉校验会话 | `src/utils/crossCheck.js` | `account_book_cross_check_session` | 当前核对资产、日期范围和外部流水 |
| AI 配置 | `src/utils/llm.js` | `llm_config` | OpenAI-compatible 地址、模型和 API Key |

## 页面说明

- `pages/index/index`：账单明细首页。
- `pages/bill/add`：新增或编辑账单。
- `pages/stats/index`：收入/支出统计。
- `pages/stats/category`：分类统计详情。
- `pages/stats/list`：统计明细列表，也用于资产账单明细、日期筛选、余额快照和资产预选记账。
- `pages/settings/index`：设置 tab，提供导入、导出、备份、WebDAV、网络文件和交叉校验入口。
- `pages/settings/import`：数据导入。
- `pages/settings/cross-check`：选择资产、日期范围和外部流水文件，创建交叉校验会话。
- `pages/assistant/index`：AI 助手，基于账本摘要做对话式分析。
- `pages/settings/ai-config`：AI 服务配置和连接测试。
- `pages/settings/network-file`：网络文件下载/上传配置。
- `pages/settings/backup`：本地备份还原。
- `pages/settings/webdav`：WebDAV 远程备份还原。
- `pages/settings/export`：数据导出。
- `pages/cross-check/home`：交叉校验操作主页和汇总。
- `pages/cross-check/list`：交叉校验问题列表。
- `pages/categories/index`：分类管理。

## 核心流程

### 记账与余额

1. 记账页校验类型、金额、资产、分类、币种、转账目标资产和手续费。
2. 页面组装标准账单字段后调用 `billStore.addBill()` 或 `billStore.updateBill()`。
3. `billStore` 收集受影响资产，按账单时间从资产初始余额开始重新滚动计算。
4. 普通账单写入 `balanceSnapshot`，转账账单同时写入 `targetBalanceSnapshot`。
5. 资产当前余额由账单流水推导，不应长期绕过账单直接维护。

### 导入导出

1. 导入页读取本地文件或网络文件，并用 `xlsx` 转成二维数组。
2. `parseImportRows()` 识别支付宝、微信或通用模板，输出标准解析行、错误和警告。
3. 页面补齐资产、分类、时间戳和账单字段后逐条调用 `billStore.addBill()`。
4. 导出页按日期范围筛选账单，并使用资产、分类 store 转换为可读名称。
5. 通用模板字段包括日期、类型、资产、币种、金额、目标资产、目标币种、目标金额、一级分类、二级分类、手续费、是否计入统计、备注。
6. PWA/H5 下本地导入、备份还原和交叉校验使用浏览器文件选择能力，导出和备份使用 Blob 下载，避免依赖 App 文件系统 API。

### 备份与交叉校验

1. 本地备份和 WebDAV 备份都使用完整 JSON，包含 `bills`、`assets`、`categories`。
2. 覆盖还原前必须校验备份结构，还原后覆盖三类核心 store。
3. 交叉校验复用导入解析器读取外部流水，生成校验会话。
4. 核对逻辑按同日、同金额绝对值、同收支方向和资产名称匹配本地账单与外部流水。
5. 交叉校验报告本身不改账本；只有用户补记或删除时才通过 `billStore` 修改数据。

### AI 助手与 PDF 校验

1. AI 功能只支持 OpenAI-compatible `/v1/chat/completions` 接口，API 地址、模型和 Key 由用户在本机配置。
2. 账本分析默认只发送本地聚合摘要、分类统计、资产统计和少量大额/异常候选，不发送完整账本。
3. PDF 交叉校验会先尝试提取文本；文本不足时将 PDF 页面渲染为图片，并通过 `image_url` 发送到用户配置的模型服务识别流水。
4. AI 返回的流水必须经前端结构校验后才会创建交叉校验会话，最终匹配结果仍由本地 `crossCheck` 规则计算。
5. AI 不会直接新增、编辑、删除账单，也不会直接修改资产余额。

## 开发提示

- 项目是纯前端单机账本，清除本地缓存可能会丢失数据，建议通过导出功能定期备份。
- 转账会同时影响转出账户和转入账户，并分别保存余额快照。
- 统计默认只纳入 `isIncludedInStats !== false` 的收入和支出账单；转账始终不参与统计。
- 支出选择分类后会自动回填该分类最近一次使用的资产，并基于当前分类和资产显示最近备注候选，减少重复选账和输入。
- 删除、编辑、导入、交叉校验补记账单时都应通过 `billStore`，避免绕过余额重算。
- 使用 AI 功能前应确认模型服务和中转站可信；PDF 页面图片或文本会发送到用户配置的服务。
- 应用图标统一使用根目录 `1024x1024.png`，PWA manifest 和 uni-app manifest 都应指向这份资源。
- 调整导入导出字段、备份格式或核心业务规则时，需要同步更新 `README.md`、`wiki/wiki.md` 和 `AGENTS.md`。
- 如需了解业务细节、已知问题和后续维护建议，请查看 [wiki/wiki.md](wiki/wiki.md)。
