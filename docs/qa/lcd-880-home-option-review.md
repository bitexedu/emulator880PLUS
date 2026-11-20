# HOME và số lựa chọn — demo.3

Ngày đo: 20/11/2026. Nguồn kỳ vọng: đúng fx-880BTG PLUS trên ClassPad.net, nhãn mẫu đã đọc trên giao diện; phiên đo riêng sau Initialize All. Không dùng mẫu fx-880BTG thường hoặc fx-991CW để lập kỳ vọng.

- 54 màn trong `test/fixtures/classpad-880-home-option-numbers-lcd.json`; mỗi màn đủ 192×63 điểm, nguyên chuỗi phím và chỉ báo. Kiểm toàn màn, không che vùng, không thêm ca chờ.
- HOME không số: đủ 14 mục ở Việt/Anh, cuộn hàng và trang, phím số ẩn vẫn nhận, bật lại số.
- Cài đặt: tiêu đề và nhãn Anh/Việt; nhớ mục chọn bằng số khi BACK. Ca Polynomial → BACK đối chứng trở về đầu menu Phương trình.
- Tổng kiểm: 6.743 đạt, không lỗi/không bỏ qua; 6.689 màn LCD qua thao tác phím. Tệp font, mọi sprite cũ và 14 core giống demo.2.
- Dựng lại atlas hai lần cho kết quả giống nhau. Năm sprite đã có trước được nối lại vào công cụ từ mẫu quan sát nguồn; chỉ thêm hai nhóm HOME/menu mới vào dữ liệu atlas.

Kiểm giao diện bằng `node serve.js`, cổng 8878: HOME đầu/cuối, mở nhật ký đọc demo.3, khung 390×844 và 320×568. Cả hai khung có chiều rộng/chiều cao nội dung bằng vùng nhìn, không tràn trang; đã reset kích thước trình duyệt sau kiểm. Đây là kiểm trình duyệt, chưa phải nghiệm thu cảm ứng trên điện thoại thật.

Ảnh native: `lcd-880-home-option-native-first.jpg`, `lcd-880-home-option-native-last.jpg`. Ảnh local: `lcd-880-home-option-local-first.jpg`, `lcd-880-home-option-local-last.jpg`, `lcd-880-home-option-local-390.jpg`, `lcd-880-home-option-local-320.jpg`.

Gói đã kiểm: `fx-880btg-plus-0.7.0-demo.3-7e9c0d45.zip`. SHA-256 `020d1ad4c86f724c982ee19143ed5cebda1166482d5233ebca38b32019de6b98`.

Link công khai vẫn là demo.2 trong lượt này. Chốt nhóm HOME/Cài đặt rồi tạm dừng theo yêu cầu người dùng.
