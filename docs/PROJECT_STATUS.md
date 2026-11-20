# Trạng thái bản demo công bố

Ngày 20/11/2026 · ứng viên `0.7.0-demo.3`, link công khai đang giữ demo.2.

- Thêm 54 quan sát đúng PLUS: HOME khi ẩn số cho 14 ứng dụng ở Việt/Anh; cuộn trang, phím số ẩn vẫn chọn được, bật lại số; tiêu đề/nhãn Cài đặt và BACK nhớ mục chọn.
- Bộ kiểm nguồn: 6.743/6.743 đạt, không bỏ qua; 6.689 màn LCD qua phím. Giữ từng byte bốn TTF, mọi sprite cũ và 14 core của demo.2.
- Đã kiểm trình duyệt desktop, 390×844 và 320×568; chưa nghiệm thu cảm ứng điện thoại thật. Bằng chứng và gói: [lcd-880-home-option-review.md](qa/lcd-880-home-option-review.md).
- Chốt nhóm này rồi tạm dừng theo yêu cầu; không bắt đầu nhóm mới, không tự thay bản công khai.

## Mốc nền demo.2

- Nền tính toán kế thừa beta.104; demo.2 sửa cách trình bày LCD bằng SVG, giữ dữ liệu glyph và thao tác máy.
- Bộ kiểm nguồn: 6.689 ca, gồm 6.635 màn LCD qua phím với kỳ vọng đã quan sát từ đúng fx-880BTG PLUS trên ClassPad. Chưa quy đổi thành phần trăm giống toàn máy.
- Bản đã chạy: https://fx-880btg-plus-demo.dtran1904.chatgpt.site/ . Cần tải lại tab cũ để nạp demo.2.
- [Phạm vi và giới hạn](DEMO_SCOPE.md) · [Hướng dẫn kiểm tra](TEAM_TESTING.md).
- Bằng chứng sửa nét LCD: `docs/qa/lcd-font-after.jpg` và `docs/qa/lcd-font-presentation.md`.

Đây là trạng thái rút gọn của bản chụp nguồn dành cho team. Nhật ký đầy đủ, tài liệu bàn giao và TIFF/PDF/Word gốc vẫn nằm trong hồ sơ dự án gốc. Các công cụ dựng lại ảnh/font cần hồ sơ nguồn tương ứng; chạy demo và bộ kiểm không cần những tài liệu đó.

Các mục còn chờ gồm mũ lồng sâu/con trỏ sau lỗi, chữ số sâu log/SOLVE, hệ gần suy biến, vài nhánh Phân phối, tổng/tích rất dài, chuỗi ngẫu nhiên Cùng Kết quả và QR. Cần nghiệm thu thêm trên máy vật lý và thiết bị cảm ứng thật.
