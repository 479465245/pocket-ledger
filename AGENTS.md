# AGENTS.md 开发规范

本文档用于约束本项目中的人工开发者和 AI 编码代理。开始改动前请先阅读本文件、[README.md](README.md) 和 [wiki/wiki.md](wiki/wiki.md)。

## 项目定位

- 这是一个基于 uni-app、Vue 3、Pinia 和 Vite 的本地记账应用。
- 项目是纯前端单机账本，不依赖后端服务或远程数据库。
- 资产、分类、账单都通过 `uni.setStorageSync` 持久化。
- 任何改动都应优先保证账单、资产余额和统计数据的一致性。

## 常用命令

```bash
pnpm install
pnpm dev:h5
pnpm build:h5
pnpm type-check
```

说明：

- 项目已有 `pnpm-lock.yaml`，默认使用 pnpm。
- 不要随意改用 npm、yarn 或其他包管理器。
- 只有在新增、删除或升级依赖时才更新 `pnpm-lock.yaml`。

## 目录职责

| 路径 | 说明 |
| --- | --- |
| `src/App.vue` | 全局生命周期和全局样式变量 |
| `src/main.js` | 创建 Vue 应用并挂载 Pinia |
| `src/pages.json` | 页面注册、导航栏和 tabBar 配置 |
| `src/manifest.json` | uni-app 多端配置 |
| `src/store/asset.js` | 资产 store |
| `src/store/category.js` | 分类 store |
| `src/store/bill.js` | 账单 store 和余额重算逻辑 |
| `src/pages/index/index.vue` | 账单明细首页 |
| `src/pages/bill/add.vue` | 新增/编辑账单 |
| `src/pages/stats` | 统计页、分类统计详情、统计明细 |
| `src/pages/settings` | 设置、资产管理、导入、导出 |
| `src/pages/categories/index.vue` | 分类管理 |
| `src/utils` | 通用工具 |
| `wiki/wiki.md` | 业务细节、维护说明和风险记录 |

## 开发原则

- 保持改动范围小，只修改完成当前任务需要的文件。
- 先理解现有实现，再补功能或修 bug。
- 不做无关重构，不顺手改格式，不重排大段代码。
- 不删除用户数据相关逻辑，除非明确知道迁移路径。
- 不写兜底代码，不写默认值。
- 不引入后端、云同步、登录系统等架构变化，除非任务明确要求。
- 遇到已有本地改动时，先确认 `git status --short`，不要覆盖他人或用户的改动。

## 代码风格

- 维持当前 JavaScript + Vue SFC 风格，不主动迁移 TypeScript。
- Vue 页面优先使用 `<script setup>`。
- 使用 uni-app 组件和 API，例如 `view`、`text`、`scroll-view`、`picker`、`uni.navigateTo`、`uni.showToast`。
- 模块导入优先使用现有路径风格，例如 `@/store/bill`。
- JS 代码保持现有风格：单引号、尽量不写分号。
- 注释只写在业务规则复杂或容易误解的地方，避免解释显而易见的代码。
- 新增工具函数时优先放在 `src/utils`，但只有出现明确复用需求时才抽象。

## 状态管理规范

- 资产、分类、账单的核心变更应收敛到对应 Pinia store。
- 页面可以负责交互和表单校验，但不要在页面层散落复杂数据修正逻辑。
- store 写入本地存储时使用已有的 `save()` 模式。
- 页面进入时按现有模式初始化 store，例如在 `onShow` 中调用 `init()`。
- 新增 store 方法时要返回明确结果，失败时抛出可读错误或给页面可处理的状态。

## 业务规则

### 账单

- `expense` 支出金额按负数保存。
- `income` 收入金额按正数保存。
- `transfer` 转账金额影响转出账户和转入账户。
- `refund` 退款用于冲销原账单，不应再次退款。
- 账单字段优先使用 `remark`，不要再新增 `note` 作为新字段。
- 统计逻辑默认只纳入 `isIncludedInStats !== false` 的账单。

### 资产余额

- 资产当前余额应由初始余额和账单流水推导出来。
- 新增、编辑、删除账单后，必须重新计算受影响资产的余额。
- 补录历史账单、修改旧账单、删除中间账单时，不能只对当前余额做简单加减。
- 转账账单需要维护两侧余额快照：`balanceSnapshot` 和 `targetBalanceSnapshot`。

### 转账

- `assetId` 表示转出账户。
- `targetAssetId` 表示转入账户。
- `fee` 表示手续费，并由转出账户承担。
- 转账不应被当作普通收入或支出参与分类统计。

### 分类

- 一级分类 `parentId` 为 `null`。
- 二级分类必须挂在某个一级分类下。
- 二级分类应继承父分类的 `type`。
- 删除分类时必须处理已有账单：迁移到目标分类，或明确删除相关账单。
- 不要留下指向已删除分类的孤立账单。

## UI 与样式规范

- 当前视觉风格是奶油色背景、橙色主色、绿色辅助色和新拟态卡片。
- 全局颜色和通用样式优先复用 `src/App.vue` 中的 CSS 变量和类。
- 移动端优先，注意小屏下文本不要溢出或重叠。
- 列表、表单、底部操作区应保持现有页面的交互密度和样式语气。
- 不要为了单个页面引入全新的 UI 框架或完全不同的视觉系统。
- 新增页面后必须在 `src/pages.json` 中注册，并按需配置导航栏标题。

## 导入导出规范

- 导入导出属于数据备份和迁移能力，改动时要格外谨慎。
- 导入时必须校验日期、类型、资产、分类、金额等关键字段。
- 资产或分类不存在时，应明确是自动创建、提示用户，还是中断导入。
- 导出字段要尽量稳定，避免破坏历史备份文件的兼容性。
- 如果调整导入列顺序或字段含义，必须同步更新文档。

## 文档规范

- `README.md` 放项目入口信息：简介、启动方式、目录和核心能力。
- `wiki/wiki.md` 放更详细的业务说明、已知问题和维护建议。
- `AGENTS.md` 放开发规范和代理协作规则。
- 修改核心业务规则、运行命令、导入导出格式时，记得同步更新相关文档。

## 提交规范

- 不要在没有明确要求时自动提交或推送。
- 提交前查看 `git status --short`，确认只包含本次任务相关文件。
- 提交信息建议使用简洁的 conventional commit 风格：
  - `docs: update development guidelines`
  - `fix: correct bill balance recalculation`
  - `feat: add export date range shortcut`
  - `refactor: move category deletion into store`

## 验证清单

改动完成后按风险选择验证方式：

- 文档改动：检查 Markdown 渲染和链接是否正确。
- 页面样式改动：运行 `pnpm dev:h5` 后在 H5 页面手动查看。
- store 或业务逻辑改动：至少覆盖新增、编辑、删除账单后的余额变化。
- 转账逻辑改动：同时检查转出账户、转入账户和手续费。
- 分类逻辑改动：检查一级分类、二级分类、迁移和删除场景。
- 导入导出改动：用小样本数据验证导入预览、实际导入和导出文件。
- 类型或构建风险较高时：运行 `pnpm type-check` 和 `pnpm build:h5`。

## 禁止事项

- 不要提交密钥、账号、私有接口地址或真实个人账本数据。
- 不要在未确认需求时清空本地存储或重置默认数据。
- 不要使用 `git reset --hard`、强制推送或大范围删除文件，除非用户明确要求。
- 不要把业务规则只写在 UI 文案里，关键约束必须落在代码逻辑中。
- 不要让统计、余额、导入导出各自维护一套互相矛盾的数据解释。
