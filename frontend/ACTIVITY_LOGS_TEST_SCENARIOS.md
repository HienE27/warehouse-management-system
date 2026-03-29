## Kịch bản test - Nhật ký hoạt động

### 1. Đăng nhập / Đăng xuất

- **TC-01**: Đăng nhập thành công
  - B1: Login với tài khoản hợp lệ  
  - Kỳ vọng:
    - Nhận token và vào dashboard  
    - Có log `LOGIN` với username đúng, IP và User Agent đúng

- **TC-02**: Đăng xuất (nếu có chức năng explicit logout)
  - B1: Thực hiện logout  
  - Kỳ vọng:
    - Có log `LOGOUT` (nếu đã implement)

### 2. Quản lý thành viên (User)

- **TC-03**: Tạo user mới
  - B1: Vào trang "Quản lý thành viên" → tạo user mới  
  - Kỳ vọng:
    - User được tạo thành công  
    - Có log `CREATE_USER` với `resourceName` = username

- **TC-04**: Cập nhật thông tin user (Before/After)
  - B1: Chọn user đã tồn tại → sửa các field: `email`, `phone`, `address`  
  - Kỳ vọng:
    - User cập nhật thành công  
    - Trong danh sách Activity Logs:
      - Có log `UPDATE_USER`, cột **Chi tiết** hiển thị dạng:  
        - `email: old@example.com → new@example.com; phone: ...`  
    - Mở modal chi tiết:
      - Bảng "Chi tiết" hiển thị từng dòng Before/After chính xác

- **TC-05**: Xóa user
  - B1: Xóa một user bất kỳ  
  - Kỳ vọng:
    - User bị xóa/disable tùy implementation  
    - Có log `DELETE_USER`

- **TC-06**: Cập nhật phân quyền trực tiếp của user
  - B1: Thêm/bớt quyền cho user  
  - Kỳ vọng:
    - Có log `UPDATE_USER_PERMISSIONS`

### 3. Quản lý vai trò (Role)

- **TC-07**: Tạo role mới
  - Kỳ vọng: log `CREATE_ROLE`

- **TC-08**: Cập nhật role (Before/After)
  - B1: Sửa `displayName` hoặc danh sách permissions của role  
  - Kỳ vọng:
    - Log `UPDATE_ROLE` được tạo  
    - Cột **Chi tiết** và modal hiển thị Before/After cho:
      - `roleCode` (nếu đổi)  
      - `displayName`  
      - `permissionCodes` (danh sách)

- **TC-09**: Cập nhật permissions của role
  - Kỳ vọng: log `UPDATE_ROLE_PERMISSIONS`

### 4. Quản lý quyền (Permission)

- **TC-10**: Tạo permission mới
  - Kỳ vọng: log `CREATE_PERMISSION`

- **TC-11**: Cập nhật permission (Before/After)
  - B1: Sửa `displayName` hoặc `permissionCode`  
  - Kỳ vọng:
    - Log `UPDATE_PERMISSION` có Before/After đúng

- **TC-12**: Xóa permission
  - Kỳ vọng: log `DELETE_PERMISSION`

### 5. Bộ lọc & tìm kiếm

- **TC-13**: Filter theo user
  - B1: Chọn một user cụ thể ở filter "Thành viên"  
  - Kỳ vọng: chỉ thấy logs của user đó

- **TC-14**: Filter theo hành động
  - B1: Chọn `UPDATE_USER` ở filter "Hành động"  
  - Kỳ vọng: chỉ hiện các log cập nhật user

- **TC-15**: Date range
  - B1: Chọn khoảng ngày hẹp, chỉ chứa 1–2 log  
  - Kỳ vọng: danh sách khớp đúng khoảng thời gian

- **TC-16**: Bộ lọc nâng cao (IP, User Agent)
  - B1: Lọc theo IP đang dùng  
  - B2: Lọc theo một đoạn User Agent (vd: `Chrome`)  
  - Kỳ vọng: kết quả phù hợp, không lỗi

- **TC-17**: Keyword (full-text)
  - B1: Nhập từ khóa trùng `username` / `resourceName` / `details`  
  - Kỳ vọng: logs chứa từ khóa được trả về

- **TC-18**: Lưu & tải lại bộ lọc
  - B1: Chọn bộ lọc bất kỳ → bấm "Lưu bộ lọc"  
  - B2: Refresh trang → kiểm tra filters được load lại đúng  

### 6. Bulk delete & delete single

- **TC-19**: Xóa 1 log
  - B1: Click icon thùng rác ở 1 dòng  
  - B2: Xác nhận xóa  
  - Kỳ vọng:
    - Log biến mất khỏi bảng  
    - Không ảnh hưởng log khác

- **TC-20**: Xóa nhiều log
  - B1: Chọn 3–5 log bằng checkbox → bấm "Xóa (n)"  
  - B2: Xác nhận  
  - Kỳ vọng:
    - Tất cả log đã chọn bị xóa  
    - Số lượng hiển thị trong toast đúng

### 7. Export (Excel / CSV / PDF)

- **TC-21**: Export Excel
  - B1: Áp dụng filters, sau đó xuất Excel  
  - Kỳ vọng:
    - File tải về thành công  
    - Cột **Chi tiết** hiển thị dạng `field: before → after` (không còn JSON thô)

- **TC-22**: Export CSV
  - Tương tự Excel, kiểm tra encoding tiếng Việt và cột Chi tiết

- **TC-23**: Export PDF
  - Kiểm tra bảng, font, tiếng Việt, và nội dung Chi tiết

### 8. Thống kê & cảnh báo bảo mật

- **TC-24**: Thống kê tổng quan
  - B1: Bấm nút "Thống kê"  
  - Kỳ vọng:
    - Tổng số log, số user, hôm nay/7 ngày/30 ngày hiển thị hợp lý

- **TC-25**: Cảnh báo FAILED_LOGIN / LOCK_ACCOUNT
  - B1: Dùng một user test, login sai > 5 lần để bị khóa  
  - Kỳ vọng:
    - Có log `FAILED_LOGIN` và `LOCK_ACCOUNT`  
    - Banner cảnh báo bảo mật xuất hiện ở đầu trang Activity Logs

### 9. Auto-refresh & auto-cleanup

- **TC-26**: Auto-refresh 30 giây
  - B1: Bật toggle "Tự động làm mới mỗi 30 giây"  
  - B2: Từ trình duyệt/tab khác, thực hiện vài hành động (login, update user, ...)  
  - Kỳ vọng: sau tối đa 30s, log mới tự xuất hiện mà không cần bấm "Tìm kiếm"

- **TC-27**: Auto-cleanup (kiểm tra gián tiếp)
  - Thiết lập DB test với các log có `createdAt` > 90 ngày  
  - Chạy job cleanup thủ công (hoặc đợi scheduler)  
  - Kỳ vọng: các log quá 90 ngày bị xóa, log mới hơn vẫn giữ nguyên


