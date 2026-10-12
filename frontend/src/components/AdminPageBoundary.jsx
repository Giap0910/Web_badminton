import React from 'react';

export default class AdminPageBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div role="alert" className="p-8 mt-20 text-slate-800">
      <h1 className="text-xl font-bold">Không thể hiển thị trang quản trị</h1>
      <p className="my-4">Dữ liệu hoặc kết nối có lỗi. Vui lòng tải lại trang.</p>
      <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl bg-blue-600 text-white">Thử lại</button>
      <a href="/admin" className="ml-4 underline">Về Dashboard</a>
    </div>;
  }
}
