# AGENTS.md 开发规范

本文档用于约束本项目中的人工开发者和 AI 编码代理。开始改动前请先阅读本文件、[README.md](README.md) 和 [wiki/wiki.md](wiki/wiki.md)。

## Agent Skills

- 项目已安装 Addy Osmani 的 Agent Skills，位置为 `.opencode/skills/<skill-name>/SKILL.md`。
- 每次处理用户请求前，先判断是否有技能适用；适用时必须调用 `skill` 工具加载对应技能，并遵循技能流程。
- 常见映射：新功能或重大改动使用 `spec-driven-development`、任务拆解使用 `planning-and-task-breakdown`、多文件实现使用 `incremental-implementation`、行为变更或修 bug 使用 `test-driven-development` 和 `debugging-and-error-recovery`、前端界面使用 `frontend-ui-engineering`、代码审查使用 `code-review-and-quality`、安全相关使用 `security-and-hardening`、性能相关使用 `performance-optimization`。
- 不确定该用哪个技能时，先加载 `using-agent-skills`。

## 项目定位

- 这是一个基于 uni-app、Vue 3、Pinia 和 Vite 的本地记账应用。
- 项目是纯前端单机账本，不依赖后端服务或远程数据库。
- 项目必须以保证 PWA 应用下的显示效果和可用性为主，功能、布局、交互和构建验证都应优先考虑 PWA 场景。
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
| `src/pages/settings` | 设置、导入、导出、备份、WebDAV、网络文件配置、交叉校验入口 |
| `src/pages/categories/index.vue` | 分类管理 |
| `src/pages/cross-check` | 交叉校验操作主页和问题列表 |
| `src/utils/backup.js` | 备份数据结构、校验和覆盖还原 |
| `src/utils/importParsers.js` | 支付宝、微信、通用模板导入解析 |
| `src/utils/crossCheck.js` | 外部流水与本地账单核对逻辑 |
| `src/utils/webdav.js` | WebDAV 配置、列表、上传、下载 |
| `src/utils/networkFile.js` | 网络文件下载、上传和配置管理 |
| `src/utils/filePicker.js` / `src/utils/fileSaver.js` | 跨端文件选择和保存 |
| `src/utils/currency.js` | 币种展示和格式化 |
| `src/utils/share.js` | 页面分享配置 |
| `src/utils/text.js` | 文本解码和 HTML 实体处理 |
| `src/utils/uuid.js` | 本地 id 生成 |
| `wiki/wiki.md` | 业务细节、维护说明和风险记录 |

## 功能模块结构

### 基础应用层

- `src/main.js` 创建 Vue 应用并挂载 Pinia。
- `src/App.vue` 承载全局生命周期、主题变量、通用玻璃样式和应用背景。
- `src/pages.json` 是页面注册、导航栏标题和 tabBar 的唯一入口；当前 tabBar 包含明细、统计、设置。
- 页面应通过 `onShow` 或 `onLoad` 初始化需要的 store，不要假设 store 已经有最新本地数据。

### 核心数据层

- `assetStore` 管理资产账户，持久化 key 为 `account_book_assets`。
- `categoryStore` 管理收入、支出、系统分类和二级分类，持久化 key 为 `account_book_categories`。
- `billStore` 管理账单流水、退款、转账和资产余额快照，持久化 key 为 `account_book_bills`。
- 账单是资产余额和统计的事实来源；资产当前余额不能绕过账单流水长期单独维护。

### 明细与记账模块

- `pages/index/index.vue` 是账单明细首页，负责按月份展示流水、月度收支、资产视图、编辑、退款、删除，以及从首次使用导入创建账单。
- `pages/bill/add.vue` 负责新增和编辑支出、收入、转账，处理金额键盘、日期、分类、资产、币种、目标资产、手续费和是否计入统计。
- 明细页和统计明细页删除账单时必须调用 `billStore.deleteBill()`，不能只从页面列表里移除。
- 编辑账单必须调用 `billStore.updateBill()`，让原资产、新资产、转出资产、转入资产都进入重算范围。

### 资产与分类模块

- 资产新增、编辑、删除通过 `assetStore.addAsset()`、`updateAsset()`、`deleteAsset()` 完成。
- 资产支持 `currency`、`balances`、`initialBalances` 和 `includeInTotal`；CNY 余额同步到兼容字段 `initialBalance`、`currentBalance`。
- 分类管理页 `pages/categories/index.vue` 负责分类交互，核心删除逻辑已经收敛到 `categoryStore.deleteCategory()`。
- 系统分类 `ASSET_ADJUSTMENT_CATEGORY_ID` 表示资产调整，隐藏且不可修改、不可删除。
- 删除分类时要传入 `billStore`，确保账单迁移或删除后余额能重新计算。

### 统计模块

- `pages/stats/index.vue` 按月或年、收入或支出聚合一级分类金额。
- `pages/stats/category.vue` 展示某一级分类下的二级分类拆分。
- `pages/stats/list.vue` 展示统计下钻后的账单列表，并支持编辑、删除。
- 统计必须统一使用 `billStore.getStatType()` 和 `billStore.getStatAmount()` 对账单类型和金额做解释，避免页面各自维护规则。
- 默认只统计 `isIncludedInStats !== false` 的账单；外币收入和支出初始化时会恢复为可统计。

### 导入导出模块

- `pages/settings/import.vue` 支持本地文件和网络文件导入，使用 `xlsx` 读取工作表，再由 `parseImportRows()` 解析为预览数据。
- `src/utils/importParsers.js` 支持 `auto`、`alipay`、`wechat`、`generic` 四种来源，负责表头识别、金额解析、日期解析、资产推断、类型判断和备注拼装。
- 导入落库时页面负责补齐资产、分类、时间戳和账单字段，最终必须调用 `billStore.addBill()`。
- 通用模板字段包括日期、类型、资产、币种、金额、目标资产、目标币种、目标金额、一级分类、二级分类、手续费、是否计入统计、备注。
- `pages/settings/export.vue` 按日期范围导出账单，导出字段要兼容资产、分类、币种、金额、手续费、统计标记和备注。
- 导入导出格式发生变化时，必须同步更新 `README.md`、`wiki/wiki.md` 和本文件相关说明。

### 备份与同步模块

- `pages/settings/backup.vue` 使用 `buildBackupData()` 生成完整 JSON 备份，使用 `applyBackupToStores()` 覆盖还原三类核心 store。
- 备份格式包含 `app: 'account-book'`、`type: 'full-backup'`、`version`、`createdAt` 和 `data.bills/assets/categories`。
- 覆盖还原是破坏性操作，必须先 `validateBackup()` 校验结构，再写入 category、asset、bill 三个 store。
- `pages/settings/webdav.vue` 通过 `src/utils/webdav.js` 管理 WebDAV 配置、列出远程 JSON 备份、上传备份、下载备份并覆盖还原。
- WebDAV 配置持久化 key 为 `webdav_configs`，包含地址、目录、用户名和密码；不要在日志或文档中泄露真实配置。
- `pages/settings/network-file.vue` 通过 `src/utils/networkFile.js` 管理下载/上传地址，持久化 key 为 `network_file_configs`，主要服务导入文件下载和导出文件上传。

### 交叉校验模块

- `pages/settings/cross-check.vue` 选择资产、日期范围和外部账单文件，解析后创建校验会话。
- 校验会话持久化 key 为 `account_book_cross_check_session`。
- `pages/cross-check/home.vue` 汇总本地账单与外部流水的匹配结果。
- `pages/cross-check/list.vue` 展示本地缺失、本地多余、资产不一致、疑似重复，并支持补记或删除本地账单。
- `src/utils/crossCheck.js` 以日期、金额、方向和资产名称匹配本地账单与外部流水；转账目标资产使用 `targetAmount` 或 `amount` 的绝对值参与核对。

## 主要业务流程

### 应用初始化流程

1. 页面进入时调用相关 store 的 `init()`。
2. store 从 `uni.getStorageSync` 读取本地 JSON。
3. 资产数据通过 `withCurrencyBalances()` 补齐多币种字段和总资产开关。
4. 分类数据通过 `ensureSystemCategories()` 补齐隐藏系统分类。
5. 账单数据补齐 `currency`、`targetCurrency`、`remark` 和统计标记兼容逻辑。

### 新增账单流程

1. `pages/bill/add.vue` 校验金额、类型、资产、分类、转账目标资产和手续费。
2. 页面按账单类型规范金额符号：支出为负、收入为正、转账转出为负、退款由 store 创建反向金额。
3. 页面组装 `amount`、`assetId`、`targetAssetId`、`parentCategoryId`、`categoryId`、`type`、`timestamp`、`remark`、`currency`、`targetCurrency`、`targetAmount`、`fee`、`isIncludedInStats`。
4. 调用 `billStore.addBill()` 写入账单。
5. `billStore` 对主资产重算余额；转账账单还要对目标资产重算余额。
6. `billStore.save()` 持久化账单，资产 store 在重算过程中持久化资产余额。

### 编辑账单流程

1. 页面通过路由参数 `id` 读取原账单并回填表单。
2. 保存时调用 `billStore.updateBill(id, billData)`。
3. store 比较原账单和新账单，收集原主资产、新主资产、原转入资产、新转入资产。
4. 对所有受影响资产执行 `recalculateAssetBalance()`。
5. 保存账单和资产余额，避免修改历史账单后只影响当前一条记录。

### 删除账单流程

1. 页面确认删除后调用 `billStore.deleteBill(id)`。
2. 如果删除的是原账单，store 会级联删除它对应的退款账单。
3. 如果删除的是退款账单，store 会恢复原账单 `isRefunded` 状态。
4. store 收集所有受影响资产并重算余额。
5. 删除分类关联账单时，应通过 `billStore.deleteBillsByCategory()` 或 `categoryStore.deleteCategory()` 间接触发同类重算。

### 退款流程

1. 页面调用 `billStore.createRefund(originalBillId)`。
2. store 禁止转账退款、退款再退款、已退款账单重复退款。
3. store 创建 `type: 'refund'` 的反向金额账单，继承原账单资产、分类和币种。
4. 退款账单默认 `isIncludedInStats: false`，用于冲销余额但不参与普通统计。
5. 原账单标记 `isRefunded: true`，删除退款时需要恢复。

### 转账流程

1. 转出账户写在 `assetId`，转入账户写在 `targetAssetId`。
2. 转出金额保存在 `amount`，通常为负数；转入金额使用 `targetAmount`，未提供时按 `Math.abs(amount)`。
3. 手续费 `fee` 由转出账户承担，重算时从转出账户余额额外扣减。
4. 转出账户余额快照写入 `balanceSnapshot` 和 `balanceCurrency`。
5. 转入账户余额快照写入 `targetBalanceSnapshot` 和 `targetBalanceCurrency`。

### 分类删除流程

1. 页面选择删除分类，并决定迁移到账单目标分类或删除相关账单。
2. 调用 `categoryStore.deleteCategory(id, migrationTargetId, billStore)`。
3. 有迁移目标时，`billStore.migrateCategory()` 更新账单分类字段。
4. 删除一级分类且有子分类时，子分类会移动到迁移目标一级分类下。
5. 没有迁移目标但传入 `billStore` 时，删除关联账单并重算受影响资产余额。
6. 系统分类不得删除，任何页面都不要绕过 store 直接操作。

### 导入流程

1. 用户选择本地文件或网络文件。
2. 页面用 `xlsx` 读取工作表二维数组。
3. `parseImportRows(rows, selectedProvider)` 自动或按指定来源识别表头并输出解析行、错误和警告。
4. 页面展示预览并校验日期、类型、资产、分类、金额、目标资产和手续费。
5. 缺失资产或分类按当前页面策略创建，创建时必须调用对应 store 方法。
6. 每条有效记录转换为标准 billData 后调用 `billStore.addBill()`。
7. 导入后由 bill store 负责余额快照和资产余额重算。

### 导出流程

1. 用户选择开始日期、结束日期或快捷范围。
2. 页面从 `billStore.bills` 中筛选时间范围内账单。
3. 使用 asset/category store 将 id 转为可读名称。
4. 生成导出内容并通过 `fileSaver` 或网络上传能力输出。
5. 导出字段调整必须考虑历史备份和通用导入模板的兼容性。

### 备份还原流程

1. 备份时从 bill、asset、category store 深拷贝数据，生成完整 JSON。
2. 本地备份通过文件保存，WebDAV 备份通过 PUT 上传 JSON。
3. 还原时读取 JSON 或远程文件内容，先执行 `validateBackup()`。
4. 校验通过后使用 `applyBackupToStores()` 覆盖分类、资产和账单。
5. 还原后页面应重新初始化或刷新 store 视图，避免展示旧数据。

### 交叉校验流程

1. 用户选择资产、日期范围和外部流水文件。
2. 外部流水复用导入解析器生成标准行。
3. `createCrossCheckSession()` 将外部流水转成带方向、金额、资产名和原始行的会话。
4. `calculateCrossCheckReport()` 取同资产、同日期范围内的本地账单参与匹配。
5. 匹配规则优先看同日、同金额绝对值、同收支方向，再检查资产名称。
6. 问题列表可补记缺失账单或删除多余账单，最终仍通过 bill store 影响余额。

## 数据流转

### 本地存储 key

| key | 管理位置 | 数据 |
| --- | --- | --- |
| `account_book_assets` | `src/store/asset.js` | 资产、初始余额、当前余额、多币种余额、是否计入总资产 |
| `account_book_categories` | `src/store/category.js` | 一级分类、二级分类、系统分类 |
| `account_book_bills` | `src/store/bill.js` | 账单流水、退款关系、转账字段、余额快照 |
| `webdav_configs` | `src/utils/webdav.js` | WebDAV 地址、目录和认证配置 |
| `network_file_configs` | `src/utils/networkFile.js` | 网络文件下载和上传配置 |
| `account_book_cross_check_session` | `src/utils/crossCheck.js` | 当前交叉校验会话 |

### 核心数据关系

- `bill.assetId` 指向资产，普通支出、收入、退款都只影响该资产。
- `bill.targetAssetId` 只在转账中使用，表示转入资产。
- `bill.parentCategoryId` 指向一级分类，`bill.categoryId` 指向实际选择分类。
- 二级分类必须存在于父分类 `children` 中，且 `type` 与父分类一致。
- `bill.originalBillId` 指向被退款的原账单，原账单用 `isRefunded` 标记状态。
- 外币账单通过 `currency`、`targetCurrency`、`targetAmount` 和资产 `balances` 参与余额计算。

### 余额重算数据流

1. 账单新增、编辑、删除、分类删除关联账单后，收集受影响资产 id。
2. `recalculateAssetBalance(assetId)` 从资产 `initialBalance` 和 `initialBalances` 创建运行余额。
3. 找出所有 `assetId` 等于该资产，或转账 `targetAssetId` 等于该资产的账单。
4. 按 `timestamp` 从早到晚排序。
5. 主资产方向使用 `amount - abs(fee)` 更新对应币种余额。
6. 转入资产方向使用 `targetAmount` 或 `abs(amount)` 更新目标币种余额。
7. 每条账单写入对应余额快照。
8. `assetStore.updateBalances()` 写回资产多币种余额，并同步 CNY 当前余额。
9. 保存资产和账单，保证明细、统计、备份、导出读取同一份结果。

### 统计数据流

1. 统计页从 `billStore.bills` 读取账单。
2. 按时间范围过滤，排除 `isIncludedInStats === false`。
3. 用 `billStore.getStatType()` 判断统计类型，用 `getStatAmount()` 获取绝对金额。
4. 按 `parentCategoryId` 聚合一级分类。
5. 分类详情页再按 `categoryId` 聚合二级分类或父分类本身。
6. 明细页通过路由参数复用同一套过滤含义展示账单。

### 导入数据流

1. 文件内容进入 `xlsx`，转为二维数组。
2. `importParsers` 输出标准解析行，不直接写 store。
3. 导入页把解析行映射为资产、分类和账单。
4. 缺失资产通过 `assetStore.addAsset()` 创建，缺失分类通过 `categoryStore.addCategory()` 创建。
5. 账单通过 `billStore.addBill()` 写入，余额随账单重算。
6. 导入过程不要直接写 `uni.setStorageSync`，否则会绕过余额快照和字段规范化。

### 备份数据流

1. 备份只序列化三类核心业务数据：资产、分类、账单。
2. WebDAV 和网络文件配置不属于账本备份内容，除非明确需求要求导出配置。
3. 还原会覆盖三个 store 的完整数组，不做增量合并。
4. 覆盖还原后不要尝试保留旧账单、旧资产或旧分类的局部数据，除非先设计明确迁移策略。

### 交叉校验数据流

1. 外部流水解析行进入校验会话，不直接进入账单 store。
2. 本地账单按资产和日期范围临时转换为校验项。
3. 报告只保存和展示匹配结果，不改变业务数据。
4. 用户在问题列表中选择补记或删除时，才通过 `billStore.addBill()` 或 `billStore.deleteBill()` 修改账本。

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

- 当前视觉风格是 iOS 26 Liquid Glass 方向的玻璃面板：多色柔和背景、半透明控件、细描边、背景模糊、轻量高光和大圆角。橙色主色与绿色辅助色保留，但不再使用厚重新拟态阴影。
- 全局颜色和通用样式优先复用 `src/App.vue` 中的 CSS 变量和类。
- 页面显示和交互必须优先保证 PWA 应用可用，包括独立窗口、移动端竖屏、桌面窄屏、离线缓存后的基础可访问性。
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
- 每次修改功能、页面入口、业务流程、数据结构或用户可见能力时，都必须同步更新 `README.md`。
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
- PWA 相关改动：检查独立窗口安装后页面显示、导航返回、底部 tabBar、文件导入导出入口和离线状态下的基础可用性。
- 类型或构建风险较高时：运行 `pnpm type-check` 和 `pnpm build:h5`。

## 禁止事项

- 不要提交密钥、账号、私有接口地址或真实个人账本数据。
- 不要在未确认需求时清空本地存储或重置默认数据。
- 不要使用 `git reset --hard`、强制推送或大范围删除文件，除非用户明确要求。
- 不要把业务规则只写在 UI 文案里，关键约束必须落在代码逻辑中。
- 不要让统计、余额、导入导出各自维护一套互相矛盾的数据解释。
