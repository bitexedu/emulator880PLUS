# Phạm vi demo fx-880BTG PLUS — 0.7.0-demo.2

Bản demo ngày 20/11/2026, kế thừa nền tính toán beta.104. Chữ CASIO được bỏ khỏi mặt máy theo yêu cầu; tên mẫu fx-880BTG PLUS, các phím, nhãn phím và LCD được giữ theo mẫu PLUS. Bốn màu lấy từ ảnh TIFF gốc. LCD dùng bộ điểm ảnh đã đối chiếu trên ClassPad, gồm chữ tiếng Việt, số và ký hiệu; gói có sẵn toàn bộ tài nguyên.

## Cách mở

Giải nén rồi mở **MO-DEMO.html** bằng Chrome hoặc Edge. Tệp có sẵn mã tính toán, hình ảnh và font, hoạt động không cần kết nối mạng. Hướng dẫn và sáu bài mẫu nằm trong **HUONG-DAN-DEMO.txt**. Có thể bấm lên phím hoặc dùng bàn phím máy tính; bảng **Phím tắt** ngay ngoài máy có hướng dẫn.

Thư mục **web/** là bản dùng cho website. Bản chạy qua máy chủ cục bộ hoặc HTTPS có tính năng lưu ngoại tuyến và cập nhật phiên bản. Dùng `node serve.js` nếu cần chạy qua máy chủ cục bộ.

## Hiển thị LCD

Demo.2 dựng chữ,ba sắc độ điểm ảnh,chỉ báo và con trỏ trên cùng một SVG192×75. Giữ nguyên glyph và vị trí của mẫu PLUS;loại bỏ phóng canvas kiểu pixelated gây nét1/2 hoặc2/3 điểm màn hình không đều khi co giãn. Kiểm thêm5 ca bảo toàn toàn bộ điểm ảnh,con trỏ và ký hiệu chỉ báo.

## Chức năng chính

| Nhóm | Phạm vi có trong demo |
| --- | --- |
| Tính thường | MathI/LineI, phân số, căn, mũ, log, lượng giác, giải tích, lịch sử, FORMAT, biến nhớ, CALC, f/g và Verify |
| Phương trình và bất phương trình | Hệ 2–4 ẩn, đa thức/bất phương trình bậc 2–4, nghiệm thực/phức và SOLVE |
| Thống kê và phân phối | Một/hai biến, tần số, hồi quy; bảy dạng phân phối chuẩn, nhị thức và Poisson |
| Bảng giá trị và bảng tính | f/g, phạm vi, chỉnh bảng; hằng/công thức, tham chiếu, điền, sao chép/cắt và tính lại |
| Ma trận, vectơ, số phức | Nhập/sửa, phép tính, MatAns/VctAns; dạng chữ nhật/cực và các hàm phức |
| Base-N và tỉ lệ thức | Dec/Hex/Bin/Oct, phép logic, tiền tố; hai dạng tỉ lệ |
| Khám phá Toán | Bayes, xác suất độc lập/toàn phần, thống kê ghép nhóm và hình học |
| Hộp Toán học | Xúc xắc, đồng xu, Đường thẳng số và Đường tròn |
| Cài đặt | Việt/Anh, MathI/LineI, Độ/Radian/Grad, Fix/Sci/Norm, Reset |

## Mức kiểm và giới hạn

Bộ kiểm hiện có **6.689 ca đạt**, gồm **6.635 màn LCD** qua thao tác phím với kỳ vọng quan sát từ đúng fx-880BTG PLUS trên ClassPad. Số ca kiểm không phải tỷ lệ hoàn thành toàn bộ máy.

Các ca còn chờ gồm một số mũ lồng sâu và con trỏ sau lỗi, chữ số sâu của log/SOLVE, hệ gần suy biến, vài nhánh nhập Phân phối, giới hạn tổng/tích rất dài và chuỗi ngẫu nhiên Cùng Kết quả. QR chưa triển khai. Cần lượt nghiệm thu riêng trên máy tính vật lý và thiết bị cảm ứng thật. Các ca chưa khớp không được tính là đã đối chiếu đạt.

Khi góp ý, gửi mã bản trong Nhật ký phím cùng chuỗi thao tác. Bản demo không gửi dữ liệu tính toán ra máy chủ.
