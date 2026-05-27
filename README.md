# 今天吃什么

<div align="center">

一个帮助解决"今天吃什么"选择困难症的微信小程序

[![微信小程序](https://img.shields.io/badge/平台-微信小程序-green.svg)](https://developers.weixin.qq.com/miniprogram/dev/framework/)
[![云开发](https://img.shields.io/badge/后端-微信云开发-blue.svg)](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)

</div>

## 项目简介

"今天吃什么"是一个基于微信小程序云开发的应用，旨在帮助高校学生解决每天面对食堂众多选择时的困扰。通过随机抽取的方式，让用户快速决定用餐地点，同时提供人气榜单、统计数据等功能，让用餐选择更加有趣。

### 核心功能

- 随机抽取 - 智能随机选择食堂、楼层和店铺，避免选择困难
- 多学校支持 - 支持多个学校独立使用，数据互不干扰
- 人气榜单 - 统计用户选择，展示最受欢迎的店铺
- 使用统计 - 实时显示总使用次数和今日使用次数
- 公告系统 - 学校管理员可发布实时公告
- 店铺评分 - 用户可对店铺进行评分（开发中）
- 权限管理 - 支持超级管理员和学校管理员分级管理

## 功能展示

### 主要功能

1. **随机抽取**
   - 支持选择特定食堂或全部食堂
   - 智能权重算法，避免重复选择
   - 抽取结果支持一键复制分享

2. **学校切换**
   - 快速切换不同学校
   - 搜索学校功能
   - 记录最近使用的学校

3. **人气榜单**
   - 展示用户选择最多的店铺
   - 激励视频广告展示（可选）

4. **管理后台**
   - 学校管理员：管理本校食堂、楼层、店铺数据
   - 超级管理员：管理所有学校和全局配置

## 技术栈

- **前端**：微信小程序原生框架
- **后端**：微信云开发
  - 云函数
  - 云数据库
  - 云存储
- **UI组件**：原生组件 + 自定义组件

## 项目结构

```
miniprogram-10/
├── miniprogram/              # 小程序前端代码
│   ├── pages/               # 页面
│   │   ├── index/          # 首页（主功能页）
│   │   ├── admin/          # 学校管理员页
│   │   ├── masterAdmin/    # 超级管理员页
│   │   └── suggestion/     # 建议反馈页
│   ├── images/             # 图片资源
│   ├── utils/              # 工具函数
│   ├── app.js              # 小程序入口
│   ├── app.json            # 小程序配置
│   └── app.wxss            # 全局样式
├── cloudfunctions/          # 云函数
│   └── canteenService/     # 食堂服务云函数
│       ├── index.js        # 云函数入口
│       └── package.json    # 依赖配置
├── project.config.json      # 项目配置
└── README.md               # 项目说明
```

## 数据库设计

### 集合说明

| 集合名 | 说明 |
|--------|------|
| `schools` | 学校信息表 |
| `canteen` | 食堂信息表（含楼层和店铺） |
| `stats` | 全局统计表 |
| `schoolStats` | 学校统计表 |
| `reputationShops` | 人气店铺表 |
| `config` | 配置表（公告等） |
| `shopStats` | 店铺统计表 |
| `userRatings` | 用户评分表 |

## 快速开始

### 前置要求

- 已注册微信小程序账号
- 已开通微信云开发服务
- 安装微信开发者工具

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/your-username/what-to-eat-today.git
   cd what-to-eat-today
   ```

2. **导入项目**
   - 打开微信开发者工具
   - 选择"导入项目"
   - 选择项目目录
   - 填入你的 AppID

3. **配置云开发环境**
   - 在微信开发者工具中开通云开发
   - 创建云开发环境
   - 在 `project.config.json` 中配置环境ID

4. **部署云函数**
   ```bash
   # 上传并部署云函数
   # 在微信开发者工具中右键 cloudfunctions/canteenService
   # 选择"上传并部署：云端安装依赖"
   ```

5. **初始化数据库**
   - 首次运行会自动初始化默认食堂数据
   - 或通过管理后台手动添加

## 新后端生产部署与上游层级导入

当前 fork 已加入 Fastify + Prisma + Postgres 后端。生产环境首次部署时，若只想导入上游仓库的学校/食堂/楼层/店铺层级，不要运行 `npm run prisma:seed`，因为 seed 会额外创建示例菜品和评分。

```bash
git clone https://github.com/tantan1hao/miaomiaomiao-together.git /opt/miaomiaomiao-together
cd /opt/miaomiaomiao-together/server
npm ci
cp .env.example .env
# 编辑 .env：DATABASE_URL、JWT_SECRET、MASTER_PASSWORD、BISTU_ADMIN_PASSWORD、PUBLIC_BASE_URL
npm run prisma:generate
npm run prisma:migrate
npm run prisma:import:upstream-hierarchy
npm start
```

上游层级导入脚本会 upsert `legacyId=bistu` 的学校，以及一食堂/二食堂的完整楼层和店铺 JSON；它不会创建 `Dish`、`Rating`、`Category` 或图片数据。导入完成后可用以下接口验证：

```bash
curl http://127.0.0.1:3002/dish-api/health
curl http://127.0.0.1:3002/dish-api/schools
curl -X POST http://127.0.0.1:3002/dish-api/miniprogram/call \
  -H 'content-type: application/json' \
  -d '{"action":"getCanteenData","schoolId":"bistu"}'
```

建议用 `systemd` 托管后端进程，并由 Nginx 代理 `/dish-api/` 到 `127.0.0.1:3002`，代理 `/dish-uploads/` 到 `/var/lib/dish-rank/uploads`。模板见 `server/deploy/dish-rank-server.service.example` 和 `server/deploy/nginx-dish.conf.example`。

### 配置说明

在 `project.config.json` 中修改以下配置：

```json
{
  "appid": "你的小程序AppID",
  "setting": {
    "your-cloud-env": "你的云开发环境ID"
  }
}
```

## 使用说明

### 普通用户

1. 打开小程序，选择所在学校
2. 点击"开始抽取"按钮
3. 查看随机抽取的结果
4. 可选择"再来一次"或"确认选择"

### 管理员

1. 在首页标题处连续点击6次
2. 输入管理员密码
3. 进入管理后台进行数据管理

## 自定义配置

### 添加新学校

通过超级管理员后台添加新学校：

1. 学校名称
2. 英文简称
3. 管理员密码
4. 管理员名称

### 管理食堂数据

学校管理员可进行以下操作：

- 添加/删除食堂
- 添加/删除楼层
- 添加/删除店铺
- 发布学校公告

## 统计功能

- **全局统计**：所有学校总使用次数
- **学校统计**：各学校独立统计
- **今日统计**：当天使用次数
- **人气榜单**：店铺被选择次数排行

## 安全说明

- 管理员密码存储在云函数中，前端无法直接访问
- 用户评分需登录后才能进行
- 敏感操作均在云函数中完成

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 更新日志

### v1.0.0
- 初始版本发布
- 支持随机抽取功能
- 支持多学校管理
- 支持人气榜单
- 支持公告系统

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 作者

**西风漂流**

## 致谢

- 感谢微信小程序团队提供的开发平台
- 感谢所有为这个项目提供建议的用户

## 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 提交 [Issue](https://github.com/your-username/what-to-eat-today/issues)
- 小程序内"建议反馈"页面

---

<div align="center">

如果这个项目对你有帮助，请给一个 Star 支持一下！

Made with love by 西风漂流

</div>
