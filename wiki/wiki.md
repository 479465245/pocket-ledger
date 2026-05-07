# 记账项目 Wiki

## 项目概述

这是一个基于 **uni-app + Vue 3 + Pinia** 的本地记账应用，主打轻量、多端、离线可用。

核心能力：
- 记账：支出 / 收入 / 转账
- 资产管理：现金、微信、支付宝、银行卡等账户
- 分类管理：一级分类 + 二级分类
- 统计分析：按月 / 按年看收入支出占比
- 数据导入导出：支持 Excel 相关流程
- 本地持久化：全部数据走 `uni.setStorageSync`

这个项目本质上是个 **纯前端单机账本**，没有后端，没有远程数据库。

---

## 技术栈

### 框架
- uni-app
- Vue 3
- Pinia
- Vite
- Sass

### 依赖
- `xlsx`：Excel 导入
- `dayjs`：已安装，但代码里基本没实际使用
- `uuid`：已安装，但项目实际使用的是自写 `utils/uuid.js`
- `vue-i18n`：已安装，但未见实际接入

### 运行脚本
定义在 `package.json`：
- `pnpm dev:h5`：H5 开发
- `pnpm build:h5`：H5 构建
- 也支持 app / 小程序等 uni-app 多端构建

---

## 目录结构

```text
.
├─ index.html
├─ package.json
├─ vite.config.js
├─ src
│  ├─ App.vue
│  ├─ main.js
│  ├─ manifest.json
│  ├─ pages.json
│  ├─ utils
│  │  └─ uuid.js
│  ├─ store
│  │  ├─ asset.js
│  │  ├─ bill.js
│  │  └─ category.js
│  ├─ pages
│  │  ├─ index
│  │  │  └─ index.vue
│  │  ├─ bill
│  │  │  └─ add.vue
│  │  ├─ stats
│  │  │  ├─ index.vue
│  │  │  ├─ category.vue
│  │  │  └─ list.vue
│  │  ├─ settings
│  │  │  ├─ index.vue
│  │  │  ├─ assets.vue
│  │  │  ├─ import.vue
│  │  │  └─ export.vue
│  │  ├─ categories
│  │  │  └─ index.vue
│  │  ├─ assets
│  │  │  └─ index.vue        # 未注册，疑似旧页
│  │  └─ import
│  │     └─ index.vue        # 未注册，疑似旧页
│  └─ static
└─ wiki
   └─ wiki.md
```

---

## 页面与路由

来自 `src/pages.json`。

### TabBar 页面
- `pages/index/index`：明细
- `pages/stats/index`：统计
- `pages/settings/index`：设置

### 普通页面
- `pages/bill/add`：记一笔 / 编辑账单
- `pages/stats/category`：分类统计详情
- `pages/stats/list`：账单明细
- `pages/settings/assets`：资产管理
- `pages/settings/import`：数据导入
- `pages/settings/export`：数据导出
- `pages/categories/index`：分类管理

### 主要跳转关系
- 明细页 -> 记一笔页
- 统计页 -> 分类详情页 -> 明细页
- 设置页 -> 资产 / 导入 / 导出页
- 记账页 -> 分类管理页

---

## UI 风格

全局主题定义在 `src/App.vue`。

### 风格特点
- 奶油色背景
- 橙色主色
- 拟物 / 新拟态风格
- 大圆角卡片
- 柔和阴影

### 主要主题变量
- `--color-primary: #FF8D5D`
- `--color-secondary: #88B194`
- `--color-bg: #FFF9F0`
- `--color-text: #4A4A4A`
- `--color-text-light: #8A8A8A`

### 通用样式类
- `.neu-card`
- `.neu-btn`
- `.neu-input`

---

## 状态管理

项目有 3 个核心 store：
- `assetStore`：资产
- `billStore`：账单
- `categoryStore`：分类

它们都通过 Pinia 管理，并通过本地存储持久化。

---

## 数据模型

## 1. 资产 Asset
文件：`src/store/asset.js`

### 存储 key
`account_book_assets`

### 默认资产
- 现金
- 微信钱包
- 支付宝

### 数据结构
```js
{
  id,
  name,
  type,
  initialBalance,
  currentBalance
}
```

### 主要方法
- `init()`：初始化数据
- `save()`：保存到本地
- `addAsset(name, type, initialBalance)`：新增资产
- `updateBalance(id, newBalance)`：更新余额
- `getAsset(id)`：按 id 取资产

---

## 2. 分类 Category
文件：`src/store/category.js`

### 存储 key
`account_book_categories`

### 默认分类
#### 支出
- 餐饮
  - 早餐
  - 午餐
  - 晚餐
- 交通
  - 地铁
  - 打车
- 购物

#### 收入
- 工资
- 兼职

### 数据结构
一级分类：
```js
{
  id,
  name,
  type,
  icon,
  parentId: null,
  children: []
}
```

二级分类：
```js
{
  id,
  name,
  type,
  icon,
  parentId
}
```

### 主要方法
- `init()`
- `save()`
- `addCategory(name, parentId, icon, type)`
- `updateCategory(id, { name, icon })`
- `getCategoryName(id)`

### 特点
- 二级分类会继承父分类的 `type`
- store 里 `deleteCategory()` 只是占位，删除逻辑主要在页面层处理

---

## 3. 账单 Bill
文件：`src/store/bill.js`

### 存储 key
`account_book_bills`

### 数据结构
```js
{
  id,
  amount,
  assetId,
  targetAssetId,
  parentCategoryId,
  categoryId,
  type,
  timestamp,
  remark,
  isIncludedInStats,
  isRefunded,
  fee,
  balanceSnapshot,
  targetBalanceSnapshot
}
```

### 字段说明
- `amount`：支出/转账通常为负，收入为正
- `assetId`：主账户
- `targetAssetId`：转账目标账户
- `parentCategoryId`：一级分类
- `categoryId`：实际分类，可为一级也可为二级
- `isIncludedInStats`：是否参与统计
- `fee`：转账手续费
- `balanceSnapshot`：主账户余额快照
- `targetBalanceSnapshot`：转入账户余额快照

### 主要方法
- `init()`
- `save()`
- `addBill(billData)`
- `updateBill(id, billData)`
- `deleteBill(id)`
- `recalculateAssetBalance(assetId, fromTimestamp)`
- `migrateCategory(oldCatId, newCatId)`
- `deleteBillsByCategory(catId)`

---

## 核心业务逻辑

## 1. 本地持久化
三类数据都存在本地：
- 资产：`account_book_assets`
- 分类：`account_book_categories`
- 账单：`account_book_bills`

特点：
- 不依赖后端
- 适合个人离线使用
- 清缓存/卸载会丢数据
- 导入导出是数据迁移和备份的重要方式

---

## 2. 余额链式修正
这是项目最关键的逻辑，在 `src/store/bill.js` 里。

### 思路
每次新增、编辑、删除账单后：
1. 找出受影响资产
2. 找出这些资产相关的账单
3. 按 `timestamp` 排序
4. 从资产初始余额开始重新滚动计算
5. 更新每条账单的余额快照
6. 更新资产 `currentBalance`

### 为什么这样设计
因为系统允许：
- 补录历史账单
- 编辑旧账单
- 删除中间账单
- 转账影响两个账户

如果只按“当前余额加减”去算，很容易错账。

### 当前实现特点
- 逻辑稳
- 小数据量下可靠
- 实际更接近“整条流水全量重算”
- `fromTimestamp` 参数目前没有真正被用来做局部优化

---

## 3. 转账逻辑
转账是特殊账单：`type === 'transfer'`

### 规则
- 源账户：记为负数
- 目标账户：重算时反向加回
- 手续费：
  - 转出账户承担
  - 转入账户收到的是 `金额 - 手续费`

### 涉及字段
- `assetId`：转出账户
- `targetAssetId`：转入账户
- `fee`：手续费

### 快照设计
由于转账同时影响两个账户，所以：
- 源账户写 `balanceSnapshot`
- 目标账户写 `targetBalanceSnapshot`

这个设计是对的，不然同一条账单没法保存两套余额结果。

---

## 4. 统计逻辑

### 一级统计：`pages/stats/index.vue`
- 按月 / 年过滤账单
- 按收入 / 支出切换
- 只统计 `isIncludedInStats !== false` 的账单
- 按一级分类聚合金额
- 生成环形图和分类列表

### 二级统计：`pages/stats/category.vue`
- 只看某一个一级分类下的数据
- 如果账单属于二级分类，则归到对应二级分类
- 如果账单直接挂在一级分类，则归到父分类本身那组

### 账单明细：`pages/stats/list.vue`
通过参数控制过滤：
- `filterType=parent`
- `filterType=sub`
- `filterType=parent_other`

---

## 5. 记账录入逻辑
文件：`pages/bill/add.vue`

这是整个项目最复杂的页面。

### 支持模式
- 新增支出
- 新增收入
- 新增转账
- 编辑账单

### 关键交互
- 顶部 Tab 切换类型
- 一级分类宫格选择
- 若有二级分类则展开
- 自定义数字键盘输入金额
- 选择日期
- 选择账户
- 选择是否参与统计
- 转账时选择目标账户和手续费

### 保存流程
1. 校验金额
2. 校验转账账户是否合法
3. 按类型给金额加正负号
4. 生成时间戳
5. 组装账单对象
6. 调用 `addBill` 或 `updateBill`
7. 触发余额修正

### 编辑模式
- 通过路由参数 `id` 进入
- 自动回填已有账单数据
- 日期更新时尽量保留原始时分秒

---

## 页面说明

## 1. 明细页 `pages/index/index.vue`
功能：
- 切换月份查看账单
- 顶部显示当月支出总额
- 列表展示账单
- 左滑显示操作按钮：编辑 / 退款 / 删除
- 点击“+记一笔”跳转到记账页

说明：
- 退款按钮目前只是提示“开发中”，还没真正完成

---

## 2. 记一笔页 `pages/bill/add.vue`
功能最完整，负责新增和编辑账单。

亮点：
- 统一支持收入、支出、转账
- 有二级分类展开交互
- 有独立数字键盘
- 编辑模式处理得比较完整

---

## 3. 统计页 `pages/stats/index.vue`
功能：
- 月 / 年切换
- 收入 / 支出切换
- 一级分类金额占比
- 环形图 + 列表
- 点击下钻明细

亮点：
- 使用 CSS `conic-gradient` 绘制环图
- 标签位置通过角度计算 + SVG 引导线实现

---

## 4. 分类统计详情页 `pages/stats/category.vue`
功能：
- 查看某一级分类下的拆分统计
- 点击进入账单明细页

说明：
- 若某些账单没有选二级分类，会归到父分类本身这一组

---

## 5. 账单明细页 `pages/stats/list.vue`
功能：
- 根据统计页传参显示账单列表
- 长按删除账单
- 动态设置标题

---

## 6. 设置页 `pages/settings/index.vue`
功能：
- 显示总资产
- 跳转资产管理
- 跳转导入 / 导出

---

## 7. 资产管理页 `pages/settings/assets.vue`
功能：
- 查看所有资产
- 查看总资产
- 新增资产

当前限制：
- 不支持资产编辑
- 不支持资产删除
- 新增资产时类型默认写死为 `digital`

---

## 8. 分类管理页 `pages/categories/index.vue`
功能：
- 收入 / 支出分类切换
- 一级分类展开 / 收起
- 添加一级分类
- 添加二级分类
- 编辑分类
- 左滑显示修改 / 删除按钮
- 删除时支持迁移账单或直接删掉相关账单

说明：
- 删除分类的主要逻辑写在页面里，不在 store 中统一管理
- 删除一级分类时，会尝试把其子分类并到目标分类下

---

## 9. 导入页 `pages/settings/import.vue`
功能目标：
- 读取 `.xls/.xlsx`
- 预览前 5 条
- 校验资产、分类、金额、日期
- 支持缺失资产自动创建后继续导入

预期导入列顺序：
- 日期
- 类型
- 资产
- 目标资产
- 一级分类
- 二级分类
- 金额
- 手续费
- 备注

说明：
- 页面用了 `xlsx` 去解析工作表
- 逻辑上想做“资产/分类不存在就自动创建”

---

## 10. 导出页 `pages/settings/export.vue`
功能：
- 选择开始/结束日期
- 支持快捷范围：近 7 天、近 30 天、本月、上月
- 导出为 `.xls`

实现方式：
- 不是生成真正的二进制 Excel，而是生成 **HTML Table 伪装的 xls 文件**
- H5 下通过 Blob 下载
- 非 H5 下尝试写到 `USER_DATA_PATH`

优点：
- 实现简单
- Excel 一般也能直接打开

缺点：
- 兼容性不如真正的 xlsx

---

## 已发现的问题 / 风险点

## 1. 导入页和 store 的接口不匹配
这是当前最明显的 bug。

### 现状
`settings/import.vue` 里这样调用：
- `assetStore.addAsset({ ... })`
- `categoryStore.addCategory({ ... })`

但 store 实际签名是：
- `addAsset(name, type, initialBalance)`
- `addCategory(name, parentId, icon, type)`

### 结果
导入页当前大概率不能正常自动创建资产 / 分类，甚至会直接报错。

### 建议
统一接口形式：
- 要么 store 改成接收对象
- 要么导入页改成按位置参数调用

---

## 2. 退款功能未完成
明细页有“退款”按钮，但只弹 toast，没有真实业务处理。

---

## 3. 存在未注册旧页面
以下页面存在但没在 `pages.json` 注册：
- `src/pages/assets/index.vue`
- `src/pages/import/index.vue`

判断：
- 大概率是旧版本遗留
- 可能会误导后续维护者

建议：
- 删除遗留页，或补注释说明它们已废弃

---

## 4. store 职责有点散
分类删除逻辑主要写在 `pages/categories/index.vue`，而不是收敛到 store。

风险：
- 业务规则分散
- 后续复用困难
- 页面层直接改 store 内部结构，耦合较高

建议：
- 把分类删除、迁移、子分类移动等逻辑下沉到 `categoryStore`

---

## 5. 账单字段命名不够统一
项目里同时出现：
- `remark`
- `note`

导出页里也兼容了 `bill.remark || bill.note`。

建议：
- 统一使用一个字段名，推荐 `remark`

---

## 6. 统计与转账处理要持续确认
目前统计页只统计：
- `b.type === currentType`
- 且 `isIncludedInStats !== false`

这意味着：
- 转账默认不计入统计是合理的
- 但如果后续引入“退款”完整逻辑，需要明确退款到底算收入、冲销，还是单独统计

---

## 维护建议

### 短期建议
1. 修复导入页与 store 接口不匹配问题
2. 补全退款逻辑
3. 清理未注册旧页面
4. 统一 `remark/note` 字段

### 中期建议
1. 把分类删除/迁移逻辑收敛到 store
2. 给 bill / asset / category 建立统一类型定义
3. 给导入导出补测试样例
4. 优化余额重算，真正利用 `fromTimestamp` 做局部计算

### 长期建议
1. 增加数据备份/恢复
2. 增加预算能力
3. 增加多账本支持
4. 增加搜索 / 筛选 / 标签体系
5. 接入云同步或导出为标准 xlsx

---

## 总结

这个项目完成度其实不低，已经有一套比较完整的个人记账闭环：
- 账单录入
- 账户余额联动
- 分类管理
- 统计分析
- 数据导入导出

它最值得保留的核心设计，是 **账单驱动资产余额的链式重算机制**。这让“补录历史账单、编辑旧账单、删除旧账单、转账修正”这些事情都能成立。

目前最需要处理的，不是大改架构，而是几处落地层面的收尾：
- 导入逻辑修正
- 退款补完
- 页面遗留清理
- store 职责统一

把这几块补上，这个项目就会顺很多。
