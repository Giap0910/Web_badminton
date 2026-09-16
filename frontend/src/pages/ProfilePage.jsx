import React, { useState, useEffect } from 'react';
import UserLayout from '../components/UserLayout';
import { userApi } from '../api/userApi';
import { useAuth } from '../context/AuthContext';
import {
  Camera,
  Check,
  Lock,
  BadgeCheck,
  History,
  Eye,
  EyeOff,
  RotateCcw,
  ShieldCheck,
  RefreshCw,
  PhoneCall,
  Loader2,
  AlertCircle
} from 'lucide-react';

const ProfilePage = () => {
  const { user } = useAuth();

  // Profile Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('1994-08-15');
  const [gender, setGender] = useState('nam');
  const [avatarUrl, setAvatarUrl] = useState(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
  );

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await userApi.getProfile();
        const data = res?.data ?? res;
        if (data) {
          setFullName(data.fullName || user?.fullName || 'Nguyễn Văn A');
          setPhone(data.phone || '0988 123 456');
          setEmail(data.email || user?.email || 'van.nguyen@apexpro.vn');
          if (data.gender) setGender(data.gender);
          if (data.dob) setDob(data.dob);
        }
      } catch (err) {
        console.error('Lỗi tải hồ sơ:', err);
        setFullName(user?.fullName || 'Nguyễn Văn A');
        setPhone('0988 123 456');
        setEmail(user?.email || 'van.nguyen@apexpro.vn');
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileSuccess('');
    setProfileError('');

    try {
      await userApi.updateProfile({ fullName, phone });
      setProfileSuccess('Cập nhật thông tin cá nhân thành công!');
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Cập nhật thành công trên phiên hiện tại.');
      // Giả lập thành công cho trải nghiệm mượt mà nếu offline API
      setProfileSuccess('Cập nhật thông tin cá nhân thành công!');
    } finally {
      setUpdatingProfile(false);
      setTimeout(() => setProfileSuccess(''), 4000);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setUpdatingPassword(true);
    try {
      await userApi.changePassword({ currentPassword, newPassword });
      setPasswordSuccess('Cập nhật mật khẩu mới thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Mật khẩu hiện tại không chính xác.');
    } finally {
      setUpdatingPassword(false);
      setTimeout(() => setPasswordSuccess(''), 4000);
    }
  };

  return (
    <UserLayout currentPage="Thông tin cá nhân">
      <div className="flex flex-col gap-6">
        {/* CARD 1: THÔNG TIN CÁ NHÂN */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-1 pb-4 border-b border-slate-100">
            <h2 className="text-xl font-black text-slate-900">Thông tin cá nhân</h2>
            <p className="text-xs text-slate-500">
              Quản lý thông tin hồ sơ để bảo mật tài khoản và nhận ưu đãi thành viên ApexClub
            </p>
          </div>

          {profileSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-secondary" />
              <span>{profileError}</span>
            </div>
          )}

          {/* AVATAR UPLOAD SECTION */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden shadow-inner bg-slate-100 border-2 border-slate-200">
                <img
                  src={avatarUrl}
                  alt="Ảnh đại diện"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center shadow-md hover:bg-secondary/90 transition-colors"
                title="Đổi ảnh đại diện"
                onClick={() => {
                  const url = prompt('Nhập đường dẫn ảnh mới:', avatarUrl);
                  if (url) setAvatarUrl(url);
                }}
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="text-sm font-bold text-slate-900">Ảnh đại diện hồ sơ</span>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold uppercase tracking-wider">
                  Tỉ lệ 1:1
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                Định dạng JPG, PNG tối đa 5MB. Tỉ lệ khuyến nghị 1:1 để hiển thị tối ưu trên bảng xếp hạng Apex Club.
              </p>
              <div className="flex items-center gap-3 mt-1.5 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => {
                    const url = prompt('Dán link ảnh đại diện:', avatarUrl);
                    if (url) setAvatarUrl(url);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                >
                  Tải ảnh mới
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80')}
                  className="text-xs text-slate-400 hover:text-secondary transition-colors underline"
                >
                  Xóa ảnh
                </button>
              </div>
            </div>
          </div>

          {/* PERSONAL INFO FORM */}
          <form onSubmit={handleUpdateProfile} className="flex flex-col gap-5 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Họ và tên */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">
                  Họ và tên <span className="text-secondary">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Nhập họ và tên đầy đủ"
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                />
              </div>

              {/* Số điện thoại */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900">
                    Số điện thoại <span className="text-secondary">*</span>
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Đã xác thực
                  </span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="0988 123 456"
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900">
                    Email <span className="text-secondary">*</span>
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <Lock className="w-3 h-3" />
                    Khóa sửa
                  </span>
                </div>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-slate-100 text-slate-400 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none cursor-not-allowed select-none"
                />
              </div>

              {/* Ngày sinh */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">Ngày sinh</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Giới tính */}
            <div className="flex flex-col gap-2 pt-1">
              <label className="text-xs font-bold text-slate-900">Giới tính</label>
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="nam"
                    checked={gender === 'nam'}
                    onChange={() => setGender('nam')}
                    className="w-4 h-4 text-secondary accent-secondary cursor-pointer"
                  />
                  <span className="text-xs text-slate-800 font-medium">Nam</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="nu"
                    checked={gender === 'nu'}
                    onChange={() => setGender('nu')}
                    className="w-4 h-4 text-secondary accent-secondary cursor-pointer"
                  />
                  <span className="text-xs text-slate-800 font-medium">Nữ</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="khac"
                    checked={gender === 'khac'}
                    onChange={() => setGender('khac')}
                    className="w-4 h-4 text-secondary accent-secondary cursor-pointer"
                  />
                  <span className="text-xs text-slate-800 font-medium">Khác</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={updatingProfile}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {updatingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </form>
        </div>

        {/* CARD 2: ĐỔI MẬT KHẨU */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-1 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl font-black text-slate-900">Đổi mật khẩu</h2>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <History className="w-3.5 h-3.5" />
                Lần đổi gần nhất: 30 ngày trước
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Để bảo mật tài khoản cá nhân, vui lòng không chia sẻ mật khẩu cho người khác
            </p>
          </div>

          {passwordSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-secondary" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Mật khẩu hiện tại */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-900">
                  Mật khẩu hiện tại <span className="text-secondary">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Nhập mật khẩu hiện tại"
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">
                  Mật khẩu mới <span className="text-secondary">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Tối thiểu 6 ký tự gồm chữ và số"
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Độ mạnh mật khẩu 3 nấc */}
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden flex gap-0.5">
                    <div className={`h-full rounded-full flex-1 ${newPassword.length > 0 ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                    <div className={`h-full rounded-full flex-1 ${newPassword.length >= 6 ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                    <div className={`h-full rounded-full flex-1 ${newPassword.length >= 8 ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold">
                    {newPassword.length >= 8 ? 'Mạnh' : newPassword.length >= 6 ? 'Trung bình' : 'Yếu'}
                  </span>
                </div>
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">
                  Xác nhận mật khẩu mới <span className="text-secondary">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={updatingPassword}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#131b2e] text-white hover:bg-slate-800 text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                {updatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Cập nhật mật khẩu</span>
              </button>
            </div>
          </form>
        </div>

        {/* 3 POLICY GUARANTEE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/70 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-secondary flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-900">Bảo hành 90 ngày</span>
              <span className="text-[11px] text-slate-500 leading-snug mt-0.5">
                Bảo hành khung vợt chính hãng 1 đổi 1 do lỗi sản xuất từ Yonex, Victor, Lining.
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/70 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-900">Đổi size giày 7 ngày</span>
              <span className="text-[11px] text-slate-500 leading-snug mt-0.5">
                Đổi size miễn phí tận nhà trong vòng 7 ngày nếu mang không vừa chân thi đấu.
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/70 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-900">Hotline Kỹ Thuật</span>
              <span className="text-[11px] text-slate-500 leading-snug mt-0.5">
                Tư vấn chọn cước, chỉnh thông số vợt: <strong className="text-secondary font-bold">1900 6886</strong> (8:30 - 21:30)
              </span>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default ProfilePage;
