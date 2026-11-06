/**
 * dsh-sidebar-fold（侧栏折叠）宿主半身。
 *
 * 这个插件只改浏览器侧 DOM，宿主侧没有服务、没有状态。
 * 保留一个空的 apply，是为了让 bundle patch 有可加载的宿主模块。
 */
export const name = 'sidebar-fold'

export function apply() {
  // 浏览器侧 client.js 负责全部工作。
}
