# Dự án fx-880BTG PLUS

Đọc [trạng thái bản demo](docs/PROJECT_STATUS.md) và [phạm vi](docs/DEMO_SCOPE.md) trước khi sửa luồng máy. Bản chụp nguồn này không kèm hồ sơ gốc; cần tham khảo tài liệu bàn giao đầy đủ trong hồ sơ dự án khi sửa chức năng chưa rõ. Đối chiếu đúng mẫu **fx-880BTG PLUS** trong ClassPad hoặc trên máy thật. Khi dùng ví dụ từ tài liệu, ghi rõ nguồn của kỳ vọng. Chỉ đánh dấu ca đã đối chiếu khi có kết quả quan sát của mẫu PLUS.

- `web/model.js` giữ vị trí và định danh từng phím của mẫu PLUS.
- `web/calculator.js` xử lý trạng thái, thao tác phím và menu.
- `web/lcd-pixels.js` dựng LCD điểm ảnh. `web/lcd.js` điều phối LCD và giữ màn hiển thị cho các chế độ chưa đối chiếu.
- Chạy `node --test test/*.test.js` rồi kiểm qua `node serve.js` sau thay đổi thao tác.
- Giữ ảnh TIFF gốc, PDF và Word trong hồ sơ. Tập tin chạy trên web được phục vụ từ `web/`.
