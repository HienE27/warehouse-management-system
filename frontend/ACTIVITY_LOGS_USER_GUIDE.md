# Hướng dẫn sử dụng - Nhật ký hoạt động

## Tổng quan

Trang "Nhật ký hoạt động" cho phép bạn theo dõi và quản lý tất cả các hoạt động của người dùng trong hệ thống.

## Các tính năng chính

### 1. Tìm kiếm và Lọc

#### Bộ lọc cơ bản
- **Thành viên**: Chọn user cụ thể hoặc "Tất cả"
- **Hành động**: Chọn loại hành động (LOGIN, CREATE_USER, UPDATE_USER, etc.)
- **Từ ngày / Đến ngày**: Lọc theo khoảng thời gian

#### Bộ lọc nâng cao
Click "Hiển thị bộ lọc nâng cao" để mở thêm:
- **IP Address**: Tìm kiếm theo địa chỉ IP (tìm kiếm partial)
- **User Agent**: Tìm kiếm theo User Agent (tìm kiếm partial)

**Cách sử dụng:**
1. Chọn các bộ lọc cần thiết
2. Click "Tìm kiếm"
3. Click "Đặt lại" để xóa tất cả filters

### 2. Thống kê

Click nút "Thống kê" để xem:
- **Tổng số logs**: Tổng số nhật ký trong hệ thống
- **Số lượng thành viên**: Số user đã có hoạt động
- **Hôm nay**: Số logs trong ngày
- **7 ngày**: Số logs trong tuần qua
- **30 ngày**: Số logs trong tháng qua
- **Hành động phổ biến**: Top 3 hành động được thực hiện nhiều nhất

### 3. Xem chi tiết

1. Click icon **mắt** ở cột "Thao tác" của log muốn xem  
2. Modal sẽ hiển thị:
   - ID, Thời gian, Thành viên  
   - Hành động (với badge màu)  
   - Loại tài nguyên, Tên tài nguyên  
   - **Chi tiết (Before/After)**  
   - IP Address  
   - User Agent (đầy đủ)

**Giải thích phần “Chi tiết (Before/After)”**  
- Với các hành động **UPDATE_USER / UPDATE_ROLE / UPDATE_PERMISSION**, hệ thống lưu lại thay đổi theo dạng bảng:
  - **Trường**: tên field bị thay đổi (vd: `email`, `displayName`, `permissionCodes`)
  - **Trước**: giá trị cũ
  - **Sau**: giá trị mới  
- Các log cũ hoặc hành động không phải update sẽ hiển thị chuỗi mô tả đơn giản.

### 4. Xóa logs

#### Xóa một log
1. Click icon **thùng rác** ở cột "Thao tác"
2. Xác nhận xóa trong dialog

**Lưu ý**: Chỉ ADMIN mới có quyền xóa logs

#### Xóa nhiều logs (Bulk Delete)
1. Chọn các logs bằng checkbox ở cột đầu tiên
2. Click nút "Xóa (số lượng)" ở trên cùng
3. Xác nhận xóa

**Tips:**
- Click checkbox ở header để chọn/bỏ chọn tất cả
- Số lượng logs đã chọn sẽ hiển thị trên nút xóa

### 5. Xuất dữ liệu

#### Xuất Excel
1. Áp dụng filters nếu cần
2. Click "Xuất Excel"
3. File `.xlsx` sẽ được tải về với tên `nhat-ky-hoat-dong-YYYY-MM-DD.xlsx`

#### Xuất CSV
1. Áp dụng filters nếu cần
2. Click "Xuất CSV"
3. File `.csv` sẽ được tải về với encoding UTF-8

#### Xuất PDF
1. Áp dụng filters nếu cần
2. Click "Xuất PDF"
3. File `.pdf` sẽ được tải về với bảng dữ liệu được format đẹp

**Lưu ý**: 
- Tất cả exports sẽ bao gồm **tất cả logs** phù hợp với filters hiện tại (không chỉ trang hiện tại)  
- Với các log update, cột **Chi tiết** trong file xuất sẽ hiển thị gọn dạng:
  - `email: staff@example.com → staff@gmail.com; phone: ...`

### 6. Phân trang

- Sử dụng pagination ở cuối bảng để điều hướng
- Mỗi trang hiển thị 10 items (có thể thay đổi)
- Thông tin hiển thị: "Hiển thị X - Y / Z bản ghi"

## Các loại hành động

### Authentication
- 🟢 **LOGIN**: Đăng nhập vào hệ thống
- ⚪ **LOGOUT**: Đăng xuất khỏi hệ thống

### User Management
- 🔵 **CREATE_USER**: Tạo thành viên mới
- 🟡 **UPDATE_USER**: Cập nhật thông tin thành viên
- 🔴 **DELETE_USER**: Xóa thành viên
- 🟠 **RESET_PASSWORD**: Đặt lại mật khẩu
- 🩷 **UPDATE_USER_PERMISSIONS**: Cập nhật phân quyền trực tiếp của thành viên

### Role Management
- 🟣 **CREATE_ROLE**: Tạo vai trò mới
- 🟦 **UPDATE_ROLE**: Cập nhật vai trò
- 🔴 **DELETE_ROLE**: Xóa vai trò
- 🩷 **UPDATE_ROLE_PERMISSIONS**: Cập nhật phân quyền của vai trò

### Permission Management
- 🔷 **CREATE_PERMISSION**: Tạo quyền mới
- 🔷 **UPDATE_PERMISSION**: Cập nhật quyền
- 🔴 **DELETE_PERMISSION**: Xóa quyền

## Mẹo sử dụng

1. **Tìm kiếm nhanh**: Sử dụng filter "Hành động" để tìm các loại hoạt động cụ thể
2. **Theo dõi user**: Chọn user trong filter để xem tất cả hoạt động của user đó
3. **Phân tích bảo mật**: Sử dụng filter IP Address để phát hiện hoạt động bất thường
4. **Xuất báo cáo**: Sử dụng date range + export để tạo báo cáo định kỳ
5. **Thống kê nhanh**: Click "Thống kê" để xem overview nhanh

## Troubleshooting

### Không thấy logs mới?
- Kiểm tra filters có đang áp dụng không  
- **Kiểm tra toggle “Tự động làm mới mỗi 30 giây”** đã bật chưa  
- Refresh trang (F5)  
- Kiểm tra date range filter

### Không thể xóa logs?
- Đảm bảo bạn đang đăng nhập với quyền ADMIN
- Kiểm tra permission `DELETE_ACTIVITY_LOG`

### Export bị lỗi?
- Kiểm tra số lượng logs (quá nhiều có thể gây timeout)
- Thử lại với date range nhỏ hơn
- Kiểm tra console để xem lỗi cụ thể

## Best Practices

1. **Regular cleanup**: Xóa logs cũ định kỳ để giữ database gọn
2. **Monitor statistics**: Kiểm tra thống kê thường xuyên để phát hiện bất thường
3. **Export backups**: Xuất logs quan trọng ra file để lưu trữ
4. **Use filters**: Luôn sử dụng filters để tìm kiếm hiệu quả hơn

