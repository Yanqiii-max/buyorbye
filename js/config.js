/* 钱来 — 上线配置
   两项都留空 = 本地演示版（数据只存在这台设备的浏览器里，带模拟顾客）。
   填上 Supabase 的 Project URL 和 anon public key = 联网版（所有人共用一份数据）。
   这两个值本来就会公开在网页里，可以放心写在这里；千万不要把 service_role key 或数据库密码写进来。 */
window.QL = window.QL || {};
QL.CONFIG = {
  url: '',   // 例：https://abcdefghijkl.supabase.co
  key: '',   // anon public key，很长一串，以 eyJ 开头
};
