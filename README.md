# fx-880BTG PLUS — demo cho team BITEX

Phiên bản nguồn: **0.7.0-demo.19 · 28/11/2026**.

[Mở demo Netlify](https://fx880btgplus.netlify.app/) — không cần đăng nhập. Mở Tiện ích để xem mã bản, kiểm tra cập nhật, cài ứng dụng và dùng ngoại tuyến. [Hướng dẫn cài](docs/PWA.md).

Demo.19 tích hợp [cổng trao đổi dữ liệu](docs/CONG-TRAO-DOI-DU-LIEU.md) theo patch được cung cấp: xuất dữ liệu và tô sáng từng phím. Cổng mặc định tắt; chưa cấu hình website được phép đọc. Giữ nguyên chính sách chống nhúng. Kế thừa các sửa lỗi BITEX demo.14–15 và nhật ký phím/Sao chép Word demo.18.

Nhật ký dùng hình gốc của48phím CASIO. Sao chép Word cho mã như `2^3B`; dán vào Word rồi đổi sang font **CASIO ClassWiz CW01** đã cài. Dữ liệu tính toán và nhật ký xử lý trên thiết bị. Ảnh TIFF, PDF/TTF keymap gốc, Word và hồ sơ bàn giao đầy đủ được giữ ở hồ sơ dự án, không nằm trong bản chụp nguồn này.

## Chạy và kiểm tra

Cần Node.js24 và Python3 để đóng gói; không cần cài thư viện.

```sh
node serve.js
node --test test/*.test.js
python3 tools/build-preview.py
```

Mở http://127.0.0.1:8870/. Gói cục bộ tạo trong `releases/`, gồm MO-DEMO.html và thư mục web có manifest/hash. **7.265 kiểm tra đạt**, gồm7.155màn LCD đã quan sát trên đúng PLUS; 14kiểm bridge mới không phải quan sát máy thật. Số kiểm không phải tỷ lệ hoàn thành toàn bộ máy.

[Phạm vi và ca còn chờ](docs/DEMO_SCOPE.md) · [Hướng dẫn kiểm tra](docs/TEAM_TESTING.md) · [Trạng thái](docs/PROJECT_STATUS.md).

Khi báo lỗi, gửi mã bản, cài đặt, chuỗi phím, ảnh và JSON từ Nhật ký phím. Ghi rõ nguồn kỳ vọng từ máy vật lý, đúng PLUS trên ClassPad hoặc tài liệu. Hosting BITEX có adapter riêng trong `hosting/bitex/`; bản Netlify không tự nhận cấu hình GTM hay origin của bản hosting đó.
