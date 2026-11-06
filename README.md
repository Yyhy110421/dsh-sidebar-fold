# dsh-sidebar-fold（侧栏折叠）

给 DSH 左侧栏加一个折叠按钮：把 **工作区上方** 的入口（Task board、插件、Skill / MCP、自动化任务、上下文洞察、MisakaNet、技能中心、MCP 连接器、更多）一次收起，再按一次全部展开。

工作区、会话列表、底部设置和侧栏整体的收起按钮都不受影响。

## 安装

在 DSH 里打开 **设置 → 插件管理器**，安装：

- `github:Yyhy110421/dsh-sidebar-fold`，或
- `file:<本仓库绝对路径>`

装完刷新页面（或重启 DSH）。按钮会出现在“新会话”和“Task board”之间。

> `file:` 安装是实体拷贝；改源码后需要卸载再装。更新只支持 npm 注册表插件，本插件不发布 npm。

## 用法

- 按钮显示 **收起导航** 时，点击收起工作区上方的入口。
- 收起后按钮变成 **展开导航**，点击恢复。
- 折叠状态存在浏览器 `localStorage` 的 `dsh-sidebar-fold.collapsed` 里，刷新后保留。
- 侧栏整体收成 56px 图标轨道时，按钮会自动隐藏；展开侧栏后恢复。

## 实现方式与限制

DSH 目前没有“面板列表上方”的官方插槽，所以本插件在浏览器侧找到侧栏的 `nav`（`aria-label` 为“全局面板”/“Global panels”，或 class 含 `panelList`），以及 `nav` 前、“新会话”按钮后的那组入口（包括 Task board 这类插件注入的行）。按钮插在整组入口前面，用内联 `display` 控制整组显隐。

这意味着：

- **只依赖当前侧栏 DOM 结构**；DSH 升级后如果“新会话”按钮、`nav` 或 Task board 行的结构/class 命名变化，按钮可能找不到或漏收某些行，需要更新插件。
- 不修改 DSH 本体，不修改 `dsh-builtin-browser`，不写注册表、不启动后台进程。
- 不收集数据，没有宿主侧服务；卸载插件后按钮和样式会一起移除。
- 如果侧栏整体处于收起状态（56px），按钮不可见是预期行为。

## 开发

```sh
# 语法检查
node --check client.js
node --check lib/index.js
```

本地验证：把本目录用 `file:` 安装到 DSH，刷新页面，检查按钮是否出现在“新会话”下方、Task board 上方；点两次确认整组（含 Task board）收起/展开，并刷新确认状态保留。

## License

MIT © 2026 Yyhy110421
