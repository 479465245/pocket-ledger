# 记账本

一个基于 uni-app、Vue 3、Pinia 和 Vite 的本地记账应用。项目主打轻量、多端和离线可用，数据默认保存在本地存储中，不依赖后端服务。

更完整的业务说明和维护记录见 [wiki/wiki.md](wiki/wiki.md)。

## 功能特性

- 账单记录：支持支出、收入、转账，以及账单编辑和删除。
- 资产管理：维护现金、微信、支付宝等账户，并根据账单自动重算余额。
- 分类管理：支持收入/支出分类、一级分类和二级分类。
- 统计分析：按月或按年查看收入、支出和分类占比。
- 数据导入：支持读取 `.xls` / `.xlsx` 文件并预览、校验导入数据。
- 数据导出：按日期范围导出账单数据。
- 本地持久化：资产、分类和账单通过 `uni.setStorageSync` 保存到本地。

## 技术栈

- uni-app
- Vue 3
- Pinia
- Vite
- Sass
- xlsx

## 快速开始

```bash
pnpm install
pnpm dev:h5
```

构建 H5 版本：

```bash
pnpm build:h5
```

其他端的运行和构建脚本可在 [package.json](package.json) 中查看，例如 App、小程序、快应用等 uni-app 支持的平台。

## 目录结构

```text
.
├─ index.html
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
│  │  └─ categories
│  ├─ static
│  └─ utils
└─ wiki
   └─ wiki.md
```

## 核心数据

应用的主要数据由 3 个 Pinia store 管理：

| Store | 文件 | 本地存储 key | 说明 |
| --- | --- | --- | --- |
| 资产 | `src/store/asset.js` | `account_book_assets` | 账户列表、初始余额、当前余额 |
| 分类 | `src/store/category.js` | `account_book_categories` | 收入/支出分类、一级/二级分类 |
| 账单 | `src/store/bill.js` | `account_book_bills` | 账单流水、转账、余额快照 |

账单是余额计算的核心。新增、编辑或删除账单后，系统会根据受影响的资产重新滚动计算余额，避免补录历史账单或修改旧账单后出现错账。

## 页面说明

- `pages/index/index`：账单明细首页。
- `pages/bill/add`：新增或编辑账单。
- `pages/stats/index`：收入/支出统计。
- `pages/stats/category`：分类统计详情。
- `pages/stats/list`：统计明细列表。
- `pages/settings/index`：设置入口和资产概览。
- `pages/settings/assets`：资产管理。
- `pages/settings/import`：数据导入。
- `pages/settings/export`：数据导出。
- `pages/categories/index`：分类管理。

## 开发提示

- 项目是纯前端单机账本，清除本地缓存可能会丢失数据，建议通过导出功能定期备份。
- 转账会同时影响转出账户和转入账户，并分别保存余额快照。
- 统计默认只纳入 `isIncludedInStats !== false` 的账单。
- 如需了解业务细节、已知问题和后续维护建议，请查看 [wiki/wiki.md](wiki/wiki.md)。
