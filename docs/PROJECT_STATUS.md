# Trạng thái bản nguồn cho team BITEX

28/11/2026 · **0.7.0-demo.19**.

- Bản nguồn cập nhật từ demo.2 lên demo.19, gồm các sửa lỗi BITEX, mobile/PWA, ngoại tuyến, nhật ký phím gốc và Sao chép Word.
- Cổng trao đổi dữ liệu mới theo patch chủ dự án cung cấp; chỉ đọc trạng thái và tô sáng để người dùng tự bấm. Origin mặc định trống; không bật truy cập website bên ngoài hoặc nới header chống iframe.
- Bộ kiểm: **7.265/7.265 đạt**, không bỏ qua. Trong đó7.155ca LCD đã có bằng chứng PLUS,14kiểm bridge và6kiểm adapter hosting riêng. Kiểm cổng không được tính là quan sát LCD mới.
- Kiểm cổng cục bộ: hello, xuất2³=8, xuấtMath ERROR và hướng dẫn bốn phím đạt. Chưa nghiệm thu ứng dụng bên nhận hoặc nhúng trên hosting thật. Một thông báo MutationObserver ban đầu không có nguồn/stack không tái hiện sau tải lại có thu lỗi.
- Netlify đích: https://fx880btgplus.netlify.app/ . Hồ sơ phát hành ghi ở `docs/RELEASE_DEMO19.md` sau khi hoàn tất.
- Phạm vi và giới hạn: [DEMO_SCOPE.md](DEMO_SCOPE.md). Hồ sơ gốc, TIFF/PDF/Word/keymap TTF không được mang vào kho này.
