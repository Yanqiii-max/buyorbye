/* 钱来 — 上线配置
   本地想用演示版（不连服务器）时，把下面两项改成空字符串。
   两项都留空 = 本地演示版（数据只存在这台设备的浏览器里，带模拟顾客）。
   填上 Supabase 的 Project URL 和 anon public key = 联网版（所有人共用一份数据）。
   这两个值本来就会公开在网页里，可以放心写在这里；千万不要把 service_role key 或数据库密码写进来。 */
window.QL = window.QL || {};
QL.CONFIG = {
  url: 'https://zvrclkamdgrnwkdvnkzk.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cmNsa2FtZGdybndrZHZua3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MjQzMzQsImV4cCI6MjExMDQwMDMzNH0.yzWkYnBV_2CKBVbiRej2GU26UVoa6MjKOsjJtxHzVeg',
};
// 网址后面加 ?demo 就用本地演示版（数据只在这台设备上，不连服务器），方便试用和测试
if (/[?&]demo\b/.test(location.search)) QL.CONFIG = { url: '', key: '' };
